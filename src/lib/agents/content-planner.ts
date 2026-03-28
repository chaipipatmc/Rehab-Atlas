/**
 * Content Planner Agent
 * Creates a monthly editorial calendar with 2-3 topics per day.
 * Uses Claude AI to plan strategically: topic diversity, SEO trends, seasonal relevance.
 * Admin approves the calendar, then Content Creator writes the articles.
 *
 * Runs on the 25th of each month to plan the next month.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentTask, logAgentAction } from "@/lib/agents/base";
import { isAgentEnabled } from "@/lib/agents/config";
import { logClaudeUsage } from "@/lib/api-usage";

/**
 * Generate a monthly editorial calendar using Claude AI.
 */
export async function planMonthlyCalendar(forceMonth?: string): Promise<{ success: boolean; reason?: string; count?: number }> {
  const enabled = await isAgentEnabled("content_planner");
  if (!enabled) {
    return { success: false, reason: "agent disabled" };
  }

  const admin = createAdminClient();

  // Determine which month to plan
  const now = new Date();
  let targetMonth: Date;
  if (forceMonth) {
    const [y, m] = forceMonth.split("-").map(Number);
    targetMonth = new Date(y, m - 1, 1);
  } else {
    targetMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  const yearMonth = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthName = targetMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Check if calendar already exists for this month
  const startDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1).toISOString().split("T")[0];
  const endDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).toISOString().split("T")[0];

  const { count: existing, error: countError } = await admin
    .from("content_calendar")
    .select("id", { count: "exact", head: true })
    .gte("planned_date", startDate)
    .lte("planned_date", endDate);

  console.log(`Content Planner: checking ${monthName}, existing entries: ${existing}, error: ${countError?.message || "none"}`);

  if (existing && existing > 0) {
    return { success: false, reason: `calendar for ${monthName} already exists (${existing} entries)` };
  }

  // Get existing published articles to avoid repeating topics
  const { data: publishedArticles } = await admin
    .from("pages")
    .select("title")
    .eq("page_type", "blog")
    .in("status", ["draft", "approved", "published"])
    .order("created_at", { ascending: false })
    .limit(50);

  const existingTitles = (publishedArticles || []).map((p) => p.title as string).join("\n");

  // Count weekdays in the target month
  const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
  const weekdays: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), d);
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      weekdays.push(date.toISOString().split("T")[0]);
    }
  }

  console.log(`Content Planner: planning ${monthName} — ${weekdays.length} weekdays, ${weekdays.length * 2}-${weekdays.length * 3} articles`);

  // Use Claude to plan the calendar
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, reason: "ANTHROPIC_API_KEY not set" };
  }

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: `You are a content strategist for Rehab-Atlas, a global rehab center discovery platform. Plan a monthly editorial calendar with 2-3 blog article topics per weekday.

PLANNING STRATEGY:
- Mix categories throughout the month: addiction types, treatment approaches, mental health, recovery guides, practical guides, international treatment, family support
- Start each week with high-impact topics (Mon-Tue) and wind down with lighter content (Thu-Fri)
- Include seasonal/timely hooks where relevant
- Each topic should target specific SEO keywords
- Topics should be diverse — never repeat the same angle twice
- Include some topics that naturally link to rehab center profiles (destination articles, treatment type guides)
- Balance evergreen content (always relevant) with timely pieces

CATEGORIES (use these exact names):
addiction-types, treatment-types, mental-health, recovery-guides, practical-guides, international-treatment, family-support

Return a JSON array. Each element: {"date":"YYYY-MM-DD","topics":[{"topic":"Title","category":"cat","brief":"1 sentence angle","keywords":["kw1","kw2"]}]}

Keep briefs to 1 sentence max. 2 keywords per topic max. 2-3 topics per date. Return ONLY valid JSON, no markdown, no explanation.`,
    messages: [
      {
        role: "user",
        content: `Plan the editorial calendar for ${monthName}.

Weekdays to plan for:
${weekdays.join("\n")}

AVOID these topics (already written):
${existingTitles || "None yet"}

Create 2-3 unique topics per weekday. Return the JSON array now.`,
      },
    ],
  });

  // Log usage
  await logClaudeUsage(response, "content_planner", "calendar_planning", "claude-sonnet-4-20250514", { month: monthName });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON array — handle markdown code blocks
  let jsonStr = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }
  const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return { success: false, reason: "failed to parse calendar — no JSON array found in response" };
  }

  let calendarDays: Array<{
    date: string;
    topics: Array<{
      topic: string;
      category: string;
      brief: string;
      keywords: string[];
    }>;
  }>;

  try {
    // Clean up common JSON issues: trailing commas, comments
    const cleaned = jsonMatch[0]
      .replace(/,\s*([}\]])/g, "$1")  // Remove trailing commas
      .replace(/\/\/.*$/gm, "");       // Remove line comments
    calendarDays = JSON.parse(cleaned);
  } catch (parseErr) {
    return { success: false, reason: `invalid JSON: ${String(parseErr).slice(0, 100)}`, count: jsonMatch[0].length };
  }

  // Insert all calendar entries
  const entries: Array<Record<string, unknown>> = [];
  for (const day of calendarDays) {
    for (const topic of day.topics || []) {
      entries.push({
        planned_date: day.date,
        topic: topic.topic,
        category: topic.category,
        brief: topic.brief,
        keywords: topic.keywords || [],
        status: "planned",
      });
    }
  }

  if (entries.length === 0) {
    return { success: false, reason: "no entries generated from Claude response" };
  }

  const { error } = await admin.from("content_calendar").insert(entries);
  if (error) {
    return { success: false, reason: `database insert failed: ${error.message}` };
  }

  // Create agent task for admin to review/approve the calendar
  await createAgentTask({
    agent_type: "content_planner",
    entity_type: "content_calendar",
    entity_id: yearMonth,
    checklist: {
      month: monthName,
      total_days: calendarDays.length,
      total_topics: entries.length,
      categories: [...new Set(entries.map((e) => e.category as string))],
      sample_topics: entries.slice(0, 5).map((e) => e.topic),
    },
    ai_summary: `Editorial calendar for ${monthName}: ${entries.length} topics across ${calendarDays.length} days. Review and approve at /admin/content-calendar.`,
    ai_recommendation: "approve",
    confidence: 0.9,
  });

  await logAgentAction({
    agent_type: "content_planner",
    action: "calendar_planned",
    details: { month: yearMonth, total_topics: entries.length, days_planned: calendarDays.length },
  });

  console.log(`Content Planner: created ${entries.length} topics for ${monthName}`);
  return { success: true, count: entries.length };
}

/**
 * Approve all planned entries for a month — called when admin approves the calendar.
 */
export async function approveCalendarMonth(yearMonth: string): Promise<number> {
  const admin = createAdminClient();
  const [year, month] = yearMonth.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const { data, error } = await admin
    .from("content_calendar")
    .update({ status: "approved" })
    .eq("status", "planned")
    .gte("planned_date", startDate)
    .lte("planned_date", endDate)
    .select("id");

  if (error) {
    console.error("Approve calendar failed:", error.message);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Get today's approved topics from the calendar (used by Content Creator).
 */
export async function getTodaysTopics(): Promise<Array<{
  id: string;
  topic: string;
  category: string;
  brief: string;
  keywords: string[];
}>> {
  const admin = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await admin
    .from("content_calendar")
    .select("id, topic, category, brief, keywords")
    .eq("planned_date", today)
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  return (data || []).map((d) => ({
    id: d.id as string,
    topic: d.topic as string,
    category: d.category as string,
    brief: (d.brief as string) || "",
    keywords: (d.keywords as string[]) || [],
  }));
}

/**
 * Mark a calendar entry as written and link to the page.
 */
export async function markCalendarWritten(calendarId: string, pageId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("content_calendar")
    .update({ status: "written", page_id: pageId })
    .eq("id", calendarId);
}
