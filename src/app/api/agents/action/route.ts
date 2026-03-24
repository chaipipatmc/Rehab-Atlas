/**
 * Owner Action Endpoint
 * Handles approve/reject clicks from agent notification emails.
 * GET /api/agents/action?token={hmac}&decision=approved&center_id={optional}
 */

import { NextResponse } from "next/server";
import { validateActionToken, updateTaskStatus, logAgentAction, getAppUrl } from "@/lib/agents/base";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLeadForwardEmail } from "@/lib/email/send";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const decision = url.searchParams.get("decision");
  const centerId = url.searchParams.get("center_id");
  const note = url.searchParams.get("note") || "";

  // Dashboard redirect (from daily digest)
  if (decision === "dashboard") {
    return NextResponse.redirect(`${getAppUrl()}/admin/agents`);
  }

  if (!token || !decision || !["approved", "rejected", "needs_info"].includes(decision)) {
    return htmlResponse("Invalid Request", "Missing or invalid parameters.", 400);
  }

  // Validate token
  const parsed = validateActionToken(token);
  if (!parsed) {
    return htmlResponse("Link Expired", "This action link has expired. Please use the admin dashboard instead.", 410);
  }

  const admin = createAdminClient();

  // Get the task
  const { data: task, error } = await admin
    .from("agent_tasks")
    .select("*")
    .eq("id", parsed.taskId)
    .single();

  if (error || !task) {
    return htmlResponse("Task Not Found", "This task no longer exists.", 404);
  }

  if (task.owner_decision) {
    return htmlResponse("Already Decided", `This task was already ${task.owner_decision} on ${new Date(task.decided_at).toLocaleDateString()}.`, 409);
  }

  // Execute post-action based on agent type + decision
  try {
    await executePostAction(task, decision, centerId, admin);

    // Update task
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

    const label = decision === "approved" ? "Approved" : decision === "rejected" ? "Rejected" : "Marked for Follow-up";
    return htmlResponse("Action Completed", `Task has been ${label.toLowerCase()} successfully.`, 200);
  } catch (err) {
    console.error("Agent action failed:", err);
    return htmlResponse("Action Failed", "Something went wrong. Please try again from the dashboard.", 500);
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
          // Apply edit request changes
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
          // Publish center
          await admin.from("centers").update({ status: "published" }).eq("id", entityId);
        }
        break;
      }

      case "content_admin": {
        // Publish page/blog
        await admin.from("pages").update({
          status: "published",
          published_at: new Date().toISOString(),
        }).eq("id", entityId);
        break;
      }

      case "lead_verify": {
        if (!centerId) break;

        // Forward lead to selected center
        const { data: lead } = await admin.from("leads").select("*").eq("id", entityId).single();
        const { data: center } = await admin
          .from("centers")
          .select("name, inquiry_email")
          .eq("id", centerId)
          .single();

        if (lead && center?.inquiry_email) {
          // Create audit record
          await admin.from("lead_forwards").insert({
            lead_id: entityId,
            center_id: centerId,
            forwarded_by: null, // agent-forwarded
            method: "email",
          });

          // Update lead status
          await admin.from("leads").update({ status: "forwarded" }).eq("id", entityId);

          // Send email to center
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
  } else if (decision === "needs_info") {
    if (agentType === "lead_verify") {
      await admin.from("leads").update({ status: "awaiting_info" }).eq("id", entityId);
    }
  }
}

function htmlResponse(title: string, message: string, status: number) {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Rehab-Atlas Agent</title>
<style>body{font-family:'Inter',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f6f7;color:#2d3436;}
.card{background:white;border-radius:16px;padding:48px;max-width:420px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
h1{font-family:'Noto Serif',Georgia,serif;font-size:24px;color:#45636b;margin:0 0 12px;}
p{font-size:15px;color:#5a6a70;line-height:1.6;margin:0 0 24px;}
a{display:inline-block;padding:10px 28px;background:#45636b;color:white;text-decoration:none;border-radius:24px;font-size:14px;font-weight:600;}
</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p><a href="/admin/agents">Go to Dashboard</a></div></body></html>`;

  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
