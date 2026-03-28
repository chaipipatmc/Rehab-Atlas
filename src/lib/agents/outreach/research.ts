/**
 * Agent 1 — Research & Outreach ("Sarah")
 * Researches center websites, drafts personalized outreach emails.
 * Creates agent_task requiring super admin approval before sending.
 */

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentTask, logAgentAction } from "@/lib/agents/base";
import { analyzeWithClaude } from "@/lib/agents/claude";
import { sendEmail } from "./gmail";
import {
  generateInitialOutreach,
  getOutreachSystemPrompt,
  getOutreachUserPrompt,
} from "./templates/outreach-email";
import type { CenterResearch, OutreachPipeline } from "@/types/agent";

const PERSONA = process.env.OUTREACH_PERSONA_NAME || "Sarah";

// --- Zod schemas for Claude responses ---

const researchSchema = z.object({
  programs: z.array(z.string()),
  specialties: z.array(z.string()),
  target_audience: z.string(),
  website_summary: z.string(),
  unique_selling_points: z.array(z.string()),
  contact_person_name: z.string().nullable(),
  tone_analysis: z.string(),
});

const emailDraftSchema = z.object({
  subject: z.string(),
  body_text: z.string(),
  personalization_points: z.array(z.string()),
});

/**
 * Research a center's website and store findings.
 */
export async function researchCenter(centerId: string): Promise<CenterResearch | null> {
  const admin = createAdminClient();

  // Get center info
  const { data: center } = await admin
    .from("centers")
    .select("id, name, website_url, email, country, city, description, treatment_focus, services, conditions")
    .eq("id", centerId)
    .single();

  if (!center) {
    console.error(`Center ${centerId} not found`);
    return null;
  }

  // Update pipeline stage
  await admin
    .from("outreach_pipeline")
    .update({ stage: "researching" })
    .eq("center_id", centerId);

  // Deep-scrape: fetch homepage + discover and scrape key subpages
  let websiteContent = "";
  if (center.website_url) {
    const baseUrl = center.website_url.replace(/\/$/, "");
    const UA = "Mozilla/5.0 (compatible; Rehab-Atlas-Bot/1.0)";

    async function fetchPage(url: string): Promise<{ text: string; html: string }> {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": UA },
          redirect: "follow",
        });
        if (!res.ok) return { text: "", html: "" };
        const html = await res.text();
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<nav[\s\S]*?<\/nav>/gi, "")
          .replace(/<footer[\s\S]*?<\/footer>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return { text, html };
      } catch {
        return { text: "", html: "" };
      }
    }

    function extractLinks(html: string, base: string): string[] {
      const linkRegex = /href=["']([^"']+)["']/gi;
      const links = new Set<string>();
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1].toLowerCase();
        // Only internal links to key pages
        if (href.startsWith("http") && !href.includes(new URL(base).hostname)) continue;
        links.add(href);
      }
      return Array.from(links);
    }

    // Priority subpages to look for
    const subpagePatterns = [
      /about/i, /team/i, /staff/i, /our-team/i, /therapists/i, /clinicians/i,
      /programs?/i, /treatment/i, /services/i, /therapies/i,
      /contact/i, /admissions/i, /get-help/i,
      /approach/i, /method/i, /philosophy/i,
      /facility/i, /campus/i, /gallery/i,
      /specialties/i, /conditions/i,
      /faq/i, /pricing/i, /insurance/i,
    ];

    try {
      // 1. Fetch homepage
      const home = await fetchPage(baseUrl);
      const sections: string[] = [];
      if (home.text) sections.push(`[HOMEPAGE]\n${home.text.slice(0, 3000)}`);

      // 2. Discover subpage links from homepage
      const allLinks = extractLinks(home.html, baseUrl);
      const targetPages: string[] = [];

      for (const link of allLinks) {
        if (targetPages.length >= 5) break; // Max 5 subpages
        const normalizedLink = link.startsWith("/") ? `${baseUrl}${link}` : link;
        if (subpagePatterns.some(p => p.test(link)) && !targetPages.includes(normalizedLink)) {
          targetPages.push(normalizedLink);
        }
      }

      // 3. Fetch subpages in parallel (max 5)
      const subResults = await Promise.all(
        targetPages.map(async (url) => {
          const page = await fetchPage(url);
          const pageName = url.replace(baseUrl, "").replace(/^\//, "") || "page";
          return { pageName, text: page.text };
        })
      );

      for (const sub of subResults) {
        if (sub.text) {
          sections.push(`[${sub.pageName.toUpperCase()}]\n${sub.text.slice(0, 2000)}`);
        }
      }

      // Combine all sections (limit total to 10000 chars for Claude)
      websiteContent = sections.join("\n\n").slice(0, 10000);

      console.log(`Research: scraped ${1 + subResults.filter(s => s.text).length} pages for ${center.name} (${websiteContent.length} chars)`);
    } catch {
      console.warn(`Could not fetch website for ${center.name}: ${center.website_url}`);
    }
  }

  // Use Claude to analyze the center with deep research data
  const research = await analyzeWithClaude<CenterResearch>({
    systemPrompt: `You are a research analyst for Rehab-Atlas. You are given scraped content from a rehab center's website — often multiple pages (homepage, about, team, programs, etc.). Your job is to extract specific, accurate details. Do NOT invent or assume information not present in the data. If something is not found, say so. Return valid JSON.`,
    userPrompt: `Analyze this rehabilitation center in detail:

Name: ${center.name}
Country: ${center.country || "Unknown"}
City: ${center.city || "Unknown"}
Description: ${center.description || "Not available"}
Treatment focus: ${(center.treatment_focus as string[])?.join(", ") || "Not specified"}
Services: ${(center.services as string[])?.join(", ") || "Not specified"}
Conditions: ${(center.conditions as string[])?.join(", ") || "Not specified"}
Website URL: ${center.website_url || "None"}

Website content (scraped from multiple pages):
${websiteContent || "Could not fetch website content"}

Extract the following into a JSON object:
- programs: list of specific treatment programs (e.g. "28-day residential", "outpatient CBT", "12-step immersion") — be specific, not generic
- specialties: clinical specialties and modalities (e.g. "EMDR", "DBT", "equine therapy", "art therapy") — only what's actually mentioned
- target_audience: who they primarily serve (e.g. "adults 18+", "executives", "young adults", "families")
- website_summary: 2-3 sentence factual summary of what the center is and what makes them distinctive
- unique_selling_points: 3-5 specific things that set them apart (location, approach, staff credentials, facilities, success rates, etc.) — only things actually mentioned on their site
- contact_person_name: name of director, founder, admissions contact, or key staff member if found (null if not found)
- tone_analysis: their brand voice (e.g. "warm and compassionate", "clinical and evidence-focused", "luxury and exclusive", "community-oriented")`,
    responseSchema: researchSchema,
    maxTokens: 800,
    agentType: "outreach_research",
    operation: "center_research",
  });

  // Fallback if Claude is unavailable
  const finalResearch: CenterResearch = research || {
    programs: (center.treatment_focus as string[]) || [],
    specialties: (center.services as string[]) || [],
    target_audience: "Adults seeking rehabilitation",
    website_summary: center.description || `${center.name} is a rehabilitation center in ${center.city || center.country || "an international location"}.`,
    unique_selling_points: ["Established center with experienced team"],
    contact_person_name: null,
    tone_analysis: "professional",
  };

  // Store research data
  await admin
    .from("outreach_pipeline")
    .update({
      research_data: finalResearch as unknown as Record<string, unknown>,
      research_completed_at: new Date().toISOString(),
      stage: "research_complete",
    })
    .eq("center_id", centerId);

  await logAgentAction({
    agent_type: "outreach_research",
    action: "research_completed",
    details: { center_id: centerId, center_name: center.name },
  });

  return finalResearch;
}

/**
 * Draft a personalized outreach email for a center.
 * Creates an agent_task requiring super admin approval.
 */
export async function draftOutreachEmail(centerId: string): Promise<boolean> {
  const admin = createAdminClient();

  // Get pipeline entry with research data
  const { data: pipeline } = await admin
    .from("outreach_pipeline")
    .select("*")
    .eq("center_id", centerId)
    .single();

  if (!pipeline || !pipeline.research_data) {
    console.error(`No research data for center ${centerId}`);
    return false;
  }

  const pipelineData = pipeline as unknown as OutreachPipeline;
  const research = pipelineData.research_data as CenterResearch;

  // Get center email
  const { data: center } = await admin
    .from("centers")
    .select("name, email, inquiry_email")
    .eq("id", centerId)
    .single();

  if (!center?.email && !center?.inquiry_email) {
    console.error(`No email address for center ${centerId}`);
    return false;
  }

  const toEmail = center.email || center.inquiry_email;

  // Try Claude for personalized email
  const aiDraft = await analyzeWithClaude<{ subject: string; body_text: string; personalization_points: string[] }>({
    systemPrompt: getOutreachSystemPrompt(PERSONA),
    userPrompt: getOutreachUserPrompt({
      centerName: center.name,
      contactPerson: research.contact_person_name,
      research,
    }),
    responseSchema: emailDraftSchema,
    maxTokens: 1000,
    agentType: "outreach_research",
    operation: "email_draft",
  });

  // Fallback to template
  const draft = aiDraft
    ? { subject: aiDraft.subject, bodyText: aiDraft.body_text }
    : generateInitialOutreach({
        centerName: center.name,
        contactPerson: research.contact_person_name,
        research,
      });

  // Update pipeline stage
  await admin
    .from("outreach_pipeline")
    .update({ stage: "outreach_drafted", outreach_persona: PERSONA })
    .eq("center_id", centerId);

  // Create agent task for super admin approval
  const task = await createAgentTask({
    agent_type: "outreach_research",
    entity_type: "outreach_pipeline",
    entity_id: pipeline.id as string,
    checklist: {
      center_name: center.name,
      to_email: toEmail,
      subject: draft.subject,
      body_text: draft.bodyText,
      persona: PERSONA,
      personalization_points: aiDraft?.personalization_points || [],
    },
    ai_summary: `Outreach email drafted for ${center.name} (${toEmail}). Subject: "${draft.subject}"`,
    ai_recommendation: "approve",
    confidence: aiDraft ? 0.85 : 0.7,
  });

  if (task) {
    await logAgentAction({
      agent_type: "outreach_research",
      task_id: task.id,
      action: "outreach_drafted",
      details: { center_id: centerId, center_name: center.name, subject: draft.subject },
    });
  }

  return !!task;
}

/**
 * Execute approved outreach: send the email via Gmail.
 * Called when super admin approves the agent_task.
 */
export async function sendApprovedOutreach(
  pipelineId: string,
  emailData: { to_email: string; subject: string; body_text: string }
): Promise<boolean> {
  const admin = createAdminClient();

  // Get pipeline
  const { data: pipeline } = await admin
    .from("outreach_pipeline")
    .select("id, center_id")
    .eq("id", pipelineId)
    .single();

  if (!pipeline) return false;

  // Send via Gmail
  const result = await sendEmail({
    to: emailData.to_email,
    subject: emailData.subject,
    bodyText: emailData.body_text,
  });

  const now = new Date().toISOString();

  // Calculate first follow-up date (3 days from now)
  const nextFollowUp = new Date();
  nextFollowUp.setDate(nextFollowUp.getDate() + 3);

  // Update pipeline
  await admin
    .from("outreach_pipeline")
    .update({
      stage: "outreach_sent",
      outreach_email_id: result?.messageId || null,
      outreach_thread_id: result?.threadId || null,
      outreach_sent_at: now,
      next_follow_up_at: nextFollowUp.toISOString(),
    })
    .eq("id", pipelineId);

  // Log the email
  await admin.from("outreach_emails").insert({
    pipeline_id: pipelineId,
    center_id: pipeline.center_id,
    direction: "outbound",
    gmail_message_id: result?.messageId || null,
    gmail_thread_id: result?.threadId || null,
    from_email: process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com",
    to_email: emailData.to_email,
    subject: emailData.subject,
    body_text: emailData.body_text,
    email_type: "initial_outreach",
  });

  await logAgentAction({
    agent_type: "outreach_research",
    action: "outreach_sent",
    details: {
      pipeline_id: pipelineId,
      center_id: pipeline.center_id,
      gmail_sent: !!result,
    },
  });

  return true;
}

/**
 * Full pipeline: research + draft for a center.
 * Called by the orchestrator or manually from dashboard.
 */
export async function processResearchAndDraft(centerId: string): Promise<boolean> {
  const research = await researchCenter(centerId);
  if (!research) return false;

  return draftOutreachEmail(centerId);
}
