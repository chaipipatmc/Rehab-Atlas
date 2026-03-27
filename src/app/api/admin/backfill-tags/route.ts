import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * One-time backfill: assign tags to existing blog articles based on content analysis.
 * POST /api/admin/backfill-tags
 */

const KEYWORD_TAG_MAP: Array<{ keywords: string[]; tag: string }> = [
  { keywords: ["addiction", "addicted", "substance use", "substance abuse", "drug", "alcohol", "opioid", "cocaine", "methamphetamine", "nicotine", "gambling", "marijuana"], tag: "Addiction" },
  { keywords: ["substance", "drug", "alcohol", "opioid", "cocaine", "meth", "heroin", "prescription drug"], tag: "Substance Use" },
  { keywords: ["treatment", "rehab", "rehabilitation", "inpatient", "outpatient", "detox", "program"], tag: "Treatment" },
  { keywords: ["rehabilitation", "rehab center", "rehab facility", "treatment center", "treatment facility"], tag: "Rehabilitation" },
  { keywords: ["mental health", "anxiety", "depression", "ptsd", "bipolar", "psychiatric", "dual diagnosis"], tag: "Mental Health" },
  { keywords: ["wellness", "wellbeing", "well-being", "mindfulness", "meditation", "self-care"], tag: "Wellness" },
  { keywords: ["recovery", "sobriety", "sober", "clean", "abstinence", "12-step", "twelve step"], tag: "Recovery" },
  { keywords: ["sober", "sobriety", "clean time", "abstinence", "maintaining sobriety"], tag: "Sobriety" },
  { keywords: ["family", "families", "loved one", "parent", "child", "spouse", "codepend"], tag: "Family Support" },
  { keywords: ["relationship", "marriage", "partner", "trust", "boundaries"], tag: "Relationships" },
  { keywords: ["relapse", "relapse prevention", "trigger", "coping", "urge"], tag: "Relapse Prevention" },
  { keywords: ["detox", "detoxification", "withdrawal", "withdrawing"], tag: "Detox" },
  { keywords: ["therapy", "therapist", "cbt", "cognitive behavioral", "dbt", "counseling", "psychotherapy"], tag: "Therapy" },
  { keywords: ["insurance", "cost", "afford", "payment", "coverage", "financial"], tag: "Insurance" },
  { keywords: ["dual diagnosis", "co-occurring", "comorbid"], tag: "Dual Diagnosis" },
  { keywords: ["international", "abroad", "overseas", "thailand", "bali", "mexico", "travel"], tag: "International" },
  { keywords: ["medical tourism", "treatment abroad", "rehab abroad"], tag: "Medical Tourism" },
  { keywords: ["guide", "how to", "tips", "steps", "checklist", "what to expect"], tag: "Guides" },
  { keywords: ["career", "job", "employment", "work", "workplace", "professional"], tag: "Career & Work" },
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Get all blog articles
  const { data: articles } = await admin
    .from("pages")
    .select("id, title, content, tags")
    .eq("page_type", "blog");

  if (!articles?.length) return NextResponse.json({ updated: 0 });

  let updated = 0;

  for (const article of articles) {
    const existingTags = (article.tags as string[]) || [];
    if (existingTags.length > 0) continue; // Skip if already tagged

    const text = `${article.title} ${(article.content as string || "")}`.toLowerCase();
    const matchedTags = new Set<string>();

    for (const rule of KEYWORD_TAG_MAP) {
      if (rule.keywords.some((kw) => text.includes(kw))) {
        matchedTags.add(rule.tag);
      }
    }

    // Limit to 3-4 most relevant tags (take first matches which are ordered by priority)
    const tags = Array.from(matchedTags).slice(0, 4);

    if (tags.length > 0) {
      await admin.from("pages").update({ tags }).eq("id", article.id);
      updated++;
    }
  }

  return NextResponse.json({ updated, total: articles.length });
}
