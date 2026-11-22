/**
 * Partner-facing copy rules (policy 2026-05-17, board 2026-11-22):
 * no commission / fees / pricing talk, and no individual persona name.
 */
import { describe, expect, it } from "vitest";
import { generateInitialOutreach } from "@/lib/agents/outreach/templates/outreach-email";
import {
  generateFollowUp1,
  generateFollowUp2,
  generateFollowUp3,
} from "@/lib/agents/outreach/templates/follow-up-emails";
import { generateAgreementNoticeEmail } from "@/lib/agents/outreach/templates/agreement-template";
import {
  DEFAULT_PERSONA_NAME,
  formatFromAddress,
  toHeaderSafeName,
} from "@/lib/agents/outreach/persona";

const BANNED = /commission|referral[- ]?(fee|cost)s?|pricing|discount|per[- ]referral|\d+(\.\d+)?\s?% (of|referral|commission)/i;

const research = {
  programs: ["Residential"],
  specialties: ["alcohol addiction"],
  target_audience: "adults",
  website_summary: "",
  unique_selling_points: ["small-group therapy"],
  contact_person_name: null,
  tone_analysis: "warm",
};

const emails = [
  ["initial outreach", generateInitialOutreach({ centerName: "Example Recovery", contactPerson: "Ana Silva", research, countrySlug: "portugal", countryName: "Portugal" })],
  ["follow-up 1", generateFollowUp1({ centerName: "Example Recovery", contactPerson: null })],
  ["follow-up 2", generateFollowUp2({ centerName: "Example Recovery", contactPerson: null })],
  ["follow-up 3", generateFollowUp3({ centerName: "Example Recovery", contactPerson: null })],
  ["agreement notice", generateAgreementNoticeEmail({ centerName: "Example Recovery", contactPerson: null, commissionRate: 12 })],
] as const;

describe.each(emails)("%s", (_name, email) => {
  it("has no commission / pricing language", () => {
    expect(`${email.subject}\n${email.bodyText}`).not.toMatch(BANNED);
  });

  it("is signed by the team, not an individual persona", () => {
    expect(email.bodyText).not.toMatch(/\bSarah\b/);
    expect(email.bodyText).toContain(DEFAULT_PERSONA_NAME);
  });
});

describe("persona", () => {
  it("defaults to the team name", () => {
    expect(DEFAULT_PERSONA_NAME).toBe("The Rehab-Atlas Team");
  });

  it("builds a header-safe From address", () => {
    expect(formatFromAddress("The Rehab-Atlas Team", "info@rehab-atlas.com")).toBe(
      '"The Rehab-Atlas Team" <info@rehab-atlas.com>'
    );
    expect(toHeaderSafeName('Evil"\r\nBcc: x@y.z')).not.toMatch(/["\r\n]/);
    expect(toHeaderSafeName("   ")).toBe(DEFAULT_PERSONA_NAME);
  });
});
