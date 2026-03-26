/**
 * Outreach Email Templates
 * Used as fallback when Claude AI is unavailable.
 * All emails are plain-text focused for authenticity.
 */

import type { CenterResearch } from "@/types/agent";

const PERSONA = process.env.OUTREACH_PERSONA_NAME || "Sarah";

interface TemplateParams {
  centerName: string;
  contactPerson: string | null;
  research: CenterResearch;
  persona?: string;
}

/**
 * Generate the initial outreach email (template fallback).
 * Claude AI generates a better version — this is the safety net.
 */
export function generateInitialOutreach(params: TemplateParams): {
  subject: string;
  bodyText: string;
} {
  const persona = params.persona || PERSONA;
  const greeting = params.contactPerson
    ? `Hi ${params.contactPerson.split(" ")[0]},`
    : `Hi there,`;

  const specialty = params.research.specialties[0] || "rehabilitation services";
  const usp = params.research.unique_selling_points[0] || "your approach to recovery";

  const subject = `Partnership opportunity for ${params.centerName}`;

  const bodyText = `${greeting}

I came across ${params.centerName} while researching ${specialty} providers, and I was impressed by ${usp}.

My name is ${persona}, and I'm reaching out from Rehab-Atlas. We're building a global platform that helps people find the right rehabilitation center for their needs, and we're currently in the early stages of growing our network of partner centers.

We'd love to invite ${params.centerName} to join us as one of our early partners. Being part of our platform from the start means your center gets visibility from day one as we grow, and you'd be helping shape how we connect people with quality care.

The way it works is straightforward — we list your center on our platform and refer clients who match your programs. When a client we refer is admitted, a 12% commission applies. Centers that contribute articles to our platform enjoy lower rates: 10% with 3 articles per month, or 8% with 5 articles. Each article includes a backlink to your website with you credited as the author, which helps with your search engine rankings.

Since we're just getting started, we're running a launch offer for early partners: 0% commission for the first 2 months — completely free referrals. The only ask is that you publish 3 articles per month on our platform for 3 months. After the free period, the standard commission structure applies.

There's no upfront cost, and honestly the timing couldn't be better to join as an early partner.

If this sounds interesting, feel free to reply to this email and we can go from there. I'm happy to answer any questions you might have.

Looking forward to hearing from you.

Best,
${persona}
Partnerships, Rehab-Atlas
info@rehab-atlas.com
rehab-atlas.com`;

  return { subject, bodyText };
}

/**
 * Claude AI system prompt for generating personalized outreach emails.
 */
export function getOutreachSystemPrompt(persona: string = PERSONA): string {
  return `You are ${persona} from the Partnerships team at Rehab-Atlas, a new global platform that helps people find rehabilitation centers worldwide. Rehab-Atlas is in its early stages and actively building its network of partner centers.

CRITICAL RULES — get these right:
1. Commission is paid BY THE CENTER TO US (Rehab-Atlas), NOT the other way around. We refer clients to them, and they pay us a commission when a referred client is admitted. NEVER say "we pay you" — it's "a 12% commission applies" or "the commission is 12%".
2. NEVER suggest a phone call, video call, or brief call. All communication is via email only. Ask them to reply to this email.
3. Emphasize that Rehab-Atlas is a new/early-stage platform. We're inviting them to join as an early partner. Being early means they get visibility from the start as we grow.
4. There is NO upfront cost to join.

You write emails that sound natural and human — like a real person typing at their desk. Never use:
- Corporate jargon ("leverage", "synergize", "maximize", "optimize", "empower")
- Exclamation marks (use one at most, only if genuinely excited)
- Bullet points in the email body (use flowing paragraphs instead)
- Marketing phrases ("game-changer", "cutting-edge", "world-class")
- "I hope this email finds you well" or similar clichés

Your emails should:
- Be conversational and warm, but professional
- Have short paragraphs (2-3 sentences max)
- Reference something specific about their center from the research
- Mention the commission structure naturally, not as a sales pitch
- End by asking them to reply to this email if interested
- Use the signature: "${persona}\\nPartnerships, Rehab-Atlas\\ninfo@rehab-atlas.com\\nrehab-atlas.com"

Commission structure (the center pays us):
- 12% commission on admitted clients referred through our platform (standard rate)
- 10% if the center publishes 3 approved articles per month on our platform
- 8% if they publish 5 approved articles per month
- Articles are counted monthly (1st to 31st), only approved articles count
- No upfront cost — commission only applies when a referred client is admitted

LAUNCH CAMPAIGN (very important — mention this prominently):
- Since Rehab-Atlas is new, we're offering an early partner deal
- 0% commission for the first 2 months — completely free referrals
- The only condition: publish 3 blog articles per month on our platform for 3 months
- After the 2-month free period, the normal commission structure kicks in (12%/10%/8%)
- This is a limited-time offer for early partners who join now

Blog benefit to mention naturally:
- Publishing articles on Rehab-Atlas reduces their commission rate
- Each article includes a backlink to the center's website — this helps their SEO rankings
- The center is credited as the author, building their authority and online visibility
- It's a win-win: lower commission costs + better search engine presence for the center

Return a JSON object with:
{
  "subject": "email subject line (short, personal, no caps lock)",
  "body_text": "the full email in plain text",
  "personalization_points": ["list of specific things referenced from research"]
}`;
}

/**
 * Claude AI user prompt for outreach email generation.
 */
export function getOutreachUserPrompt(params: TemplateParams): string {
  const research = params.research;
  return `Write a personalized introduction email to ${params.centerName}, inviting them to join Rehab-Atlas as an early partner.

Contact person: ${params.contactPerson || "Unknown (use generic greeting)"}

Research findings:
- Programs: ${research.programs.join(", ") || "General rehabilitation"}
- Specialties: ${research.specialties.join(", ") || "Not specified"}
- Target audience: ${research.target_audience || "General"}
- Website summary: ${research.website_summary}
- Unique selling points: ${research.unique_selling_points.join(", ")}
- Tone of their website: ${research.tone_analysis}

REMINDERS:
- Commission is paid by THEM to US (not us to them) — 12% on admitted referrals
- NO phone calls — ask them to reply via email
- We are a NEW platform in early stages, inviting early partners
- No upfront cost
- LAUNCH CAMPAIGN: 0% commission for first 2 months if they publish 3 blogs/month for 3 months. Mention this prominently — it's our main hook.
- Blog SEO benefit: each article includes a backlink to their website, credited as author
- Commission tiers: 12% base, 10% with 3 blogs/month, 8% with 5 blogs/month

Write the email now. Make it feel like a real human wrote it.`;
}
