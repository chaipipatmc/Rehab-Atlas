/**
 * Rehab-Atlas Agent System — Notifications
 * Email (Resend) + LINE Notify for agent communications.
 */

import { Resend } from "resend";
import { getAppUrl } from "./base";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "chaipipat.mc@gmail.com";
const FROM_EMAIL = "Rehab-Atlas Agent <onboarding@resend.dev>";
const LINE_TOKEN = process.env.LINE_NOTIFY_TOKEN;

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Agent Email to Owner ──

interface AgentEmailAction {
  label: string;
  token: string;
  decision: string;
  /** Optional: center_id for lead forwarding */
  center_id?: string;
  color?: string;
}

export async function sendAgentEmail(params: {
  subject: string;
  agentLabel: string;
  bodyHtml: string;
  actions: AgentEmailAction[];
}): Promise<void> {
  const appUrl = getAppUrl();

  // Build action buttons — link to a clean confirmation page (not directly to the API)
  const actionButtons = params.actions
    .map((a) => {
      // Short, clean URL that loads a confirmation page with a form POST
      const url = `${appUrl}/api/agents/action?t=${encodeURIComponent(a.token)}&d=${a.decision}${a.center_id ? `&c=${a.center_id}` : ""}`;
      const color = a.color || (a.decision === "approved" ? "#45636b" : a.decision === "rejected" ? "#dc2626" : "#f59e0b");
      return `<a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 24px;background:${color};color:white;text-decoration:none;border-radius:24px;font-size:14px;font-weight:600;margin-right:8px;">${escapeHtml(a.label)}</a>`;
    })
    .join("\n");

  const html = `
    <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#2d3436;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-family:'Noto Serif',Georgia,serif;font-size:22px;color:#45636b;margin:0;">Rehab-Atlas</h1>
        <p style="font-size:11px;color:#9aa5a9;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">${escapeHtml(params.agentLabel)}</p>
      </div>

      ${params.bodyHtml}

      <div style="text-align:center;margin:28px 0;">
        ${actionButtons}
      </div>

      <p style="font-size:11px;color:#9aa5a9;text-align:center;margin-top:24px;">
        This action link expires in 24 hours. After that, use the admin dashboard.
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: params.subject,
      html,
    });
  } catch (err) {
    console.error("Agent email failed:", err);
  }
}

// ── Follow-up Email to User ──

export async function sendFollowUpEmail(params: {
  to: string;
  subject: string;
  bodyHtml: string;
}): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#2d3436;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="font-family:'Noto Serif',Georgia,serif;font-size:22px;color:#45636b;margin:0;">Rehab-Atlas</h1>
          </div>
          ${params.bodyHtml}
          <p style="font-size:11px;color:#9aa5a9;text-align:center;margin-top:32px;">
            Rehab-Atlas — A Digital Sanctuary for Recovery
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Follow-up email failed:", err);
  }
}

// ── Daily Digest Email ──

export async function sendDailyDigest(params: {
  followUpsSent: number;
  followUpsAbandoned: number;
  pendingTasks: number;
  items: Array<{ label: string; status: string; detail: string }>;
}): Promise<void> {
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const itemRows = params.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 12px;font-size:13px;">${escapeHtml(item.label)}</td>
          <td style="padding:8px 12px;font-size:13px;">${escapeHtml(item.status)}</td>
          <td style="padding:8px 12px;font-size:13px;color:#6b7d82;">${escapeHtml(item.detail)}</td>
        </tr>`
    )
    .join("");

  const bodyHtml = `
    <div style="background:#f4f6f7;border-radius:12px;padding:20px;margin-bottom:16px;">
      <table style="width:100%;font-size:14px;">
        <tr><td style="color:#6b7d82;">Follow-ups sent today</td><td style="font-weight:600;text-align:right;">${params.followUpsSent}</td></tr>
        <tr><td style="color:#6b7d82;">Items abandoned</td><td style="font-weight:600;text-align:right;color:${params.followUpsAbandoned > 0 ? "#dc2626" : "#45636b"};">${params.followUpsAbandoned}</td></tr>
        <tr><td style="color:#6b7d82;">Pending agent tasks</td><td style="font-weight:600;text-align:right;">${params.pendingTasks}</td></tr>
      </table>
    </div>
    ${
      params.items.length > 0
        ? `<table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f4f6f7;">
              <th style="text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#6b7d82;">Item</th>
              <th style="text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#6b7d82;">Status</th>
              <th style="text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#6b7d82;">Detail</th>
            </tr></thead>
            <tbody>${itemRows}</tbody>
          </table>`
        : `<p style="text-align:center;color:#9aa5a9;font-size:14px;">All clear — nothing to report today.</p>`
    }
  `;

  await sendAgentEmail({
    subject: `[Agent Daily] Follow-up Summary — ${date}`,
    agentLabel: "Daily Digest",
    bodyHtml,
    actions: [
      {
        label: "Open Dashboard",
        token: "dashboard",
        decision: "dashboard",
        color: "#45636b",
      },
    ],
  });
}

// ── LINE Notify ──

export async function sendLineNotify(message: string): Promise<void> {
  if (!LINE_TOKEN) return;

  try {
    await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LINE_TOKEN}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `message=${encodeURIComponent(`\n[Rehab-Atlas] ${message}`)}`,
    });
  } catch (err) {
    console.error("LINE Notify failed:", err);
  }
}
