import { Resend } from "resend";
import { getAdminEmail, isNotificationEnabled } from "@/lib/settings";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder_missing_key");

// Admin recipient + notification toggles come from /admin/settings
// (site_settings platform_* keys) with env fallback — see src/lib/settings.ts.
const FROM_EMAIL = "Rehab-Atlas <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ── New Lead / Inquiry ──
interface AdminNotificationData {
  name: string;
  email: string;
  urgency: string;
  concern: string;
}

export async function sendAdminNotification(data: AdminNotificationData) {
  if (!(await isNotificationEnabled("new_lead"))) return;
  const urgencyLabel =
    data.urgency === "urgent" ? "URGENT" : data.urgency === "soon" ? "Soon" : "Normal";

  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safeConcern = escapeHtml(data.concern);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: await getAdminEmail(),
      subject: `[${urgencyLabel}] New Inquiry from ${data.name}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #45636b; margin-bottom: 20px;">New Inquiry Received</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Name</td><td style="padding: 8px 0; font-weight: 600;">${safeName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Email</td><td style="padding: 8px 0;">${safeEmail}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Urgency</td><td style="padding: 8px 0; color: ${data.urgency === 'urgent' ? '#9f403d' : '#45636b'}; font-weight: 600;">${urgencyLabel}</td></tr>
          </table>
          <div style="background: #f4f6f7; border-radius: 12px; padding: 16px; margin-top: 16px;">
            <p style="color: #6b7d82; font-size: 12px; text-transform: uppercase; margin: 0 0 8px;">Concern</p>
            <p style="margin: 0; color: #2b3437;">${safeConcern}</p>
          </div>
          <a href="${APP_URL}/admin/leads" style="display: inline-block; background: #45636b; color: white; padding: 10px 24px; border-radius: 999px; text-decoration: none; margin-top: 20px; font-size: 14px;">View in Dashboard</a>
          <p style="color: #6b7d82; font-size: 11px; margin-top: 20px;">Rehab-Atlas — A Digital Sanctuary for Recovery</p>
        </div>
      `,
    });
    console.log("Email sent: new inquiry from", data.name);
  } catch (e) {
    console.error("Failed to send inquiry notification:", e);
  }
}

// ── Partner Verification Request ──
interface PartnerRequestData {
  name: string;
  email: string;
  centerName: string;
  centerWebsite?: string;
  message?: string;
}

export async function sendPartnerRequestNotification(data: PartnerRequestData) {
  if (!(await isNotificationEnabled("partner_request"))) return;
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safeCenterName = escapeHtml(data.centerName);
  const safeCenterWebsite = data.centerWebsite ? escapeHtml(data.centerWebsite) : undefined;
  const safeMessage = data.message ? escapeHtml(data.message) : undefined;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: await getAdminEmail(),
      subject: `[Partner Request] ${data.centerName} — ${data.name}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #45636b; margin-bottom: 20px;">New Center Partner Application</h2>
          <p style="color: #6b7d82; margin-bottom: 16px;">Someone wants to manage a center listing on Rehab-Atlas.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Applicant</td><td style="padding: 8px 0; font-weight: 600;">${safeName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Email</td><td style="padding: 8px 0;">${safeEmail}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Center Name</td><td style="padding: 8px 0; font-weight: 600;">${safeCenterName}</td></tr>
            ${safeCenterWebsite ? `<tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Website</td><td style="padding: 8px 0;"><a href="${safeCenterWebsite}">${safeCenterWebsite}</a></td></tr>` : ""}
          </table>
          ${safeMessage ? `<div style="background: #f4f6f7; border-radius: 12px; padding: 16px; margin-top: 16px;"><p style="color: #6b7d82; font-size: 12px; text-transform: uppercase; margin: 0 0 8px;">Message</p><p style="margin: 0; color: #2b3437;">${safeMessage}</p></div>` : ""}
          <div style="margin-top: 16px;">
            <a href="${APP_URL}/admin/users" style="display: inline-block; background: #45636b; color: white; padding: 10px 24px; border-radius: 999px; text-decoration: none; font-size: 14px;">Manage Users</a>
          </div>
          <p style="color: #6b7d82; font-size: 11px; margin-top: 20px;">To approve: Go to Admin → Users &amp; Partners → Change their role to &quot;Center Partner&quot; and link to their center.</p>
        </div>
      `,
    });
    console.log("Email sent: partner request from", data.name);
  } catch (e) {
    console.error("Failed to send partner request notification:", e);
  }
}

// ── Article Submission by Partner ──
interface BlogSubmissionData {
  authorName: string;
  centerName: string;
  articleTitle: string;
}

export async function sendBlogSubmissionNotification(data: BlogSubmissionData) {
  const safeAuthorName = escapeHtml(data.authorName);
  const safeCenterName = escapeHtml(data.centerName);
  const safeArticleTitle = escapeHtml(data.articleTitle);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: await getAdminEmail(),
      subject: `[Article Submission] "${data.articleTitle}" by ${data.centerName}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #45636b; margin-bottom: 20px;">New Article Submitted</h2>
          <p style="color: #6b7d82; margin-bottom: 16px;">A center partner has submitted an article for review.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Article Title</td><td style="padding: 8px 0; font-weight: 600;">${safeArticleTitle}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Author</td><td style="padding: 8px 0;">${safeAuthorName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Center</td><td style="padding: 8px 0;">${safeCenterName}</td></tr>
          </table>
          <a href="${APP_URL}/admin/content" style="display: inline-block; background: #45636b; color: white; padding: 10px 24px; border-radius: 999px; text-decoration: none; margin-top: 20px; font-size: 14px;">Review Content</a>
          <p style="color: #6b7d82; font-size: 11px; margin-top: 20px;">Rehab-Atlas — A Digital Sanctuary for Recovery</p>
        </div>
      `,
    });
    console.log("Email sent: article submission from", data.centerName);
  } catch (e) {
    console.error("Failed to send article submission notification:", e);
  }
}

// ── Lead Forward to Center ──
interface LeadForwardData {
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
  concern: string;
  message?: string;
  centerName: string;
  centerEmail: string;
}

export async function sendLeadForwardEmail(data: LeadForwardData) {
  const safeLeadName = escapeHtml(data.leadName);
  const safeLeadEmail = escapeHtml(data.leadEmail);
  const safeLeadPhone = data.leadPhone ? escapeHtml(data.leadPhone) : undefined;
  const safeConcern = escapeHtml(data.concern);
  const safeMessage = data.message ? escapeHtml(data.message) : undefined;
  const safeCenterName = escapeHtml(data.centerName);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.centerEmail,
      subject: `Referral from Rehab-Atlas — ${data.leadName}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #45636b; margin-bottom: 20px;">New Referral from Rehab-Atlas</h2>
          <p>Dear ${safeCenterName} team,</p>
          <p>We have a potential client who may benefit from your services:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Name</td><td style="padding: 8px 0; font-weight: 600;">${safeLeadName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Email</td><td style="padding: 8px 0;">${safeLeadEmail}</td></tr>
            ${safeLeadPhone ? `<tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Phone</td><td style="padding: 8px 0;">${safeLeadPhone}</td></tr>` : ""}
          </table>
          <div style="background: #f4f6f7; border-radius: 12px; padding: 16px;">
            <p style="color: #6b7d82; font-size: 12px; text-transform: uppercase; margin: 0 0 8px;">Concern</p>
            <p style="margin: 0; color: #2b3437;">${safeConcern}</p>
          </div>
          ${safeMessage ? `<p style="margin-top: 12px;"><strong>Additional notes:</strong> ${safeMessage}</p>` : ""}
          <p style="margin-top: 20px;">Please reach out to this individual at your earliest convenience.</p>
          <p>Best regards,<br />The Rehab-Atlas Team</p>
        </div>
      `,
    });
    console.log("Email sent: lead forwarded to", data.centerName);
  } catch (e) {
    console.error("Failed to send lead forward email:", e);
  }
}

// ── Assessment Confirmation (to user) ──
interface AssessmentMatchPreview {
  name: string;
  location: string;
  score: number | null;
  fit_summary: string;
}

interface AssessmentConfirmationData {
  to: string;
  name?: string;
  assessmentId: string;
  matches: AssessmentMatchPreview[];
  urgency: string;
}

export async function sendAssessmentConfirmation(data: AssessmentConfirmationData) {
  const greeting = data.name ? `Hi ${escapeHtml(data.name)},` : "Hello,";
  const resultsUrl = `${APP_URL}/assessment/results?id=${data.assessmentId}`;
  const isUrgent = data.urgency === "urgent";

  const matchesHtml = data.matches
    .slice(0, 3)
    .map((m, i) => {
      const safeName = escapeHtml(m.name);
      const safeLoc = escapeHtml(m.location);
      const safeSummary = escapeHtml(m.fit_summary || "");
      const scoreLabel = m.score != null ? `${m.score}% match` : "";
      return `
        <div style="background: #f4f6f7; border-radius: 12px; padding: 16px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <p style="margin: 0; font-weight: 600; color: #2b3437;">#${i + 1} · ${safeName}</p>
            ${scoreLabel ? `<span style="font-size: 11px; color: #45636b;">${scoreLabel}</span>` : ""}
          </div>
          <p style="margin: 4px 0 0; font-size: 12px; color: #6b7d82;">${safeLoc}</p>
          ${safeSummary ? `<p style="margin: 8px 0 0; font-size: 12px; color: #45636b;">${safeSummary}</p>` : ""}
        </div>
      `;
    })
    .join("");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: isUrgent
        ? "Your Rehab-Atlas matches — our team will be in touch"
        : "Your personalized Rehab-Atlas matches",
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #2b3437;">
          <h2 style="color: #45636b; margin-bottom: 8px;">Your matches are ready</h2>
          <p style="color: #6b7d82; font-size: 13px; margin-top: 0;">${greeting}</p>
          <p style="font-size: 14px; line-height: 1.6;">
            Based on your assessment, here are the treatment centers our clinical team identified as the strongest fits for you.
          </p>

          ${isUrgent ? `
            <div style="background: #fef2f2; border-radius: 12px; padding: 14px; margin: 16px 0; border-left: 3px solid #9f403d;">
              <p style="margin: 0; font-size: 13px; color: #9f403d; font-weight: 600;">You marked this as urgent.</p>
              <p style="margin: 6px 0 0; font-size: 12px; color: #2b3437;">A Rehab-Atlas specialist will reach out to you shortly. If this is a medical emergency, please call your local emergency services immediately.</p>
            </div>
          ` : ""}

          ${matchesHtml || '<p style="font-size: 13px; color: #6b7d82;">View your full match list on the website.</p>'}

          <div style="margin-top: 24px;">
            <a href="${resultsUrl}" style="display: inline-block; background: #45636b; color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-size: 14px; font-weight: 500;">View all my matches</a>
          </div>

          <p style="margin-top: 28px; font-size: 13px; color: #6b7d82; line-height: 1.6;">
            Want guidance? Reply to this email and our team will help you weigh your options privately. Your information is never shared with a center unless you explicitly submit an inquiry.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 14px;" />
          <p style="color: #6b7d82; font-size: 11px; margin: 0;">Rehab-Atlas — A Digital Sanctuary for Recovery</p>
        </div>
      `,
    });
    console.log("Email sent: assessment confirmation to", data.to);
  } catch (e) {
    console.error("Failed to send assessment confirmation:", e);
  }
}

// ── New Assessment Notification (to admin) ──
interface AssessmentAdminNotificationData {
  assessmentId: string;
  contactEmail: string;
  contactName?: string;
  contactPhone?: string;
  urgency: string;
  severity?: string;
  whoFor?: string;
  primaryIssue?: string[];
  topMatchName?: string;
  topMatchScore?: number | null;
}

export async function sendAssessmentAdminNotification(data: AssessmentAdminNotificationData) {
  const urgencyLabel =
    data.urgency === "urgent" ? "URGENT" : data.urgency === "soon" ? "Soon" : "Normal";

  const safeEmail = escapeHtml(data.contactEmail);
  const safeName = escapeHtml(data.contactName || "(not provided)");
  const safePhone = escapeHtml(data.contactPhone || "(not provided)");
  const safeSeverity = escapeHtml(data.severity || "—");
  const safeWhoFor = escapeHtml((data.whoFor || "—").replace(/_/g, " "));
  const safeIssues = escapeHtml(
    (data.primaryIssue || []).map((i) => i.replace(/_/g, " ")).join(", ") || "—"
  );
  const safeTopMatch = data.topMatchName ? escapeHtml(data.topMatchName) : "";
  const scoreLabel = data.topMatchScore != null ? ` (${data.topMatchScore}%)` : "";

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: await getAdminEmail(),
      subject: `[${urgencyLabel}] New Assessment — ${data.contactEmail}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #45636b; margin-bottom: 20px;">New Assessment Completed</h2>
          <p style="color: #6b7d82; font-size: 13px; margin-top: 0;">
            A user just completed the AI self-assessment. They have <strong>not yet submitted a formal inquiry</strong> — reach out proactively if warranted.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Email</td><td style="padding: 8px 0; font-weight: 600;">${safeEmail}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Name</td><td style="padding: 8px 0;">${safeName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Phone</td><td style="padding: 8px 0;">${safePhone}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Urgency</td><td style="padding: 8px 0; color: ${data.urgency === 'urgent' ? '#9f403d' : '#45636b'}; font-weight: 600;">${urgencyLabel}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Who for</td><td style="padding: 8px 0;">${safeWhoFor}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Severity</td><td style="padding: 8px 0;">${safeSeverity}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Primary issue</td><td style="padding: 8px 0;">${safeIssues}</td></tr>
            ${safeTopMatch ? `<tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Top match</td><td style="padding: 8px 0;">${safeTopMatch}${scoreLabel}</td></tr>` : ""}
          </table>
          <a href="${APP_URL}/admin/assessments/${data.assessmentId}" style="display: inline-block; background: #45636b; color: white; padding: 10px 24px; border-radius: 999px; text-decoration: none; margin-top: 20px; font-size: 14px;">View assessment</a>
          <p style="color: #6b7d82; font-size: 11px; margin-top: 20px;">Rehab-Atlas — A Digital Sanctuary for Recovery</p>
        </div>
      `,
    });
    console.log("Email sent: new assessment notification for", data.contactEmail);
  } catch (e) {
    console.error("Failed to send assessment admin notification:", e);
  }
}
