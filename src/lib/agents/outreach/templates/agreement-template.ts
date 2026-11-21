/**
 * Agreement Template Generator
 * Produces the customized agreement details for PandaDoc.
 * The actual document template lives in PandaDoc — this prepares the data.
 */

import type { AgreementDetails, BlogTier } from "@/types/agent";

/**
 * Build agreement details from pipeline data and center info.
 */
export function buildAgreementDetails(params: {
  centerName: string;
  centerCountry: string;
  centerCity: string;
  contactPerson: string;
  contactEmail: string;
  agreedCommissionRate: number;
  blogTier: BlogTier;
  specialTerms: string | null;
  contractDurationMonths?: number;
}): AgreementDetails {
  const now = new Date();
  const contractEnd = new Date(now);
  contractEnd.setMonth(contractEnd.getMonth() + (params.contractDurationMonths || 12));

  return {
    center_name: params.centerName,
    center_country: params.centerCountry,
    center_city: params.centerCity,
    contact_person: params.contactPerson,
    contact_email: params.contactEmail,
    commission_rate: params.agreedCommissionRate,
    blog_tier: params.blogTier,
    special_terms: params.specialTerms,
    contract_start: now.toISOString().split("T")[0],
    contract_end: contractEnd.toISOString().split("T")[0],
  };
}

/**
 * Get the blog tier based on agreed commission rate.
 */
export function getBlogTierFromRate(rate: number): BlogTier {
  if (rate <= 8) return "premium";  // 5+ blogs/month
  if (rate <= 10) return "standard"; // 3-4 blogs/month
  return "none";
}

/**
 * Get human-readable commission description for the agreement.
 */
export function getCommissionDescription(rate: number, blogTier: BlogTier): string {
  const tierDescriptions: Record<BlogTier, string> = {
    none: `${rate}% referral commission on all clients referred through Rehab-Atlas`,
    standard: `${rate}% referral commission, contingent on publishing 3 approved articles per calendar month on the Rehab-Atlas platform. Standard rate of 12% applies in months where the article requirement is not met.`,
    premium: `${rate}% referral commission, contingent on publishing 5 approved articles per calendar month on the Rehab-Atlas platform. Standard rate of 12% applies in months where the article requirement is not met.`,
  };

  return tierDescriptions[blogTier];
}

/**
 * Generate a notification email to the center about the agreement being sent.
 */
export function generateAgreementNoticeEmail(params: {
  centerName: string;
  contactPerson: string | null;
  /** @deprecated Not rendered — partner emails must not mention commission (policy 2026-05-17). */
  commissionRate?: number;
  persona?: string;
}): { subject: string; bodyText: string } {
  const persona = params.persona || process.env.OUTREACH_PERSONA_NAME || "Sarah";
  const greeting = params.contactPerson
    ? `Hi ${params.contactPerson.split(" ")[0]},`
    : `Hi there,`;

  return {
    subject: `Partnership agreement for ${params.centerName} - ready for your signature`,
    bodyText: `${greeting}

Great news — I've prepared our partnership agreement based on what we discussed. You should receive it via PandaDoc shortly.

Please take a look when you get a chance. If anything needs adjusting, just let me know and I'll update it right away.

Once both sides have signed, we'll get ${params.centerName} set up on the platform. Inquiries are reviewed by our team first, and we'll pass on the ones that fit what you offer.

Thanks for choosing to partner with us — I'm looking forward to working together.

Best,
${persona}
Partnerships, Rehab-Atlas
info@rehab-atlas.com
rehab-atlas.com`,
  };
}
