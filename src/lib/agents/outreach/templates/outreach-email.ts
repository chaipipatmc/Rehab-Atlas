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

  const subject = `Helping more people find ${params.centerName}`;

  const bodyText = `${greeting}

I came across ${params.centerName} while researching ${specialty} providers, and I was genuinely impressed by ${usp}.

My name is ${persona}, and I'm reaching out from Rehab-Atlas. We're building a new platform with a simple goal — making it easier for people looking for rehabilitation to find the right center for themselves or their loved ones.

We believe that many people who need help simply don't know where to look, and great centers like yours don't always get the visibility they deserve. That's the problem we're trying to solve.

We'd love to invite ${params.centerName} to be part of Rehab-Atlas. Joining is free and straightforward — you'd set up your center profile on our platform, share details about your programs and approach, and optionally contribute educational articles that help people understand treatment options. Every article you publish includes a backlink to your website and credits you as the author, which is great for your online visibility and SEO.

There's no cost and no strings attached. We're focused on building a trusted directory where people in need can find quality care, and your center would be a valuable addition.

If you're interested in being part of this journey, just reply to this email and let me know. I'll send you your login credentials and walk you through getting your center profile set up with 100% completeness — so people searching for help can find everything they need to know about ${params.centerName}.

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
  return `You are ${persona} from the Partnerships team at Rehab-Atlas, a new platform that helps people find the right rehabilitation center for themselves or their loved ones.

WHAT REHAB-ATLAS IS:
- A new platform focused on making rehabilitation accessible and discoverable
- We help people who are searching for rehab centers to find the right match for their conditions
- We list center profiles with programs, specialties, photos, and details
- Centers can also publish educational blog articles on our platform
- Each article includes a backlink to the center's website + author credit (SEO benefit)
- We are in early stages, actively building our network of partner centers

CRITICAL RULES:
1. DO NOT mention any commission, fees, or payment structure. There is NO commission discussion in this email. We are focused on onboarding centers first.
2. NEVER suggest a phone call, video call, or brief call. All communication is via email only. Ask them to reply to this email.
3. Emphasize that joining is completely FREE. No cost, no strings attached.
4. Frame this as a community mission — helping people find the care they need.
5. Mention the blog/article opportunity naturally — it's good for their SEO (backlinks + author credit).

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
- Frame the invitation around helping more people find quality care
- Keep it concise — 4-5 short paragraphs max
- End with: if they're interested in being part of this journey, reply and we'll send them login credentials and walk them through getting their center profile to 100% completeness
- Use the signature: "${persona}\\nPartnerships, Rehab-Atlas\\ninfo@rehab-atlas.com\\nrehab-atlas.com"

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
  return `Write a personalized introduction email to ${params.centerName}, inviting them to join Rehab-Atlas.

Contact person: ${params.contactPerson || "Unknown (use generic greeting)"}

Research findings:
- Programs: ${research.programs.join(", ") || "General rehabilitation"}
- Specialties: ${research.specialties.join(", ") || "Not specified"}
- Target audience: ${research.target_audience || "General"}
- Website summary: ${research.website_summary}
- Unique selling points: ${research.unique_selling_points.join(", ")}
- Tone of their website: ${research.tone_analysis}

REMINDERS:
- DO NOT mention any commission, fees, or costs. This is purely an invitation to join a free platform.
- NO phone calls — ask them to reply via email
- We are a NEW platform, building a trusted directory of rehab centers
- Joining is FREE — no cost, no strings attached
- Frame it as: we want to help more people find the right care, and their center would be a great fit
- Mention blog opportunity: they can publish articles on our platform, each with a backlink to their website + author credit (good for SEO)
- End with: if interested in being part of this journey, reply and we'll send login credentials + walk them through getting their profile to 100% completeness
- Keep it short and genuine — 4-5 paragraphs max

Write the email now. Make it feel like a real human wrote it.`;
}
