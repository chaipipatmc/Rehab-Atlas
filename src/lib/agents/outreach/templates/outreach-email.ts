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

My name is ${persona}, and I work with Rehab-Atlas — a global platform that connects people seeking rehabilitation with the right centers for their needs. We help clients worldwide find quality treatment options, and I think your center would be a great fit for our network.

Here's how it works: we list your center on our platform and match you with clients who are actively looking for the kind of care you provide. There's no upfront cost to join.

Our commission structure is simple:
- 12% referral fee on clients we send your way
- 10% if your team publishes 3 articles per month on our platform
- 8% if you publish 6 articles per month

The articles help build your center's online presence while reducing your partnership costs — it's a genuine win-win.

Would you be open to a quick conversation about this? I'd love to share more details and answer any questions.

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
  return `You are ${persona} from the Partnerships team at Rehab-Atlas, a global platform that helps people find rehabilitation centers worldwide.

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
- End with one clear, low-pressure ask
- Use the signature: "${persona}\\nPartnerships, Rehab-Atlas\\ninfo@rehab-atlas.com\\nrehab-atlas.com"

Commission details to weave in naturally:
- 12% referral fee (standard)
- 10% if the center publishes 3 approved articles per month on our platform
- 8% if they publish 6 approved articles per month
- Articles are counted monthly (1st to 31st), only approved articles count

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
  return `Write a personalized introduction email to ${params.centerName}.

Contact person: ${params.contactPerson || "Unknown (use generic greeting)"}

Research findings:
- Programs: ${research.programs.join(", ") || "General rehabilitation"}
- Specialties: ${research.specialties.join(", ") || "Not specified"}
- Target audience: ${research.target_audience || "General"}
- Website summary: ${research.website_summary}
- Unique selling points: ${research.unique_selling_points.join(", ")}
- Tone of their website: ${research.tone_analysis}

Write the email now. Make it feel like a real human wrote it.`;
}
