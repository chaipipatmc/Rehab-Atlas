import { Resend } from "resend";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "chaipipat.mc@gmail.com";
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
  const urgencyLabel =
    data.urgency === "urgent" ? "URGENT" : data.urgency === "soon" ? "Soon" : "Normal";

  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safeConcern = escapeHtml(data.concern);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
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
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safeCenterName = escapeHtml(data.centerName);
  const safeCenterWebsite = data.centerWebsite ? escapeHtml(data.centerWebsite) : undefined;
  const safeMessage = data.message ? escapeHtml(data.message) : undefined;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
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
      to: ADMIN_EMAIL,
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
