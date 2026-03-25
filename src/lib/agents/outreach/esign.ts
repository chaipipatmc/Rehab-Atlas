/**
 * PandaDoc E-Signature Client for Outreach Pipeline
 * Uses template with tokens for agreement generation.
 *
 * Setup: Set PANDADOC_API_KEY and PANDADOC_TEMPLATE_ID env vars.
 * PandaDoc docs: https://developers.pandadoc.com/reference
 */

import type { AgreementDetails } from "@/types/agent";

const API_BASE = "https://api.pandadoc.com/public/v1";
const OWNER_EMAIL = process.env.ADMIN_EMAIL || "chaipipat.mc@rehab-atlas.com";

function getHeaders(): Record<string, string> {
  const apiKey = process.env.PANDADOC_API_KEY;
  if (!apiKey) throw new Error("PANDADOC_API_KEY not configured");

  return {
    "Authorization": `API-Key ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export interface CreateDocumentResult {
  documentId: string;
  status: string;
}

/**
 * Create an agreement document from the PandaDoc template.
 * Pre-fills text fields and sets up signing recipients.
 *
 * Template fields (text fields assigned to roles):
 *   Rehab-Atlas: contract_no, contract_date, date
 *   Client: center_name (x2), center_address, center_country,
 *           Authorized_Representative, center_email,
 *           center_registration_no, center_representative_name, date
 */
export async function createAgreement(details: AgreementDetails): Promise<CreateDocumentResult | null> {
  const templateId = process.env.PANDADOC_TEMPLATE_ID;
  if (!templateId) {
    console.error("PANDADOC_TEMPLATE_ID not configured");
    return null;
  }

  const contractNo = `RA-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const response = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      name: `Partnership Agreement - ${details.center_name}`,
      template_uuid: templateId,
      recipients: [
        {
          email: details.contact_email,
          first_name: details.contact_person.split(" ")[0],
          last_name: details.contact_person.split(" ").slice(1).join(" ") || "",
          role: "Client",
          signing_order: 1,
        },
        {
          email: OWNER_EMAIL,
          first_name: "Chaipipat",
          last_name: "MC",
          role: "Rehab-Atlas",
          signing_order: 2,
        },
      ],
      fields: {
        // Rehab-Atlas fields
        contract_no: { value: contractNo, role: "Rehab-Atlas" },
        contract_date: { value: today, role: "Rehab-Atlas" },
        // Client fields
        center_name: { value: details.center_name, role: "Client" },
        center_address: { value: `${details.center_city}, ${details.center_country}`, role: "Client" },
        center_country: { value: details.center_country, role: "Client" },
        Authorized_Representative: { value: details.contact_person, role: "Client" },
        center_email: { value: details.contact_email, role: "Client" },
        center_registration_no: { value: "", role: "Client" },
        center_representative_name: { value: details.contact_person, role: "Client" },
      },
      tokens: [
        { name: "Document.RefNumber", value: contractNo },
        { name: "Effective_date", value: details.contract_start },
        { name: "center_name", value: details.center_name },
        { name: "center_Authorized_Representative", value: details.contact_person },
        { name: "center_address", value: `${details.center_city}, ${details.center_country}` },
        { name: "center_country", value: details.center_country },
        { name: "center_email", value: details.contact_email },
        { name: "center_registration_no", value: "" },
        { name: "contract_end", value: details.contract_end },
      ],
      metadata: {
        center_name: details.center_name,
        commission_rate: String(details.commission_rate),
        blog_tier: details.blog_tier,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("PandaDoc create document failed:", err);
    return null;
  }

  const data = await response.json();
  return {
    documentId: data.id,
    status: data.status,
  };
}

/**
 * Send a document for e-signature.
 * The document must be in "document.draft" status before sending.
 */
export async function sendForSignature(documentId: string, message?: string): Promise<boolean> {
  // PandaDoc requires document to be in draft status before sending
  const response = await fetch(`${API_BASE}/documents/${documentId}/send`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      message: message || "Please review and sign the partnership agreement with Rehab-Atlas. Feel free to reach out if you have any questions.",
      silent: false,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("PandaDoc send for signature failed:", err);
    return false;
  }

  return true;
}

/**
 * Get the current status of a document.
 */
export async function getDocumentStatus(documentId: string): Promise<{
  status: string;
  name: string;
  dateCompleted: string | null;
  recipients: Array<{
    email: string;
    role: string;
    hasSigned: boolean;
    signedDate: string | null;
  }>;
} | null> {
  const response = await fetch(`${API_BASE}/documents/${documentId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) return null;

  const data = await response.json();
  return {
    status: data.status,
    name: data.name,
    dateCompleted: data.date_completed || null,
    recipients: (data.recipients || []).map((r: Record<string, unknown>) => ({
      email: r.email,
      role: r.role,
      hasSigned: r.has_completed === true,
      signedDate: (r.completed_date as string) || null,
    })),
  };
}

/**
 * Get the public link for a document (for embedding in emails).
 */
export async function getDocumentLink(documentId: string, recipientEmail: string): Promise<string | null> {
  const response = await fetch(`${API_BASE}/documents/${documentId}/session`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      recipient: recipientEmail,
      lifetime: 86400, // 24 hours
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data.id ? `https://app.pandadoc.com/s/${data.id}` : null;
}

/**
 * Verify PandaDoc webhook signature.
 */
export function verifyPandaDocWebhook(payload: string, signature: string): boolean {
  const webhookKey = process.env.PANDADOC_WEBHOOK_KEY;
  if (!webhookKey) return false;

  const { createHmac } = require("crypto");
  const expected = createHmac("sha256", webhookKey).update(payload).digest("hex");
  return signature === expected;
}

/**
 * Map PandaDoc document status to our ESignStatus.
 */
export function mapPandaDocStatus(pandaStatus: string, recipients?: Array<{ hasSigned: boolean; role: string }>): string {
  switch (pandaStatus) {
    case "document.draft": return "draft";
    case "document.sent": return "sent";
    case "document.viewed": return "viewed";
    case "document.completed": return "completed";
    case "document.declined": return "declined";
    case "document.expired": return "expired";
    case "document.waiting_approval": return "sent";
    default: {
      // Check partial signing
      if (recipients) {
        const centerSigned = recipients.find((r) => r.role === "Client")?.hasSigned;
        const ownerSigned = recipients.find((r) => r.role === "Rehab-Atlas")?.hasSigned;
        if (centerSigned && ownerSigned) return "completed";
        if (centerSigned) return "center_signed";
        if (ownerSigned) return "owner_signed";
      }
      return "sent";
    }
  }
}
