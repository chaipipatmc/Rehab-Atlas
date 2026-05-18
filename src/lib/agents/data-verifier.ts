/**
 * Data Verifier Agent
 *
 * Nightly audits published centers by:
 *   1. Scraping the center's official website (homepage + key subpages).
 *   2. Asking Claude to compare DB field values (name, address, phone, etc.)
 *      against the scraped page text — flag mismatches.
 *   3. For each stored photo: hash-match against images found on the
 *      official site AND check plausibility via Claude Vision. Photos
 *      flagged as `suspicious` are surfaced to the admin for one-click
 *      removal — never auto-deleted.
 *
 * Triggered by: daily cron + manual admin trigger. See
 * src/app/api/agents/data-verifier/route.ts.
 */

import { createHash } from "crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentTask, logAgentAction } from "./base";
import { sendAgentEmail, sendLineNotify } from "./notify";
import { analyzeWithClaude, analyzeImageWithClaude } from "./claude";
import { isAgentEnabled, getAgentSettingNumber } from "./config";
import { fetchPage, extractLinks, extractImageUrls, DEFAULT_SUBPAGE_PATTERNS } from "./scrape";
import type {
  CenterFactCheck,
  PhotoVerification,
  DataVerifierResult,
  CenterVerificationStatus,
} from "@/types/agent";

// ── Defaults (overridable via site_settings) ──
const DEFAULT_BATCH_SIZE = 5;
const DEFAULT_RECHECK_DAYS = 30;
const DEFAULT_VISION_VERIFIED = 7;
const DEFAULT_VISION_SUSPICIOUS = 4;
const DEFAULT_MAX_IMAGE_BYTES = 2_000_000;
const MAX_PHOTOS_PER_CENTER_PER_RUN = 8;

// ── Zod schemas for Claude responses ──

const factCheckSchema = z.object({
  field_checks: z.array(z.object({
    field: z.string(),
    db_value: z.string(),
    site_value: z.string(),
    match: z.enum(["yes", "partial", "no", "not_found"]),
    confidence: z.number().min(0).max(1),
    notes: z.string().optional(),
  })),
  overall_summary: z.string(),
});

const visionSchema = z.object({
  score: z.number().min(1).max(10),
  is_plausible_facility_photo: z.boolean(),
  appears_stock_or_unrelated: z.boolean(),
  reason: z.string(),
});

// ── Helpers ──

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function sameHost(a: string, b: string): boolean {
  try {
    const ha = new URL(a).hostname.replace(/^www\./, "").toLowerCase();
    const hb = new URL(b).hostname.replace(/^www\./, "").toLowerCase();
    return ha === hb;
  } catch {
    return false;
  }
}

async function fetchImageBytes(url: string, maxBytes: number): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const contentLength = Number(res.headers.get("content-length") || 0);
    if (contentLength > maxBytes) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) return null;
    return buf;
  } catch {
    return null;
  }
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

// ── Website Scraping ──

interface SiteSnapshot {
  text: string;
  imageUrls: string[];
  imageHashes: Map<string, string>; // url → sha256
}

async function snapshotWebsite(websiteUrl: string, maxImageBytes: number): Promise<SiteSnapshot> {
  const baseUrl = websiteUrl.replace(/\/$/, "");
  const sections: string[] = [];
  const imageUrls = new Set<string>();

  const home = await fetchPage(baseUrl);
  if (home.text) sections.push(`[HOMEPAGE]\n${home.text.slice(0, 3000)}`);
  for (const u of extractImageUrls(home.html, baseUrl)) imageUrls.add(u);

  // Discover priority subpages
  const allLinks = extractLinks(home.html, baseUrl);
  const targetPages: string[] = [];
  for (const link of allLinks) {
    if (targetPages.length >= 5) break;
    const normalized = link.startsWith("/") ? `${baseUrl}${link}` : link;
    if (DEFAULT_SUBPAGE_PATTERNS.some((p) => p.test(link)) && !targetPages.includes(normalized)) {
      targetPages.push(normalized);
    }
  }

  const subResults = await Promise.all(
    targetPages.map(async (url) => {
      const page = await fetchPage(url);
      return { url, page };
    })
  );

  for (const { url, page } of subResults) {
    if (page.text) {
      const name = url.replace(baseUrl, "").replace(/^\//, "") || "page";
      sections.push(`[${name.toUpperCase()}]\n${page.text.slice(0, 2000)}`);
    }
    for (const u of extractImageUrls(page.html, url)) imageUrls.add(u);
  }

  // Hash a bounded number of site images (most websites have 10-30; we'll
  // hash up to 40 to keep run time + bandwidth bounded).
  const imageList = Array.from(imageUrls).slice(0, 40);
  const imageHashes = new Map<string, string>();
  await Promise.all(
    imageList.map(async (u) => {
      const buf = await fetchImageBytes(u, maxImageBytes);
      if (buf) imageHashes.set(u, sha256(buf));
    })
  );

  return {
    text: sections.join("\n\n").slice(0, 10_000),
    imageUrls: imageList,
    imageHashes,
  };
}

// ── Fact pass ──

async function factCheckCenter(
  center: Record<string, unknown>,
  websiteText: string
): Promise<CenterFactCheck[]> {
  const fields = {
    name: String(center.name || ""),
    address: String(center.address || ""),
    city: String(center.city || ""),
    state_province: String(center.state_province || ""),
    country: String(center.country || ""),
    phone: String(center.phone || ""),
    email: String(center.email || ""),
    services: Array.isArray(center.services) ? (center.services as string[]).join(", ") : "",
    treatment_focus: Array.isArray(center.treatment_focus) ? (center.treatment_focus as string[]).join(", ") : "",
    conditions: Array.isArray(center.conditions) ? (center.conditions as string[]).join(", ") : "",
  };

  const result = await analyzeWithClaude({
    systemPrompt: `You are a fact-checker for Rehab-Atlas, a rehab center directory. You are given (a) what we have in our database for a center, and (b) text scraped from the center's official website. For each DB field, decide whether the website corroborates it. Be conservative — if the website does not mention the field, return match="not_found" rather than guessing. Return valid JSON only.`,
    userPrompt: `DATABASE RECORD:
${Object.entries(fields).map(([k, v]) => `- ${k}: ${v || "(empty)"}`).join("\n")}

WEBSITE CONTENT (scraped from multiple pages):
${websiteText || "(no content fetched)"}

For each field above, decide if the website confirms the database value.

Return JSON:
{
  "field_checks": [
    {
      "field": "name|address|city|state_province|country|phone|email|services|treatment_focus|conditions",
      "db_value": "...",
      "site_value": "what the website actually says, or empty if not found",
      "match": "yes" | "partial" | "no" | "not_found",
      "confidence": 0.0-1.0,
      "notes": "optional brief explanation"
    }
  ],
  "overall_summary": "1-2 sentence summary of data quality vs website"
}`,
    responseSchema: factCheckSchema,
    maxTokens: 1500,
    agentType: "data_verifier",
    operation: "fact_check",
  });

  return result?.field_checks ?? [];
}

// ── Photo pass ──

async function verifyPhoto(params: {
  photo: { id: string; url: string };
  site: SiteSnapshot;
  centerName: string;
  centerCity: string;
  centerCountry: string;
  visionVerifiedThreshold: number;
  visionSuspiciousThreshold: number;
  maxImageBytes: number;
}): Promise<PhotoVerification> {
  const { photo, site, centerName, centerCity, centerCountry } = params;

  // 1. Site-match by SHA-256
  let siteMatch = false;
  let matchedSourceUrl: string | null = null;

  const buf = await fetchImageBytes(photo.url, params.maxImageBytes);
  if (buf) {
    const hash = sha256(buf);
    for (const [siteUrl, siteHash] of site.imageHashes) {
      if (siteHash === hash) {
        siteMatch = true;
        matchedSourceUrl = siteUrl;
        break;
      }
    }
  }

  // 2. Cheap URL-host pre-check (the photo is hosted on the official domain)
  if (!siteMatch && site.imageUrls[0]) {
    for (const siteUrl of site.imageUrls) {
      if (sameHost(photo.url, siteUrl)) {
        siteMatch = true;
        matchedSourceUrl = siteUrl;
        break;
      }
    }
  }

  // 3. Claude Vision plausibility check
  const vision = await analyzeImageWithClaude({
    imageUrl: photo.url,
    systemPrompt: `You judge whether photos plausibly depict a specific rehab/wellness facility. Be skeptical of: generic stock photos of smiling people, abstract wellness imagery, Google Street View captures, unrelated buildings, photos that look like they came from a free stock site (Unsplash/Pexels). Reward: interior/exterior shots of distinctive buildings, staff photos with name tags, before/after grounds shots, anything specific to the named center. Return valid JSON only.`,
    userPrompt: `Does this image plausibly show a real photo of "${centerName}" — a rehab center in ${centerCity || "unknown city"}, ${centerCountry || "unknown country"}?

Score 1-10:
- 1-3 = clearly stock / generic / unrelated
- 4-6 = could be the facility but no distinguishing features
- 7-10 = clearly a real, specific facility photo (signage, distinctive architecture, named staff, etc.)

Return JSON: { "score": 1-10, "is_plausible_facility_photo": bool, "appears_stock_or_unrelated": bool, "reason": "one short sentence" }`,
    responseSchema: visionSchema,
    maxTokens: 250,
    agentType: "data_verifier",
    operation: "photo_vision",
  });

  const visionScore = vision?.score ?? null;
  const visionReason = vision?.reason ?? null;

  // 4. Combine
  let status: PhotoVerification["status"] = "unverified";
  if (siteMatch || (visionScore !== null && visionScore >= params.visionVerifiedThreshold)) {
    status = "verified";
  } else if (!siteMatch && visionScore !== null && visionScore <= params.visionSuspiciousThreshold) {
    status = "suspicious";
  }

  const notesParts: string[] = [];
  if (siteMatch) notesParts.push(`Hash/host match on official site${matchedSourceUrl ? `: ${matchedSourceUrl}` : ""}`);
  if (visionScore !== null) notesParts.push(`Vision ${visionScore}/10: ${visionReason || ""}`);
  if (!siteMatch && visionScore === null) notesParts.push("Vision unavailable, no site match — left unverified");

  return {
    photo_id: photo.id,
    url: photo.url,
    status,
    site_match: siteMatch,
    vision_score: visionScore,
    vision_reason: visionReason,
    matched_source_url: matchedSourceUrl,
    notes: notesParts.join(" · "),
  };
}

// ── Main per-center processor ──

async function processCenter(centerId: string, knobs: {
  visionVerifiedThreshold: number;
  visionSuspiciousThreshold: number;
  maxImageBytes: number;
}): Promise<DataVerifierResult | null> {
  const admin = createAdminClient();

  const { data: center } = await admin
    .from("centers")
    .select("id, name, slug, website_url, address, city, state_province, country, phone, email, services, treatment_focus, conditions")
    .eq("id", centerId)
    .single();

  if (!center) return null;

  const { data: photos } = await admin
    .from("center_photos")
    .select("id, url")
    .eq("center_id", centerId)
    .order("sort_order", { ascending: true })
    .limit(MAX_PHOTOS_PER_CENTER_PER_RUN);

  // No website? Flag and stop — no Claude calls.
  if (!center.website_url) {
    const status: CenterVerificationStatus = "no_website";
    await admin
      .from("centers")
      .update({
        data_verification_status: status,
        data_verification_issues: { reason: "no_website_url" },
        last_verified: new Date().toISOString(),
      })
      .eq("id", centerId);

    return {
      center_id: centerId,
      center_name: String(center.name),
      website_url: null,
      center_status: status,
      field_checks: [],
      photo_checks: [],
      mismatch_count: 0,
      suspicious_photo_count: 0,
    };
  }

  // 1. Snapshot the website
  const site = await snapshotWebsite(center.website_url as string, knobs.maxImageBytes);

  // 2. Fact pass
  const fieldChecks = await factCheckCenter(center as Record<string, unknown>, site.text);
  const mismatchCount = fieldChecks.filter((f) => f.match === "no").length;

  // 3. Photo pass
  const photoChecks: PhotoVerification[] = [];
  for (const photo of (photos as Array<{ id: string; url: string }>) || []) {
    const result = await verifyPhoto({
      photo,
      site,
      centerName: String(center.name),
      centerCity: String(center.city || ""),
      centerCountry: String(center.country || ""),
      visionVerifiedThreshold: knobs.visionVerifiedThreshold,
      visionSuspiciousThreshold: knobs.visionSuspiciousThreshold,
      maxImageBytes: knobs.maxImageBytes,
    });
    photoChecks.push(result);

    await admin
      .from("center_photos")
      .update({
        verification_status: result.status,
        source_url: result.matched_source_url,
        image_sha256: null, // we don't persist the hash itself — it changes per-Storage-URL
        last_verified_at: new Date().toISOString(),
        verification_notes: result.notes,
      })
      .eq("id", photo.id);
  }

  const suspiciousPhotoCount = photoChecks.filter((p) => p.status === "suspicious").length;

  // 4. Aggregate center status
  let centerStatus: CenterVerificationStatus = "verified";
  if (mismatchCount > 0 || suspiciousPhotoCount > 0) centerStatus = "issues_found";
  if (fieldChecks.length === 0) centerStatus = "unverified";

  await admin
    .from("centers")
    .update({
      data_verification_status: centerStatus,
      data_verification_issues: {
        field_checks: fieldChecks,
        photo_summary: {
          total: photoChecks.length,
          verified: photoChecks.filter((p) => p.status === "verified").length,
          suspicious: suspiciousPhotoCount,
          unverified: photoChecks.filter((p) => p.status === "unverified").length,
        },
      },
      last_verified: new Date().toISOString(),
    })
    .eq("id", centerId);

  return {
    center_id: centerId,
    center_name: String(center.name),
    website_url: center.website_url as string,
    center_status: centerStatus,
    field_checks: fieldChecks,
    photo_checks: photoChecks,
    mismatch_count: mismatchCount,
    suspicious_photo_count: suspiciousPhotoCount,
  };
}

// ── Email builder ──

function buildVerificationEmail(result: DataVerifierResult): string {
  const fieldRows = result.field_checks
    .map((f) => {
      const color =
        f.match === "no" ? "#dc2626" :
        f.match === "partial" ? "#d97706" :
        f.match === "not_found" ? "#6b7d82" :
        "#16a34a";
      const symbol = f.match === "yes" ? "✓" : f.match === "no" ? "✗" : f.match === "partial" ? "≈" : "?";
      return `<tr>
        <td style="padding:6px 10px;font-size:12px;color:${color};font-weight:600;">${symbol} ${escapeHtml(f.field)}</td>
        <td style="padding:6px 10px;font-size:12px;color:#2d3436;">${escapeHtml(f.db_value).slice(0, 80) || "(empty)"}</td>
        <td style="padding:6px 10px;font-size:12px;color:#5a6a70;">${escapeHtml(f.site_value).slice(0, 80) || "(not on site)"}</td>
      </tr>`;
    })
    .join("");

  const photoCells = result.photo_checks
    .map((p) => {
      const bg =
        p.status === "verified" ? "#16a34a" :
        p.status === "suspicious" ? "#dc2626" :
        "#9aa5a9";
      return `<div style="display:inline-block;margin:4px;text-align:center;width:140px;vertical-align:top;">
        <img src="${escapeHtml(p.url)}" alt="" style="width:140px;height:100px;object-fit:cover;border-radius:8px;border:2px solid ${bg};" />
        <div style="font-size:10px;color:${bg};font-weight:600;text-transform:uppercase;margin-top:4px;">${p.status}${p.vision_score !== null ? ` · ${p.vision_score}/10` : ""}</div>
        <div style="font-size:10px;color:#9aa5a9;margin-top:2px;">${escapeHtml(p.vision_reason || "").slice(0, 50)}</div>
      </div>`;
    })
    .join("");

  const websiteLink = result.website_url
    ? `<a href="${escapeHtml(result.website_url)}" style="color:#45636b;font-size:12px;">${escapeHtml(result.website_url)}</a>`
    : `<span style="color:#dc2626;font-size:12px;">No website on file</span>`;

  return `
    <h2 style="font-size:18px;color:#2d3436;margin:0 0 4px;">${escapeHtml(result.center_name)}</h2>
    <p style="font-size:12px;color:#6b7d82;margin:0 0 4px;">${websiteLink}</p>
    <p style="font-size:12px;color:#2d3436;margin:0 0 16px;">
      <strong>${result.mismatch_count}</strong> field mismatch${result.mismatch_count === 1 ? "" : "es"} ·
      <strong style="color:${result.suspicious_photo_count > 0 ? "#dc2626" : "#16a34a"};">${result.suspicious_photo_count}</strong> suspicious photo${result.suspicious_photo_count === 1 ? "" : "s"}
    </p>

    ${result.field_checks.length > 0 ? `
      <h3 style="font-size:13px;color:#45636b;margin:16px 0 6px;">Field cross-check</h3>
      <table style="width:100%;border-collapse:collapse;background:#f4f6f7;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#e5e9ea;">
            <th style="padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#6b7d82;">Field</th>
            <th style="padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#6b7d82;">Database</th>
            <th style="padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#6b7d82;">Official Site</th>
          </tr>
        </thead>
        <tbody>${fieldRows}</tbody>
      </table>
    ` : ""}

    ${result.photo_checks.length > 0 ? `
      <h3 style="font-size:13px;color:#45636b;margin:16px 0 6px;">Photo verification</h3>
      <div style="margin:8px 0;">${photoCells}</div>
    ` : ""}
  `;
}

// ── Public API ──

export async function pickCentersToVerify(limit: number, recheckDays: number): Promise<string[]> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - recheckDays * 24 * 60 * 60 * 1000).toISOString();

  // Centers with never-verified first, then oldest verified
  const { data } = await admin
    .from("centers")
    .select("id, last_verified")
    .eq("status", "published")
    .or(`last_verified.is.null,last_verified.lt.${cutoff}`)
    .order("last_verified", { ascending: true, nullsFirst: true })
    .limit(limit);

  return (data || []).map((c) => c.id as string);
}

export async function runDataVerifier(options?: { centerIds?: string[]; force?: boolean }): Promise<{
  enabled: boolean;
  processed: number;
  flagged: number;
  results: DataVerifierResult[];
}> {
  const enabled = await isAgentEnabled("data_verifier");
  if (!enabled && !options?.force) return { enabled: false, processed: 0, flagged: 0, results: [] };

  const batchSize = await getAgentSettingNumber("data_verifier", "batch_size", DEFAULT_BATCH_SIZE);
  const recheckDays = await getAgentSettingNumber("data_verifier", "recheck_days", DEFAULT_RECHECK_DAYS);
  const visionVerifiedThreshold = await getAgentSettingNumber("data_verifier", "vision_threshold_verified", DEFAULT_VISION_VERIFIED);
  const visionSuspiciousThreshold = await getAgentSettingNumber("data_verifier", "vision_threshold_suspicious", DEFAULT_VISION_SUSPICIOUS);
  const maxImageBytes = await getAgentSettingNumber("data_verifier", "max_image_bytes", DEFAULT_MAX_IMAGE_BYTES);

  const centerIds = options?.centerIds?.length
    ? options.centerIds
    : await pickCentersToVerify(batchSize, recheckDays);

  const results: DataVerifierResult[] = [];
  let flagged = 0;

  for (const centerId of centerIds) {
    try {
      const result = await processCenter(centerId, {
        visionVerifiedThreshold,
        visionSuspiciousThreshold,
        maxImageBytes,
      });
      if (!result) continue;
      results.push(result);

      const hasIssues =
        result.center_status === "issues_found" ||
        result.center_status === "no_website" ||
        result.suspicious_photo_count > 0 ||
        result.mismatch_count > 0;

      if (hasIssues) {
        flagged++;

        // Create task + email admin
        const task = await createAgentTask({
          agent_type: "data_verifier",
          entity_type: "center",
          entity_id: centerId,
          checklist: {
            center_id: centerId,
            center_name: result.center_name,
            website_url: result.website_url,
            mismatch_count: result.mismatch_count,
            suspicious_photo_count: result.suspicious_photo_count,
            field_checks: result.field_checks,
            photo_checks: result.photo_checks,
          } as unknown as Record<string, unknown>,
          ai_summary: `${result.mismatch_count} field mismatch(es), ${result.suspicious_photo_count} suspicious photo(s) — center status: ${result.center_status}`,
          ai_recommendation: result.center_status === "no_website" ? "needs_info" : "approve",
          confidence: result.field_checks.length > 0 ? 0.8 : 0.5,
        });

        if (task) {
          const bodyHtml = buildVerificationEmail(result);
          await sendAgentEmail({
            subject: `[Data Verifier] ${result.center_name} — ${result.mismatch_count} mismatch(es), ${result.suspicious_photo_count} suspicious photo(s)`,
            agentLabel: "Data Verifier Agent",
            bodyHtml,
            actions: [
              { label: "✓ Apply suggestions", token: task.action_token!, decision: "approved" },
              { label: "✗ Ignore", token: task.action_token!, decision: "rejected", color: "#9aa5a9" },
            ],
          });

          if (result.suspicious_photo_count >= 2 || result.mismatch_count >= 3) {
            await sendLineNotify(`⚠️ "${result.center_name}" needs review — ${result.mismatch_count} field mismatch(es), ${result.suspicious_photo_count} suspicious photo(s)`);
          }
        }
      }

      await logAgentAction({
        agent_type: "data_verifier",
        task_id: undefined,
        action: "verified",
        details: {
          center_id: centerId,
          center_status: result.center_status,
          mismatch_count: result.mismatch_count,
          suspicious_photo_count: result.suspicious_photo_count,
        },
      });
    } catch (err) {
      console.error(`Data Verifier failed for center ${centerId}:`, err);
      await logAgentAction({
        agent_type: "data_verifier",
        action: "error",
        details: { center_id: centerId, error: String(err) },
      });
    }
  }

  return { enabled: true, processed: results.length, flagged, results };
}
