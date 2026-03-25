/**
 * Follow-up Email Templates
 * Three follow-ups with escalating urgency but always respectful tone.
 * Auto-sent on Day 3, Day 7, Day 14 after initial outreach.
 */

const PERSONA = process.env.OUTREACH_PERSONA_NAME || "Sarah";

interface FollowUpParams {
  centerName: string;
  contactPerson: string | null;
  persona?: string;
}

/**
 * Follow-up 1 (Day 3): Light nudge
 */
export function generateFollowUp1(params: FollowUpParams): { subject: string; bodyText: string } {
  const persona = params.persona || PERSONA;
  const greeting = params.contactPerson
    ? `Hi ${params.contactPerson.split(" ")[0]},`
    : `Hi there,`;

  return {
    subject: `Re: Partnership opportunity for ${params.centerName}`,
    bodyText: `${greeting}

Just wanted to make sure my previous message didn't get buried — I know inboxes can be overwhelming.

I reached out a few days ago about listing ${params.centerName} on Rehab-Atlas. We're a referral platform that connects people seeking treatment with centers like yours, and I think there's a real opportunity here.

If you're interested, just reply to this email and I'll share more details about how it works. No pressure at all.

Best,
${persona}
Partnerships, Rehab-Atlas
info@rehab-atlas.com
rehab-atlas.com`,
  };
}

/**
 * Follow-up 2 (Day 7): Value-add with social proof
 */
export function generateFollowUp2(params: FollowUpParams): { subject: string; bodyText: string } {
  const persona = params.persona || PERSONA;
  const greeting = params.contactPerson
    ? `Hi ${params.contactPerson.split(" ")[0]},`
    : `Hi there,`;

  return {
    subject: `Re: Partnership opportunity for ${params.centerName}`,
    bodyText: `${greeting}

Following up one more time — I wanted to share a quick update that might be relevant.

We've recently onboarded several centers in your region, and the early feedback has been positive. Partners are seeing inquiries come through within the first few weeks, and some have found the blog publishing option helpful for building their online presence while reducing their referral costs.

If the timing works, just drop me a reply and I'll fill you in on the details.

Best,
${persona}
Partnerships, Rehab-Atlas
info@rehab-atlas.com
rehab-atlas.com`,
  };
}

/**
 * Follow-up 3 (Day 14): Final, graceful close
 */
export function generateFollowUp3(params: FollowUpParams): { subject: string; bodyText: string } {
  const persona = params.persona || PERSONA;
  const greeting = params.contactPerson
    ? `Hi ${params.contactPerson.split(" ")[0]},`
    : `Hi there,`;

  return {
    subject: `Re: Partnership opportunity for ${params.centerName}`,
    bodyText: `${greeting}

I realize this might not be the right time, and I completely understand. Running a center is demanding work, and partnerships aren't always top of mind.

I'll leave this here — if you're ever curious about how Rehab-Atlas could work for ${params.centerName}, feel free to reach out anytime. The door is always open.

Wishing you and your team all the best.

${persona}
Partnerships, Rehab-Atlas
info@rehab-atlas.com
rehab-atlas.com`,
  };
}

/**
 * Claude AI system prompt for generating follow-up emails.
 */
export function getFollowUpSystemPrompt(attemptNumber: number, persona: string = PERSONA): string {
  const toneGuide = attemptNumber === 1
    ? "Light nudge — just checking if the previous email was seen. Keep it very short (3-4 sentences max)."
    : attemptNumber === 2
      ? "Value-add — share something useful or mention social proof. A bit longer but still concise."
      : "Final follow-up — graceful, no pressure. Let them know the door is open. This is the last email.";

  return `You are ${persona} from Rehab-Atlas Partnerships. Write follow-up #${attemptNumber} for a center that hasn't replied to the initial outreach.

Tone: ${toneGuide}

Rules:
- This is a reply in the same thread (use "Re:" subject)
- Don't repeat the full commission structure — they already have it
- Sound genuinely human, not automated
- No guilt-tripping or desperation
- NEVER suggest a phone call or video call — email only
- Rehab-Atlas is a new platform in early stages — we're building our partner network
- End with a low-pressure ask to reply via email, or a graceful close
- Signature: "${persona}\\nPartnerships, Rehab-Atlas\\ninfo@rehab-atlas.com\\nrehab-atlas.com"

Return JSON: { "subject": "...", "body_text": "..." }`;
}
