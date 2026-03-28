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

When someone is searching for rehab and their needs match what you offer, they can send an inquiry directly to your center through our platform. It's another channel for potential clients to find you.

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
6. Mention the inquiry benefit: when someone searches for rehab and their conditions match the center's services, they can send an inquiry directly to the center through our platform. This brings potential clients to them.

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

Contact person: ${params.contactPerson || "Unknown (use generic greeting like 'Hi there')"}

DEEP RESEARCH FINDINGS (from scraping their website — use these to make the email genuinely personal):
- Programs they offer: ${research.programs.join(", ") || "General rehabilitation"}
- Clinical specialties/modalities: ${research.specialties.join(", ") || "Not specified"}
- Who they serve: ${research.target_audience || "General"}
- What they're about: ${research.website_summary}
- What makes them stand out: ${research.unique_selling_points.join("; ")}
- Their brand voice/tone: ${research.tone_analysis}

IMPORTANT — PERSONALIZATION:
- Pick 1-2 SPECIFIC details from the research that show you actually looked at their website
- Reference a specific program name, therapy modality, staff credential, or facility feature
- Match the tone to their brand voice (e.g. if they're warm and holistic, be warm; if clinical and evidence-based, be more professional)
- If a contact person name was found, use their first name in the greeting

RULES:
- DO NOT mention any commission, fees, or costs — this is a free invitation
- NO phone calls — email only, ask them to reply
- We are a NEW platform building a trusted directory of rehab centers
- Joining is FREE — no cost, no strings attached
- Frame it as: we want to help more people find quality care
- Mention blog opportunity naturally: they can publish articles with backlinks to their site + author credit (SEO benefit)
- Mention the inquiry benefit: people searching for rehab who match the center's services can send inquiries directly through our platform — potential clients coming to them
- End with: if interested, reply and we'll send login credentials + walk them through getting their profile to 100% completeness
- Keep it short — 4-5 paragraphs max
- Make it sound like a real person who genuinely spent time learning about their center

Write the email now.`;
}
