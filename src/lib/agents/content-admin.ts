/**
 * Content Admin Agent
 * Reviews blog/page content for quality, relevance, and medical accuracy.
 * Triggered by: pages INSERT/UPDATE where status='draft'
 */

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentTask, logAgentAction } from "./base";
import { sendAgentEmail, sendLineNotify } from "./notify";
import { analyzeWithClaude } from "./claude";
import type { ContentChecklist, ContentAIAnalysis } from "@/types/agent";

const AI_RESPONSE_SCHEMA = z.object({
  relevance_score: z.number().min(1).max(10),
  medical_flags: z.array(z.string()),
  seo_score: z.number().min(1).max(10),
  promotion_level: z.enum(["appropriate", "excessive", "none"]),
  summary: z.string(),
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Content Checklist ──

async function buildContentChecklist(pageId: string): Promise<{ checklist: ContentChecklist; page: Record<string, unknown> | null }> {
  const admin = createAdminClient();
  const { data: page } = await admin.from("pages").select("*").eq("id", pageId).single();

  if (!page) {
    return {
      page: null,
      checklist: {
        has_title: false, has_content: false, content_word_count: 0,
        has_meta_description: false, has_featured_image: false,
        has_valid_slug: false, author_type: "unknown", author_center_exists: false,
      },
    };
  }

  const content = (page.content as string) || "";
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const hasFeaturedImage = /!\[featured\]/i.test(content) || /!\[.*\]\(https?:\/\//.test(content);

  // Check slug uniqueness
  const { count: slugCount } = await admin
    .from("pages")
    .select("*", { count: "exact", head: true })
    .eq("slug", page.slug)
    .neq("id", pageId);

  // Check author center exists if partner
  let authorCenterExists = true;
  if (page.author_type === "partner" && page.author_center_id) {
    const { data: center } = await admin
      .from("centers")
      .select("id")
      .eq("id", page.author_center_id)
      .single();
    authorCenterExists = !!center;
  }

  return {
    page: page as Record<string, unknown>,
    checklist: {
      has_title: !!page.title,
      has_content: content.length > 0,
      content_word_count: wordCount,
      has_meta_description: !!(page.meta_description as string)?.trim(),
      has_featured_image: hasFeaturedImage,
      has_valid_slug: !!page.slug && (slugCount || 0) === 0,
      author_type: (page.author_type as string) || "rehabatlas",
      author_center_exists: authorCenterExists,
    },
  };
}

// ── AI Content Review ──

async function analyzeContent(page: Record<string, unknown>): Promise<ContentAIAnalysis | null> {
  const content = (page.content as string) || "";
  const title = (page.title as string) || "";
  const authorType = (page.author_type as string) || "rehabatlas";

  return analyzeWithClaude({
    systemPrompt: `You are a content reviewer for Rehab-Atlas, a rehabilitation center directory.
Review articles for: (1) relevance to rehab/recovery/mental health, (2) medical accuracy — flag dangerous claims,
(3) SEO quality (title, headings, keyword usage), (4) if partner-written: check for excessive self-promotion vs educational value.
Respond ONLY with valid JSON.`,
    userPrompt: `Review this article:
Title: ${title}
Author type: ${authorType}
Content (first 2000 chars): ${content.slice(0, 2000)}

Return JSON: {
  "relevance_score": 1-10,
  "medical_flags": ["list of medical accuracy concerns"],
  "seo_score": 1-10,
  "promotion_level": "appropriate" | "excessive" | "none",
  "summary": "2-sentence summary of the article"
}`,
    responseSchema: AI_RESPONSE_SCHEMA,
    maxTokens: 400,
    agentType: "content_admin",
    operation: "content_review",
  });
}

// ── Main Agent Function ──

export async function processContentAdmin(pageId: string): Promise<void> {
  const { checklist, page } = await buildContentChecklist(pageId);
  if (!page) return;

  const title = (page.title as string) || "Untitled";
  const authorType = (page.author_type as string) || "rehabatlas";
  const authorName = (page.author_name as string) || (authorType === "partner" ? "Center Partner" : "Rehab-Atlas");

  // AI analysis
  const aiAnalysis = await analyzeContent(page);
  const hasMedicalFlags = aiAnalysis && aiAnalysis.medical_flags.length > 0;

  // Recommendation
  let recommendation: "approve" | "reject" | "needs_info" = "approve";
  if (checklist.content_word_count < 100) recommendation = "needs_info";
  if (hasMedicalFlags) recommendation = "needs_info";
  if (aiAnalysis && aiAnalysis.relevance_score < 4) recommendation = "reject";
  if (aiAnalysis && aiAnalysis.promotion_level === "excessive") recommendation = "reject";

  const confidence = aiAnalysis
    ? Math.min(0.95, (aiAnalysis.relevance_score + aiAnalysis.seo_score) / 20)
    : 0.5;

  // Create task
  const task = await createAgentTask({
    agent_type: "content_admin",
    entity_type: "page",
    entity_id: pageId,
    checklist: checklist as unknown as Record<string, unknown>,
    ai_summary: aiAnalysis
      ? `${aiAnalysis.summary} Relevance: ${aiAnalysis.relevance_score}/10, SEO: ${aiAnalysis.seo_score}/10.${hasMedicalFlags ? ` ⚠️ Medical flags: ${aiAnalysis.medical_flags.join("; ")}` : ""}`
      : `Word count: ${checklist.content_word_count}. AI analysis unavailable.`,
    ai_recommendation: recommendation,
    confidence,
  });

  if (!task) return;

  await logAgentAction({
    agent_type: "content_admin",
    task_id: task.id,
    action: "analyzed",
    details: { checklist, aiAnalysis, recommendation },
  });

  // Build email
  const medicalHtml = hasMedicalFlags
    ? `<div style="background:#fef2f2;border-radius:8px;padding:12px;margin:12px 0;border-left:4px solid #dc2626;">
        <p style="font-size:12px;color:#dc2626;font-weight:600;margin:0 0 4px;">⚠️ Medical Accuracy Concerns</p>
        <ul style="margin:4px 0;padding-left:16px;">${aiAnalysis!.medical_flags.map((f) => `<li style="font-size:12px;color:#991b1b;">${escapeHtml(f)}</li>`).join("")}</ul>
      </div>`
    : "";

  const bodyHtml = `
    <h2 style="font-size:18px;color:#2d3436;margin:0 0 4px;">"${escapeHtml(title)}"</h2>
    <p style="font-size:12px;color:#6b7d82;margin:0 0 16px;">by ${escapeHtml(authorName)} · ${checklist.content_word_count} words · ${checklist.author_type}</p>
    ${aiAnalysis ? `<p style="font-size:14px;color:#2d3436;margin:0 0 12px;">${escapeHtml(aiAnalysis.summary)}</p>` : ""}
    <div style="background:#f4f6f7;border-radius:8px;padding:16px;margin:12px 0;">
      <table style="width:100%;font-size:13px;">
        <tr><td style="color:#6b7d82;">Relevance</td><td style="font-weight:600;text-align:right;">${aiAnalysis?.relevance_score || "—"}/10</td></tr>
        <tr><td style="color:#6b7d82;">SEO Quality</td><td style="font-weight:600;text-align:right;">${aiAnalysis?.seo_score || "—"}/10</td></tr>
        <tr><td style="color:#6b7d82;">Featured Image</td><td style="text-align:right;">${checklist.has_featured_image ? "✓" : "✗ Missing"}</td></tr>
        <tr><td style="color:#6b7d82;">Meta Description</td><td style="text-align:right;">${checklist.has_meta_description ? "✓" : "✗ Missing"}</td></tr>
        ${authorType === "partner" ? `<tr><td style="color:#6b7d82;">Promotion Level</td><td style="text-align:right;">${aiAnalysis?.promotion_level || "—"}</td></tr>` : ""}
      </table>
    </div>
    ${medicalHtml}
  `;

  await sendAgentEmail({
    subject: `[Content Agent] "${title}" by ${authorName} — ${recommendation.toUpperCase()}`,
    agentLabel: "Content Admin Agent",
    bodyHtml,
    actions: [
      { label: "✓ Publish", token: task.action_token!, decision: "approved" },
      { label: "✗ Reject", token: task.action_token!, decision: "rejected", color: "#dc2626" },
    ],
  });

  // LINE for medical flags
  if (hasMedicalFlags) {
    await sendLineNotify(`⚠️ Medical flag in "${title}" — ${aiAnalysis!.medical_flags[0]}`);
  }
}
