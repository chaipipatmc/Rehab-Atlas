/**
 * Lead Verify Agent
 * Validates leads, checks assessment matches, verifies commission agreements.
 * Triggered by: leads INSERT where status='new'
 */

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentTask, logAgentAction } from "./base";
import { sendAgentEmail, sendLineNotify } from "./notify";
import { analyzeWithClaude } from "./claude";
import type { LeadVerifyChecklist, CenterCommissionCheck, LeadAIAnalysis } from "@/types/agent";

const AI_RESPONSE_SCHEMA = z.object({
  legitimacy_score: z.number().min(0).max(1),
  needs_summary: z.string(),
  match_quality_assessment: z.string(),
  urgency_flag: z.boolean(),
  recommended_centers: z.array(z.string()),
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Commission Check ──

async function checkCenterCommission(centerId: string, matchScore: number): Promise<CenterCommissionCheck> {
  const admin = createAdminClient();
  const { data: center } = await admin
    .from("centers")
    .select("id, name, commission_type, commission_rate, commission_fixed_amount, agreement_status, contract_end, inquiry_email, status")
    .eq("id", centerId)
    .single();

  if (!center) {
    return {
      center_id: centerId, center_name: "Unknown", match_score: matchScore,
      commission_type: "unknown", commission_rate: null, commission_fixed_amount: null,
      agreement_status: "none", contract_end: null, has_inquiry_email: false,
      is_forwardable: false, blockers: ["Center not found"],
    };
  }

  const blockers: string[] = [];
  const isExpired = center.contract_end && new Date(center.contract_end) < new Date();

  if (center.agreement_status !== "active") blockers.push(`Agreement: ${center.agreement_status || "none"}`);
  if (isExpired) blockers.push("Contract expired");
  if (!center.inquiry_email) blockers.push("No inquiry email");
  if (center.status !== "published") blockers.push(`Center status: ${center.status}`);

  return {
    center_id: center.id,
    center_name: center.name,
    match_score: matchScore,
    commission_type: center.commission_type || "none",
    commission_rate: center.commission_rate,
    commission_fixed_amount: center.commission_fixed_amount,
    agreement_status: center.agreement_status || "none",
    contract_end: center.contract_end,
    has_inquiry_email: !!center.inquiry_email,
    is_forwardable: blockers.length === 0,
    blockers,
  };
}

// ── Build Full Checklist ──

async function buildLeadChecklist(leadId: string): Promise<{ checklist: LeadVerifyChecklist; lead: Record<string, unknown> | null }> {
  const admin = createAdminClient();
  const { data: lead } = await admin.from("leads").select("*").eq("id", leadId).single();

  if (!lead) {
    return { lead: null, checklist: {} as LeadVerifyChecklist };
  }

  // Check assessment
  let hasAssessment = false;
  let assessmentCompleted = false;
  let topMatchScore: number | null = null;
  let matchCount = 0;
  let matchedCenterIds: string[] = [];

  if (lead.assessment_id) {
    const { data: assessment } = await admin
      .from("assessments")
      .select("completed, matched_center_ids, match_scores")
      .eq("id", lead.assessment_id)
      .single();

    if (assessment) {
      hasAssessment = true;
      assessmentCompleted = !!assessment.completed;
      matchedCenterIds = (assessment.matched_center_ids as string[]) || [];
      matchCount = matchedCenterIds.length;
      const scores = (assessment.match_scores as Record<string, number>) || {};
      topMatchScore = matchedCenterIds.length > 0 ? scores[matchedCenterIds[0]] || null : null;
    }
  }

  // Also check preferred center
  if (lead.preferred_center_id && !matchedCenterIds.includes(lead.preferred_center_id)) {
    matchedCenterIds.unshift(lead.preferred_center_id);
  }

  // Check commission for top centers (max 5)
  const centersToCheck = matchedCenterIds.slice(0, 5);
  const centersWithCommission: CenterCommissionCheck[] = [];
  const scores = lead.assessment_id ? ((await admin.from("assessments").select("match_scores").eq("id", lead.assessment_id).single()).data?.match_scores as Record<string, number>) || {} : {};

  for (const cId of centersToCheck) {
    const check = await checkCenterCommission(cId, scores[cId] || 0);
    centersWithCommission.push(check);
  }

  // Preferred center name
  let preferredCenterName: string | null = null;
  if (lead.preferred_center_id) {
    const { data: pc } = await admin.from("centers").select("name").eq("id", lead.preferred_center_id).single();
    preferredCenterName = pc?.name || null;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const concern = (lead.concern as string) || "";

  const checklist: LeadVerifyChecklist = {
    has_valid_email: emailRegex.test((lead.email as string) || ""),
    has_phone: !!(lead.phone as string)?.trim(),
    has_concern: concern.length > 0,
    concern_length_adequate: concern.length >= 20,
    urgency_level: (lead.urgency as string) || "not_urgent",
    has_assessment: hasAssessment,
    assessment_completed: assessmentCompleted,
    top_match_score: topMatchScore,
    match_count: matchCount,
    preferred_center_name: preferredCenterName,
    centers_with_commission: centersWithCommission,
    any_center_has_active_agreement: centersWithCommission.some((c) => c.agreement_status === "active" && c.is_forwardable),
    ready_to_forward: centersWithCommission.some((c) => c.is_forwardable),
    blockers: centersWithCommission.every((c) => !c.is_forwardable) ? ["No center is forwardable"] : [],
  };

  return { checklist, lead: lead as Record<string, unknown> };
}

// ── AI Analysis ──

async function analyzeLead(lead: Record<string, unknown>, checklist: LeadVerifyChecklist): Promise<LeadAIAnalysis | null> {
  const centerNames = checklist.centers_with_commission.map((c) => `${c.center_name} (score: ${c.match_score}, ${c.is_forwardable ? "forwardable" : "blocked"})`).join("; ");

  return analyzeWithClaude({
    systemPrompt: `You are a lead qualification analyst for Rehab-Atlas, a rehab center referral platform.
Analyze leads for: (1) legitimacy (not spam/bot), (2) summarize client needs in 2-3 sentences,
(3) assess match quality with available centers, (4) flag urgency concerns.
Respond ONLY with valid JSON.`,
    userPrompt: `Analyze this lead:
Name: ${lead.name}
Email: ${lead.email}
Concern: ${lead.concern}
Urgency: ${lead.urgency || "not_urgent"}
Who for: ${lead.who_for || "unknown"}
Budget: ${lead.budget || "unknown"}
Has assessment: ${checklist.has_assessment}
Matched centers: ${centerNames || "None"}

Return JSON: {
  "legitimacy_score": 0.0-1.0,
  "needs_summary": "2-3 sentence summary",
  "match_quality_assessment": "assessment of match quality",
  "urgency_flag": true/false,
  "recommended_centers": ["center_id_1", ...]
}`,
    responseSchema: AI_RESPONSE_SCHEMA,
    maxTokens: 400,
  });
}

// ── Main Agent Function ──

export async function processLeadVerify(leadId: string): Promise<void> {
  const { checklist, lead } = await buildLeadChecklist(leadId);
  if (!lead) return;

  const leadName = (lead.name as string) || "Unknown";
  const urgency = (lead.urgency as string) || "not_urgent";

  // AI analysis
  const aiAnalysis = await analyzeLead(lead, checklist);

  // Recommendation
  let recommendation: "approve" | "reject" | "needs_info" = "approve";
  if (!checklist.has_valid_email) recommendation = "reject";
  if (!checklist.ready_to_forward) recommendation = "needs_info";
  if (aiAnalysis && aiAnalysis.legitimacy_score < 0.3) recommendation = "reject";
  if (!checklist.concern_length_adequate) recommendation = "needs_info";

  const confidence = aiAnalysis ? aiAnalysis.legitimacy_score : 0.5;

  // Create task
  const task = await createAgentTask({
    agent_type: "lead_verify",
    entity_type: "lead",
    entity_id: leadId,
    checklist: checklist as unknown as Record<string, unknown>,
    ai_summary: aiAnalysis
      ? aiAnalysis.needs_summary
      : `Lead from ${leadName}. ${checklist.has_assessment ? "Has assessment." : "No assessment."} ${checklist.ready_to_forward ? "Ready to forward." : "Not ready — " + checklist.blockers.join(", ")}`,
    ai_recommendation: recommendation,
    confidence,
  });

  if (!task) return;

  await logAgentAction({
    agent_type: "lead_verify",
    task_id: task.id,
    action: "analyzed",
    details: { checklist, aiAnalysis, recommendation },
  });

  // Build commission table
  const commissionRows = checklist.centers_with_commission
    .map((c) => {
      const commLabel = c.commission_type === "percentage"
        ? `${c.commission_rate}%`
        : c.commission_type === "fixed"
        ? `$${c.commission_fixed_amount}`
        : "None";
      const statusColor = c.agreement_status === "active" ? "#16a34a" : c.agreement_status === "pending" ? "#f59e0b" : "#dc2626";
      const forwardable = c.is_forwardable ? "✓" : `✗ ${c.blockers.join(", ")}`;

      return `<tr>
        <td style="padding:6px 8px;font-size:12px;">${escapeHtml(c.center_name)}</td>
        <td style="padding:6px 8px;font-size:12px;text-align:center;">${c.match_score}</td>
        <td style="padding:6px 8px;font-size:12px;">${commLabel}</td>
        <td style="padding:6px 8px;font-size:12px;color:${statusColor};">${c.agreement_status}</td>
        <td style="padding:6px 8px;font-size:12px;">${forwardable}</td>
      </tr>`;
    })
    .join("");

  const urgencyColor = urgency === "urgent" ? "#dc2626" : urgency === "soon" ? "#f59e0b" : "#6b7d82";

  const bodyHtml = `
    <h2 style="font-size:18px;color:#2d3436;margin:0 0 4px;">${escapeHtml(leadName)}</h2>
    <p style="font-size:12px;color:#6b7d82;margin:0 0 4px;">${escapeHtml((lead.email as string) || "")} · ${(lead.phone as string) || "No phone"}</p>
    <p style="font-size:12px;margin:0 0 16px;"><span style="color:${urgencyColor};font-weight:600;">${urgency.toUpperCase()}</span></p>

    ${aiAnalysis ? `<div style="background:#f4f6f7;border-radius:8px;padding:16px;margin:12px 0;">
      <p style="font-size:14px;margin:0;color:#2d3436;">${escapeHtml(aiAnalysis.needs_summary)}</p>
      ${aiAnalysis.legitimacy_score < 0.5 ? `<p style="font-size:12px;color:#dc2626;margin:8px 0 0;">⚠️ Low legitimacy score: ${(aiAnalysis.legitimacy_score * 100).toFixed(0)}%</p>` : ""}
    </div>` : ""}

    <p style="font-size:11px;text-transform:uppercase;color:#6b7d82;letter-spacing:1px;margin:16px 0 8px;">Commission Verification</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="background:#f4f6f7;">
        <th style="text-align:left;padding:6px 8px;">Center</th>
        <th style="text-align:center;padding:6px 8px;">Score</th>
        <th style="text-align:left;padding:6px 8px;">Commission</th>
        <th style="text-align:left;padding:6px 8px;">Agreement</th>
        <th style="text-align:left;padding:6px 8px;">Forwardable</th>
      </tr></thead>
      <tbody>${commissionRows || "<tr><td colspan='5' style='padding:12px;text-align:center;color:#6b7d82;'>No matched centers</td></tr>"}</tbody>
    </table>
  `;

  // Build actions — one "Forward to X" button per forwardable center
  const actions: Array<{ label: string; token: string; decision: string; center_id?: string; color?: string }> = [];

  checklist.centers_with_commission
    .filter((c) => c.is_forwardable)
    .slice(0, 3)
    .forEach((c) => {
      actions.push({
        label: `Forward to ${c.center_name}`,
        token: task.action_token!,
        decision: "approved",
        center_id: c.center_id,
      });
    });

  actions.push({ label: "Need More Info", token: task.action_token!, decision: "needs_info", color: "#f59e0b" });
  actions.push({ label: "Reject", token: task.action_token!, decision: "rejected", color: "#dc2626" });

  await sendAgentEmail({
    subject: `[Lead Agent] ${leadName} — ${urgency.toUpperCase()} — ${recommendation.toUpperCase()}`,
    agentLabel: "Lead Verify Agent",
    bodyHtml,
    actions,
  });

  // LINE for urgent leads or low legitimacy
  if (urgency === "urgent") {
    await sendLineNotify(`🚨 Urgent lead from ${leadName} — ${aiAnalysis?.needs_summary || "Review needed"}`);
  } else if (aiAnalysis && aiAnalysis.legitimacy_score < 0.5) {
    await sendLineNotify(`⚠️ Suspicious lead: ${leadName} (legitimacy: ${(aiAnalysis.legitimacy_score * 100).toFixed(0)}%)`);
  }
}
