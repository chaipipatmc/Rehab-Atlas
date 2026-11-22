/**
 * Owner Action Endpoint
 * GET  → Shows a branded confirmation page with "Confirm" button
 * POST → Executes the action (approve/reject/needs_info)
 */

import { NextResponse } from "next/server";
import { validateActionToken, findTaskByShortCode, updateTaskStatus, logAgentAction, getAppUrl } from "@/lib/agents/base";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendLeadForwardEmail } from "@/lib/email/send";
import { sendEditRequestStatusEmail } from "@/lib/agents/notify";
import { sendApprovedOutreach } from "@/lib/agents/outreach/research";
import { sendApprovedAgreement } from "@/lib/agents/outreach/agreement";
import { sendApprovedFollowUp } from "@/lib/agents/outreach/followup";
import { sendApprovedActivationEmail } from "@/lib/agents/outreach/activation";
import { sendOutreachEmail, OutreachBlockedError } from "@/lib/agents/outreach/policy";
import { sendApprovedFollowUpEmail, abandonFollowUp } from "@/lib/agents/follow-up";
import { validateOrigin } from "@/lib/csrf";
import { pingIndexNow } from "@/lib/seo/indexnow";
import { applyEditRequestChanges } from "@/lib/edit-requests";
import { parseAgentActionRequest } from "@/lib/agents/action-request";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True only for a logged-in user whose profile role is "admin" (same check as other admin routes). */
async function isAdminSession(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    return profile?.role === "admin";
  } catch {
    return false;
  }
}

/** Email-link tokens (short code or HMAC) are valid only until token_expires; missing expiry = expired (fail closed). */
function isEmailTokenExpired(task: Record<string, unknown>): boolean {
  const expires = task.token_expires as string | null | undefined;
  if (!expires) return true;
  const t = new Date(expires).getTime();
  return isNaN(t) || t < Date.now();
}

/**
 * Resolve a task from an email-link token: 12-char short code or HMAC token.
 * UUIDs are never accepted here (dashboard path only, admin session required).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findTaskByEmailToken(token: string, admin: ReturnType<typeof createAdminClient>): Promise<any> {
  if (UUID_RE.test(token)) return null;
  if (!token.includes(".")) {
    return findTaskByShortCode(token);
  }
  const parsed = validateActionToken(token);
  if (!parsed) return null;
  const { data } = await admin.from("agent_tasks").select("*").eq("id", parsed.taskId).single();
  return data;
}

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

  // GET only renders a confirmation page; it never executes. Email links
  // must carry an unexpired short code / HMAC token. A logged-in admin
  // (dashboard) is not subject to the 24h link expiry.
  const admin = createAdminClient();
  const isAdmin = await isAdminSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const task: any = await findTaskByEmailToken(token, admin);

  if (!task || (!isAdmin && isEmailTokenExpired(task))) {
    return brandedPage("Link Expired", "This action link has expired (24h) or is invalid. Please use the admin dashboard instead.", 410);
  }

  if (task.owner_decision) {
    return brandedPage("Already Decided", `This task was already <strong>${escapeHtml(String(task.owner_decision))}</strong>. No further action needed.`, 200);
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

  // Body: JSON from the dashboard (postAgentAction) or a form POST from the
  // email confirmation page — contract in @/lib/agents/action-request.
  const { token, decision, centerId, note, isJson } = await parseAgentActionRequest(request);

  if (!token || !decision || !["approved", "rejected", "needs_info"].includes(decision)) {
    return brandedPage("Invalid Request", "Missing or invalid parameters.", 400);
  }

  // Two paths:
  //  - Dashboard (JSON body or task UUID): requires a logged-in admin session.
  //    The 24h email-link expiry does not apply.
  //  - Email link (form POST from the confirmation page): accepts only an
  //    unexpired short code or HMAC token — never a raw task UUID.
  //    A logged-in admin using the short code from the dashboard is also
  //    exempt from the 24h expiry.
  const isUUID = UUID_RE.test(token);
  const isAdmin = await isAdminSession();

  if ((isJson || isUUID) && !isAdmin) {
    if (isJson) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return brandedPage("Unauthorized", "Please sign in to the admin dashboard to take this action.", 401);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let task: any = null;
  const admin = createAdminClient();

  if (isUUID) {
    const { data } = await admin.from("agent_tasks").select("*").eq("id", token).single();
    task = data;
  } else {
    task = await findTaskByEmailToken(token, admin);
  }

  if (!task) {
    if (isJson) {
      return NextResponse.json({ error: "Task not found or expired" }, { status: 410 });
    }
    return brandedPage("Link Expired", "This action link has expired or is invalid.", 410);
  }

  // 24h expiry applies to email links only (not to an admin session)
  if (!isAdmin && isEmailTokenExpired(task)) {
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
    if (isJson) {
      return NextResponse.json({ success: true, decision, label });
    }
    return brandedPage(`${icon} ${label}`, `The ${task.entity_type.replace(/_/g, " ")} has been ${label.toLowerCase()} successfully.`, 200);
  } catch (err) {
    if (err instanceof OutreachBlockedError) {
      // Policy block (daily cap, opt-out, exclusion): nothing was sent and the
      // task stays undecided so it can be approved again later.
      console.warn("Agent action blocked:", err.reason);
      if (isJson) {
        return NextResponse.json({ error: `Not sent: ${err.reason}` }, { status: 409 });
      }
      return brandedPage("Not Sent", `Email was not sent: ${escapeHtml(err.reason)}. The task is still awaiting approval — try again later.`, 409);
    }
    // Any other failure (e.g. Gmail send error): nothing is marked as sent,
    // the task stays awaiting approval and the error is recorded on it.
    console.error("Agent action failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    try {
      await admin
        .from("agent_tasks")
        .update({ error_message: message.slice(0, 1000), updated_at: new Date().toISOString() })
        .eq("id", task.id);
      await logAgentAction({
        agent_type: task.agent_type,
        task_id: task.id,
        action: `owner_${decision}_failed`,
        details: { error: message.slice(0, 500), center_id: centerId },
      });
    } catch (recordErr) {
      console.error("Failed to record action error:", recordErr);
    }
    if (isJson) {
      return NextResponse.json({ error: "Action failed — nothing was sent; the task is still awaiting approval" }, { status: 502 });
    }
    return brandedPage("Action Failed", "Nothing was sent. The task is still awaiting approval — please try again from the admin dashboard.", 502);
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
            .select("center_id, changes, submitted_by")
            .eq("id", entityId)
            .single();

          if (editReq) {
            const applied = await applyEditRequestChanges(
              admin,
              editReq.center_id as string,
              editReq.changes as Record<string, unknown>
            );
            if (applied.error) {
              // Do NOT mark approved / email the partner if nothing was applied.
              console.error("Edit request apply failed:", entityId, applied.error);
              throw new Error(applied.error);
            }
            await admin.from("center_edit_requests").update({
              status: "approved",
              reviewed_at: new Date().toISOString(),
            }).eq("id", entityId);

            await notifyEditRequestPartner(admin, editReq.center_id as string, editReq.submitted_by as string, "approved", null);
          }
        } else {
          await admin.from("centers").update({ status: "published" }).eq("id", entityId);
        }
        break;
      }

      case "content_admin": {
        const { data: page } = await admin.from("pages").update({
          status: "published",
          published_at: new Date().toISOString(),
        }).eq("id", entityId).select("slug, page_type").maybeSingle();
        if (page?.slug && page.page_type === "blog") {
          await pingIndexNow(["/blog", "/sitemap.xml", `/blog/${page.slug}`]);
        }
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

      case "data_verifier": {
        // Admin approved the verification: delete suspicious photos and
        // mark the center as verified.
        await admin
          .from("center_photos")
          .delete()
          .eq("center_id", entityId)
          .eq("verification_status", "suspicious");

        await admin
          .from("centers")
          .update({
            data_verification_status: "verified",
            last_verified: new Date().toISOString(),
          })
          .eq("id", entityId);
        break;
      }
    }
  } else if (decision === "rejected") {
    switch (agentType) {
      case "center_admin": {
        if (entityType === "center_edit_request") {
          const { data: editReq } = await admin
            .from("center_edit_requests")
            .select("center_id, submitted_by")
            .eq("id", entityId)
            .single();

          await admin.from("center_edit_requests").update({
            status: "rejected",
            reviewed_at: new Date().toISOString(),
          }).eq("id", entityId);

          if (editReq) {
            await notifyEditRequestPartner(admin, editReq.center_id as string, editReq.submitted_by as string, "rejected", null);
          }
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
        // Send the approved outreach email. Any failure (policy block or
        // Gmail error) propagates: the pipeline is NOT marked outreach_sent,
        // no outbound email is logged, and the task stays awaiting approval.
        const checklist = task.checklist as Record<string, unknown> | null;
        if (!checklist?.to_email || !checklist?.body_text) {
          throw new Error("Outreach task has no email draft (to_email/body_text missing)");
        }
        await sendApprovedOutreach(entityId, {
          to_email: checklist.to_email as string,
          subject: (checklist.subject as string) || "Partnership with Rehab-Atlas",
          body_text: checklist.body_text as string,
        });
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

      case "outreach_response": {
        // Send the (possibly edited) reply via Gmail
        const replyChecklist = task.checklist as Record<string, unknown> | null;
        const replyText = replyChecklist?.suggested_reply as string | null;
        const replyFrom = replyChecklist?.reply_from as string | null;
        const centerName = replyChecklist?.center_name as string | null;

        if (replyText && replyFrom) {
          // Extract email from "Name <email>" format
          const emailMatch = replyFrom.match(/<([^>]+)>/);
          const toEmail = emailMatch ? emailMatch[1] : replyFrom;

          // Find the original thread to reply in-thread
          const { data: pipeline } = await admin
            .from("outreach_pipeline")
            .select("outreach_thread_id")
            .eq("id", entityId)
            .single();

          // Failures propagate (task stays awaiting approval, nothing logged as sent)
          const sent = await sendOutreachEmail({
            to: toEmail,
            subject: `Re: ${centerName || "Partnership"} - Rehab-Atlas`,
            bodyText: replyText,
            threadId: (pipeline?.outreach_thread_id as string) || undefined,
            pipelineId: entityId,
          });
          if (!sent) {
            throw new Error("Gmail send unavailable (no credentials/access token) — reply not sent");
          }

          // Log the reply in outreach_emails
          await admin.from("outreach_emails").insert({
            pipeline_id: entityId,
            direction: "outbound",
            from_email: "info@rehab-atlas.com",
            to_email: toEmail,
            subject: `Re: ${centerName || "Partnership"} - Rehab-Atlas`,
            body_text: replyText,
            email_type: "reply",
          });

          // Update pipeline stage
          await admin
            .from("outreach_pipeline")
            .update({ stage: "responded", last_activity_at: new Date().toISOString() })
            .eq("id", entityId);
        }
        break;
      }

      case "outreach_followup": {
        // Send the approved (possibly edited) follow-up draft
        const fuChecklist = task.checklist as Record<string, unknown> | null;
        if (fuChecklist?.to_email && fuChecklist?.body_text) {
          await sendApprovedFollowUp(entityId, {
            to_email: fuChecklist.to_email as string,
            subject: (fuChecklist.subject as string) || "Following up - Rehab-Atlas",
            body_text: fuChecklist.body_text as string,
            attempt_number: (fuChecklist.attempt_number as number) || undefined,
          });
        }
        break;
      }

      case "outreach_activation": {
        // Send the approved welcome email
        const actChecklist = task.checklist as Record<string, unknown> | null;
        if (actChecklist?.to_email && actChecklist?.body_text) {
          await sendApprovedActivationEmail(entityId, {
            to_email: actChecklist.to_email as string,
            subject: (actChecklist.subject as string) || "Welcome to Rehab-Atlas",
            body_text: actChecklist.body_text as string,
          });
        }
        break;
      }

      case "follow_up": {
        // Admin follow-up reminder (partner/author) — send only after approval
        if (entityType === "agent_follow_up") {
          const fChecklist = task.checklist as Record<string, unknown> | null;
          if (fChecklist?.to_email && fChecklist?.body_text) {
            await sendApprovedFollowUpEmail(entityId, {
              to_email: fChecklist.to_email as string,
              subject: (fChecklist.subject as string) || "Reminder from Rehab-Atlas",
              body_text: fChecklist.body_text as string,
              attempt_number: (fChecklist.attempt_number as number) || 1,
            });
          }
        }
        break;
      }
    }
  }

  if (decision === "rejected") {
    // Only mark as declined when the initial outreach email is rejected
    // Rejecting agreements or other tasks should NOT decline the whole pipeline
    if (agentType === "outreach_research") {
      await admin
        .from("outreach_pipeline")
        .update({ stage: "declined" })
        .eq("id", entityId);
    }
    // Rejecting a follow-up draft stops the follow-up sequence for that center
    if (agentType === "outreach_followup") {
      await admin
        .from("outreach_pipeline")
        .update({ stage: "stalled", next_follow_up_at: null })
        .eq("id", entityId);
    }
    // Rejecting an admin reminder abandons that reminder sequence
    if (agentType === "follow_up" && entityType === "agent_follow_up") {
      await abandonFollowUp(entityId);
    }
  }

  if (decision !== "approved" && decision !== "rejected" && decision === "needs_info") {
    if (agentType === "lead_verify") {
      await admin.from("leads").update({ status: "awaiting_info" }).eq("id", entityId);
    }
  }
}

async function notifyEditRequestPartner(
  admin: ReturnType<typeof createAdminClient>,
  centerId: string,
  submittedBy: string,
  decision: "approved" | "rejected",
  reviewNote: string | null,
) {
  try {
    const [{ data: partner }, { data: center }] = await Promise.all([
      admin.from("profiles").select("email, full_name").eq("id", submittedBy).single(),
      admin.from("centers").select("name, slug").eq("id", centerId).single(),
    ]);

    if (partner?.email && center?.name && center?.slug) {
      await sendEditRequestStatusEmail({
        to: partner.email as string,
        partnerName: (partner.full_name as string | null) || null,
        centerName: center.name as string,
        centerSlug: center.slug as string,
        decision,
        reviewNote,
      });
    }
  } catch (err) {
    console.error("Edit request partner notification failed:", err);
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
