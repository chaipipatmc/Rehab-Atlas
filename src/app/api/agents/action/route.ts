/**
 * Owner Action Endpoint
 * GET  → Shows a branded confirmation page with "Confirm" button
 * POST → Executes the action (approve/reject/needs_info)
 */

import { NextResponse } from "next/server";
import { validateActionToken, findTaskByShortCode, updateTaskStatus, logAgentAction, getAppUrl } from "@/lib/agents/base";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLeadForwardEmail } from "@/lib/email/send";
import { sendApprovedOutreach } from "@/lib/agents/outreach/research";
import { sendApprovedAgreement } from "@/lib/agents/outreach/agreement";
import { validateOrigin } from "@/lib/csrf";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// GET: Show confirmation page (user clicks email link → sees branded page → clicks Confirm)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t") || url.searchParams.get("token");
  const decision = url.searchParams.get("d") || url.searchParams.get("decision");
  const centerId = url.searchParams.get("c") || url.searchParams.get("center_id");

  // Dashboard redirect (from daily digest)
  if (decision === "dashboard") {
    return NextResponse.redirect(`${getAppUrl()}/admin/agents`);
  }

  if (!token || !decision || !["approved", "rejected", "needs_info"].includes(decision)) {
    return brandedPage("Invalid Request", "Missing or invalid parameters.", 400);
  }

  // Look up task by short code first, fall back to HMAC token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let task: any = null;
  const admin = createAdminClient();

  if (!token.includes(".")) {
    task = await findTaskByShortCode(token);
  } else {
    const parsed = validateActionToken(token);
    if (parsed) {
      const { data } = await admin.from("agent_tasks").select("*").eq("id", parsed.taskId).single();
      task = data;
    }
  }

  if (!task) {
    return brandedPage("Link Expired", "This action link has expired (24h) or is invalid. Please use the admin dashboard instead.", 410);
  }

  // Check token expiry for short codes
  if (task.token_expires && new Date(task.token_expires as string) < new Date()) {
    return brandedPage("Link Expired", "This action link has expired (24h). Please use the admin dashboard instead.", 410);
  }

  if (!task) {
    return brandedPage("Task Not Found", "This task no longer exists.", 404);
  }

  if (task.owner_decision) {
    return brandedPage("Already Decided", `This task was already <strong>${task.owner_decision}</strong>. No further action needed.`, 200);
  }

  // Show confirmation page with a POST form
  const decisionLabel = decision === "approved" ? "Approve" : decision === "rejected" ? "Reject" : "Request More Info";
  const decisionColor = decision === "approved" ? "#45636b" : decision === "rejected" ? "#dc2626" : "#f59e0b";
  const agentLabel = task.agent_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

  // Escape user-supplied values before injecting into HTML
  const safeToken = escapeHtml(token);
  const safeDecision = escapeHtml(decision);
  const safeCenterId = centerId ? escapeHtml(centerId) : null;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Confirm Action — Rehab-Atlas</title>
<style>
  body{font-family:'Inter',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f6f7;color:#2d3436;}
  .card{background:white;border-radius:16px;padding:48px;max-width:420px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
  .brand{font-family:'Noto Serif',Georgia,serif;font-size:22px;color:#45636b;margin:0 0 4px;}
  .agent{font-size:11px;color:#9aa5a9;text-transform:uppercase;letter-spacing:2px;margin:0 0 24px;}
  h1{font-size:20px;color:#2d3436;margin:0 0 8px;}
  p{font-size:14px;color:#5a6a70;line-height:1.6;margin:0 0 24px;}
  .btn{display:inline-block;padding:12px 32px;color:white;text-decoration:none;border-radius:24px;font-size:14px;font-weight:600;border:none;cursor:pointer;margin:4px;}
  .btn-secondary{background:#e5e7eb;color:#5a6a70;}
</style></head>
<body>
<div class="card">
  <p class="brand">Rehab-Atlas</p>
  <p class="agent">${escapeHtml(agentLabel)} Agent</p>
  <h1>Confirm: ${escapeHtml(decisionLabel)}</h1>
  <p>Are you sure you want to <strong>${escapeHtml(decisionLabel.toLowerCase())}</strong> this ${escapeHtml(task.entity_type.replace(/_/g, " "))}?</p>
  <form method="POST" action="/api/agents/action">
    <input type="hidden" name="token" value="${safeToken}" />
    <input type="hidden" name="decision" value="${safeDecision}" />
    ${safeCenterId ? `<input type="hidden" name="center_id" value="${safeCenterId}" />` : ""}
    <button type="submit" class="btn" style="background:${decisionColor};">Confirm ${escapeHtml(decisionLabel)}</button>
    <a href="/admin" class="btn btn-secondary">Cancel</a>
  </form>
</div>
</body></html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// POST: Execute the action
export async function POST(request: Request) {
  // CSRF check
  const originError = validateOrigin(request);
  if (originError) return originError;

  // Support both FormData (from email confirmation page) and JSON (from dashboard)
  let token: string | null = null;
  let decision: string | null = null;
  let centerId: string | null = null;
  let note = "";

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await request.json();
    token = json.task_id || json.token;
    decision = json.decision === "approve" ? "approved" : json.decision === "reject" ? "rejected" : json.decision;
    centerId = json.center_id || null;
    note = json.note || json.reason || "";
  } else {
    const formData = await request.formData();
    token = formData.get("token") as string;
    decision = formData.get("decision") as string;
    centerId = (formData.get("center_id") as string) || null;
    note = (formData.get("note") as string) || "";
  }

  if (!token || !decision || !["approved", "rejected", "needs_info"].includes(decision)) {
    return brandedPage("Invalid Request", "Missing or invalid parameters.", 400);
  }

  // Look up task by UUID, short code, or HMAC token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let task: any = null;
  const admin = createAdminClient();

  // Check if token is a UUID (from dashboard JSON requests)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token || "");

  if (isUUID) {
    const { data } = await admin.from("agent_tasks").select("*").eq("id", token).single();
    task = data;
  } else if (token && !token.includes(".")) {
    task = await findTaskByShortCode(token);
  } else if (token) {
    const parsed = validateActionToken(token);
    if (parsed) {
      const { data } = await admin.from("agent_tasks").select("*").eq("id", parsed.taskId).single();
      task = data;
    }
  }

  if (!task) {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ error: "Task not found or expired" }, { status: 410 });
    }
    return brandedPage("Link Expired", "This action link has expired or is invalid.", 410);
  }

  // Check token expiry
  if (task.token_expires && new Date(task.token_expires as string) < new Date()) {
    return brandedPage("Link Expired", "This action link has expired (24h). Please use the admin dashboard instead.", 410);
  }

  if (task.owner_decision) {
    return brandedPage("Already Decided", `This task was already <strong>${escapeHtml(String(task.owner_decision))}</strong>. No further action needed.`, 200);
  }

  try {
    await executePostAction(task, decision, centerId, admin);

    await updateTaskStatus(task.id, decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "pending", {
      owner_decision: decision,
      owner_note: note,
      decided_at: new Date().toISOString(),
    });

    await logAgentAction({
      agent_type: task.agent_type,
      task_id: task.id,
      action: `owner_${decision}`,
      details: { center_id: centerId, note },
    });

    const label = decision === "approved" ? "Approved ✓" : decision === "rejected" ? "Rejected" : "Marked for Follow-up";
    const icon = decision === "approved" ? "✅" : decision === "rejected" ? "❌" : "📝";
    if (contentType.includes("application/json")) {
      return NextResponse.json({ success: true, decision, label });
    }
    return brandedPage(`${icon} ${label}`, `The ${task.entity_type.replace(/_/g, " ")} has been ${label.toLowerCase()} successfully.`, 200);
  } catch (err) {
    console.error("Agent action failed:", err);
    if (contentType.includes("application/json")) {
      return NextResponse.json({ error: "Action failed" }, { status: 500 });
    }
    return brandedPage("Action Failed", "Something went wrong. Please try again from the admin dashboard.", 500);
  }
}

async function executePostAction(
  task: Record<string, unknown>,
  decision: string,
  centerId: string | null,
  admin: ReturnType<typeof createAdminClient>
) {
  const agentType = task.agent_type as string;
  const entityType = task.entity_type as string;
  const entityId = task.entity_id as string;

  if (decision === "approved") {
    switch (agentType) {
      case "center_admin": {
        if (entityType === "center_edit_request") {
          const { data: editReq } = await admin
            .from("center_edit_requests")
            .select("center_id, changes")
            .eq("id", entityId)
            .single();

          if (editReq) {
            await admin.from("centers").update(editReq.changes as Record<string, unknown>).eq("id", editReq.center_id);
            await admin.from("center_edit_requests").update({
              status: "approved",
              reviewed_at: new Date().toISOString(),
            }).eq("id", entityId);
          }
        } else {
          await admin.from("centers").update({ status: "published" }).eq("id", entityId);
        }
        break;
      }

      case "content_admin": {
        await admin.from("pages").update({
          status: "published",
          published_at: new Date().toISOString(),
        }).eq("id", entityId);
        break;
      }

      case "lead_verify": {
        if (!centerId) break;

        const { data: lead } = await admin.from("leads").select("*").eq("id", entityId).single();
        const { data: center } = await admin
          .from("centers")
          .select("name, inquiry_email")
          .eq("id", centerId)
          .single();

        if (lead && center?.inquiry_email) {
          await admin.from("lead_forwards").insert({
            lead_id: entityId,
            center_id: centerId,
            forwarded_by: null,
            method: "email",
          });

          await admin.from("leads").update({ status: "forwarded" }).eq("id", entityId);

          await sendLeadForwardEmail({
            centerName: center.name,
            centerEmail: center.inquiry_email,
            leadName: lead.name,
            leadEmail: lead.email,
            leadPhone: lead.phone || "",
            concern: lead.concern,
            message: lead.message || "",
          });
        }
        break;
      }
    }
  } else if (decision === "rejected") {
    switch (agentType) {
      case "center_admin": {
        if (entityType === "center_edit_request") {
          await admin.from("center_edit_requests").update({
            status: "rejected",
            reviewed_at: new Date().toISOString(),
          }).eq("id", entityId);
        }
        break;
      }
      case "lead_verify": {
        await admin.from("leads").update({ status: "closed" }).eq("id", entityId);
        break;
      }
    }
  }

  // --- Outreach agent approvals ---
  if (decision === "approved") {
    switch (agentType) {
      case "outreach_research": {
        // Send approved outreach email (graceful if Gmail fails)
        const checklist = task.checklist as Record<string, unknown> | null;
        if (checklist) {
          try {
            await sendApprovedOutreach(entityId, {
              to_email: checklist.to_email as string,
              subject: checklist.subject as string,
              body_text: checklist.body_text as string,
            });
          } catch (emailErr) {
            console.error("Gmail send failed (email logged for manual send):", emailErr);
            // Still update pipeline stage so it doesn't block
            const adminDb = createAdminClient();
            await adminDb.from("outreach_pipeline").update({ stage: "outreach_sent", outreach_sent_at: new Date().toISOString() }).eq("id", entityId);
            await adminDb.from("outreach_emails").insert({
              pipeline_id: entityId,
              direction: "outbound",
              from_email: "info@rehab-atlas.com",
              to_email: checklist.to_email as string,
              subject: checklist.subject as string,
              body_text: checklist.body_text as string,
              email_type: "initial_outreach",
            });
          }
        }
        break;
      }

      case "outreach_agreement": {
        // Send approved agreement via PandaDoc
        const agreementChecklist = task.checklist as Record<string, unknown> | null;
        if (agreementChecklist?.agreement_details) {
          await sendApprovedAgreement(
            entityId,
            agreementChecklist.agreement_details as Parameters<typeof sendApprovedAgreement>[1]
          );
        }
        break;
      }
    }
  }

  if (decision === "rejected") {
    // Mark outreach pipeline entries as declined when rejected
    if (agentType.startsWith("outreach_")) {
      await admin
        .from("outreach_pipeline")
        .update({ stage: "declined" })
        .eq("id", entityId);
    }
  }

  if (decision !== "approved" && decision !== "rejected" && decision === "needs_info") {
    if (agentType === "lead_verify") {
      await admin.from("leads").update({ status: "awaiting_info" }).eq("id", entityId);
    }
  }
}

function brandedPage(title: string, message: string, status: number) {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Rehab-Atlas</title>
<style>
  body{font-family:'Inter',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f6f7;color:#2d3436;}
  .card{background:white;border-radius:16px;padding:48px;max-width:420px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
  .brand{font-family:'Noto Serif',Georgia,serif;font-size:22px;color:#45636b;margin:0 0 24px;}
  h1{font-size:20px;color:#2d3436;margin:0 0 12px;}
  p{font-size:14px;color:#5a6a70;line-height:1.6;margin:0 0 24px;}
  a.btn{display:inline-block;padding:10px 28px;background:#45636b;color:white;text-decoration:none;border-radius:24px;font-size:14px;font-weight:600;}
</style></head>
<body>
<div class="card">
  <p class="brand">Rehab-Atlas</p>
  <h1>${title}</h1>
  <p>${message}</p>
  <a href="/admin" class="btn">Go to Dashboard</a>
</div>
</body></html>`;

  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
