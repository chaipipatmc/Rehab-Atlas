/**
 * Center Admin Agent
 * Verifies center profile completeness and content quality.
 * Triggered by: centers INSERT/UPDATE, center_edit_requests INSERT
 */

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentTask, logAgentAction } from "./base";
import { sendAgentEmail, sendLineNotify } from "./notify";
import { analyzeWithClaude } from "./claude";
import type { CenterChecklist, CenterAIAnalysis } from "@/types/agent";

const AI_RESPONSE_SCHEMA = z.object({
  quality_score: z.number().min(1).max(10),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Completeness Checklist ──

async function buildCenterChecklist(centerId: string): Promise<CenterChecklist> {
  const admin = createAdminClient();

  const { data: center } = await admin.from("centers").select("*").eq("id", centerId).single();
  if (!center) {
    return {
      has_name: false, has_description: false, has_short_description: false,
      has_location: false, has_contact: false, has_inquiry_email: false,
      has_treatment_focus: false, has_services: false, has_pricing: false,
      has_photos: false, has_primary_photo: false, photo_count: 0,
      has_setting_type: false, completeness_score: 0, missing_fields: ["Center not found"],
    };
  }

  const { count: photoCount } = await admin
    .from("center_photos")
    .select("*", { count: "exact", head: true })
    .eq("center_id", centerId);

  const { data: primaryPhoto } = await admin
    .from("center_photos")
    .select("id")
    .eq("center_id", centerId)
    .eq("is_primary", true)
    .limit(1)
    .single();

  const checks: CenterChecklist = {
    has_name: !!center.name,
    has_description: typeof center.description === "string" && center.description.length >= 100,
    has_short_description: !!center.short_description,
    has_location: !!center.country && !!center.city,
    has_contact: !!(center.phone || center.email || center.inquiry_email),
    has_inquiry_email: !!center.inquiry_email,
    has_treatment_focus: Array.isArray(center.treatment_focus) && center.treatment_focus.length > 0,
    has_services: Array.isArray(center.services) && center.services.length > 0,
    has_pricing: !!(center.price_min || center.pricing_text),
    has_photos: (photoCount || 0) >= 1,
    has_primary_photo: !!primaryPhoto,
    photo_count: photoCount || 0,
    has_setting_type: !!center.setting_type,
    completeness_score: 0,
    missing_fields: [],
  };

  // Calculate score
  const fields = [
    { check: checks.has_name, label: "Center name" },
    { check: checks.has_description, label: "Description (100+ chars)" },
    { check: checks.has_short_description, label: "Short description" },
    { check: checks.has_location, label: "Location (city + country)" },
    { check: checks.has_contact, label: "Contact info" },
    { check: checks.has_inquiry_email, label: "Inquiry email (for lead forwarding)" },
    { check: checks.has_treatment_focus, label: "Treatment focus" },
    { check: checks.has_services, label: "Services offered" },
    { check: checks.has_pricing, label: "Pricing information" },
    { check: checks.has_photos, label: "At least 1 photo" },
    { check: checks.has_setting_type, label: "Setting type" },
  ];

  checks.missing_fields = fields.filter((f) => !f.check).map((f) => f.label);
  checks.completeness_score = Math.round((fields.filter((f) => f.check).length / fields.length) * 100);

  return checks;
}

// ── AI Quality Review ──

async function analyzeCenter(centerId: string): Promise<CenterAIAnalysis | null> {
  const admin = createAdminClient();
  const { data: center } = await admin
    .from("centers")
    .select("name, description, short_description, treatment_focus, services, conditions")
    .eq("id", centerId)
    .single();

  if (!center) return null;

  return analyzeWithClaude({
    systemPrompt: `You are a quality reviewer for Rehab-Atlas, a rehabilitation center directory.
Review center profiles for: (1) description quality, (2) medical/marketing red flags (exaggerated claims, false promises),
(3) consistency between treatment_focus and services, (4) grammar and professional tone.
Respond ONLY with valid JSON.`,
    userPrompt: `Review this center profile:
Name: ${center.name}
Description: ${center.description || "(empty)"}
Short Description: ${center.short_description || "(empty)"}
Treatment Focus: ${JSON.stringify(center.treatment_focus || [])}
Services: ${JSON.stringify(center.services || [])}
Conditions: ${JSON.stringify(center.conditions || [])}

Return JSON: { "quality_score": 1-10, "issues": ["..."], "suggestions": ["..."] }`,
    responseSchema: AI_RESPONSE_SCHEMA,
  });
}

// ── Main Agent Function ──

export async function processCenterAdmin(params: {
  entityType: "center" | "center_edit_request";
  entityId: string;
}): Promise<void> {
  const { entityType, entityId } = params;
  const admin = createAdminClient();

  // Determine center ID
  let centerId = entityId;
  let centerName = "Unknown Center";
  let isEditRequest = false;

  if (entityType === "center_edit_request") {
    isEditRequest = true;
    const { data: editReq } = await admin
      .from("center_edit_requests")
      .select("center_id")
      .eq("id", entityId)
      .single();
    if (!editReq) return;
    centerId = editReq.center_id;
  }

  const { data: center } = await admin.from("centers").select("name").eq("id", centerId).single();
  centerName = center?.name || "Unknown Center";

  // Run checklist
  const checklist = await buildCenterChecklist(centerId);

  // Run AI analysis
  const aiAnalysis = await analyzeCenter(centerId);
  const qualityScore = aiAnalysis?.quality_score || 0;

  // Determine recommendation
  let recommendation: "approve" | "reject" | "needs_info" = "approve";
  if (checklist.completeness_score < 50) recommendation = "needs_info";
  if (aiAnalysis && aiAnalysis.issues.length > 2) recommendation = "needs_info";
  if (aiAnalysis && qualityScore < 4) recommendation = "reject";

  const confidence = aiAnalysis ? Math.min(0.95, (qualityScore / 10 + checklist.completeness_score / 100) / 2) : 0.5;

  // Create task
  const task = await createAgentTask({
    agent_type: "center_admin",
    entity_type: entityType,
    entity_id: entityId,
    checklist: checklist as unknown as Record<string, unknown>,
    ai_summary: aiAnalysis
      ? `Quality: ${qualityScore}/10. Issues: ${aiAnalysis.issues.length > 0 ? aiAnalysis.issues.join("; ") : "None"}. Suggestions: ${aiAnalysis.suggestions.length > 0 ? aiAnalysis.suggestions.join("; ") : "None"}.`
      : `AI analysis unavailable. Completeness: ${checklist.completeness_score}%.`,
    ai_recommendation: recommendation,
    confidence,
  });

  if (!task) return; // Duplicate task

  await logAgentAction({
    agent_type: "center_admin",
    task_id: task.id,
    action: "analyzed",
    details: { checklist, aiAnalysis, recommendation },
  });

  // Build email
  const completenessBar = `${"█".repeat(Math.round(checklist.completeness_score / 10))}${"░".repeat(10 - Math.round(checklist.completeness_score / 10))}`;
  const missingHtml = checklist.missing_fields.length > 0
    ? `<ul style="margin:8px 0;">${checklist.missing_fields.map((f) => `<li style="color:#dc2626;font-size:13px;">✗ ${escapeHtml(f)}</li>`).join("")}</ul>`
    : `<p style="color:#16a34a;font-size:13px;">✓ All fields complete</p>`;

  const aiHtml = aiAnalysis
    ? `<div style="background:#f4f6f7;border-radius:8px;padding:16px;margin:12px 0;">
        <p style="font-size:12px;color:#6b7d82;margin:0 0 8px;">AI Quality Score: <strong>${qualityScore}/10</strong></p>
        ${aiAnalysis.issues.length > 0 ? `<p style="font-size:12px;color:#dc2626;margin:4px 0;">Issues: ${escapeHtml(aiAnalysis.issues.join(", "))}</p>` : ""}
        ${aiAnalysis.suggestions.length > 0 ? `<p style="font-size:12px;color:#45636b;margin:4px 0;">Suggestions: ${escapeHtml(aiAnalysis.suggestions.join(", "))}</p>` : ""}
      </div>`
    : "";

  const bodyHtml = `
    <h2 style="font-size:18px;color:#2d3436;margin:0 0 4px;">${escapeHtml(centerName)}</h2>
    <p style="font-size:12px;color:#6b7d82;margin:0 0 16px;">${isEditRequest ? "Edit Request Review" : "New/Updated Center Profile"}</p>
    <div style="background:#f4f6f7;border-radius:8px;padding:16px;margin:12px 0;">
      <p style="font-size:13px;margin:0;"><strong>Completeness:</strong> ${completenessBar} ${checklist.completeness_score}%</p>
      <p style="font-size:13px;margin:4px 0;"><strong>Photos:</strong> ${checklist.photo_count}</p>
    </div>
    ${missingHtml}
    ${aiHtml}
  `;

  await sendAgentEmail({
    subject: `[Center Agent] ${centerName} — ${recommendation.toUpperCase()}`,
    agentLabel: "Center Admin Agent",
    bodyHtml,
    actions: [
      { label: "✓ Approve", token: task.action_token!, decision: "approved" },
      { label: "✗ Reject", token: task.action_token!, decision: "rejected", color: "#dc2626" },
    ],
  });

  // LINE for urgent cases
  if (checklist.completeness_score < 50 || (aiAnalysis && aiAnalysis.issues.length > 2)) {
    await sendLineNotify(`⚠️ Center "${centerName}" needs attention — completeness ${checklist.completeness_score}%, ${aiAnalysis?.issues.length || 0} issues flagged`);
  }
}
