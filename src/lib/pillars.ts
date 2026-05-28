// Shared pillar definitions for the 10 /rehab/[condition] pages.
// Used by the content-creator agent (when drafting articles) and the blog
// reader (when picking a contextual assessment CTA per article).
// See CONTENT_STRATEGY.md §3 for the policy.

export type Pillar = { slug: string; title: string; keywords: string[] };

export const PILLAR_DEFS: Pillar[] = [
  // Order matters — first match wins. Put more specific pillars before broader ones
  // (opioid before drug-addiction, eating-disorders before mental-health, etc.).
  { slug: "opioid-addiction", title: "Opioid Addiction Treatment", keywords: ["opioid", "opioids", "heroin", "fentanyl", "oxycodone", "buprenorphine", "methadone", "naltrexone", "mat ", "medication-assisted"] },
  { slug: "prescription-drug-abuse", title: "Prescription Drug Abuse Treatment", keywords: ["prescription", "benzo", "benzodiazepine", "xanax", "valium", "klonopin", "painkiller", "adderall", "stimulant abuse"] },
  { slug: "alcohol-addiction", title: "Alcohol Addiction Treatment", keywords: ["alcohol", "drinking", "aud ", "alcoholic", "alcoholism", "wine", "beer ", "binge drinking"] },
  { slug: "trauma-ptsd", title: "Trauma & PTSD Treatment", keywords: ["trauma", "ptsd", "post-traumatic", "emdr", "aces", "abuse survivor", "complex trauma", "veteran"] },
  { slug: "eating-disorders", title: "Eating Disorder Treatment", keywords: ["eating disorder", "anorexia", "bulimia", "binge eating", "body image", "purging"] },
  { slug: "gambling-addiction", title: "Gambling Addiction Treatment", keywords: ["gambling", "betting", "casino"] },
  { slug: "behavioral-addiction", title: "Behavioral Addiction Treatment", keywords: ["behavioral addiction", "process addiction", "internet addiction", "gaming", "porn", "sex addiction", "shopping addiction", "social media", "technology addiction"] },
  { slug: "dual-diagnosis", title: "Dual Diagnosis Treatment", keywords: ["dual diagnosis", "co-occurring", "co occurring", "comorbid"] },
  { slug: "mental-health", title: "Mental Health Treatment", keywords: ["mental health", "depression", "anxiety", "bipolar", "ocd", "psychiatric", "schizophrenia", "personality disorder"] },
  { slug: "drug-addiction", title: "Drug Addiction Treatment", keywords: ["drug", "cocaine", "methamphetamine", "meth", "ice", "shabu", "ketamine", "mdma", "ecstasy", "cannabis", "marijuana", "kratom"] },
];

/**
 * Infer the target pillar page for a topic/category combination.
 * Returns the matching pillar (slug + title). Falls back to dual-diagnosis
 * (broadest medical scope) when nothing matches.
 */
export function inferPillar(topic: string, category?: string, tags?: string[] | null): { slug: string; title: string } {
  const haystack = `${topic} ${category || ""} ${(tags || []).join(" ")}`.toLowerCase();
  for (const p of PILLAR_DEFS) {
    if (p.keywords.some((kw) => haystack.includes(kw))) {
      return { slug: p.slug, title: p.title };
    }
  }
  return { slug: "dual-diagnosis", title: "Dual Diagnosis Treatment" };
}

/**
 * Short, family-facing CTA copy keyed by pillar slug. Used by the blog
 * reader to swap the generic "Need help finding treatment?" CTA for one
 * that names the specific condition the article covers.
 */
export const PILLAR_CTA_COPY: Record<string, { headline: string; sub: string; ctaLabel: string }> = {
  "opioid-addiction": {
    headline: "Looking for opioid treatment that fits?",
    sub: "Centers vary widely on MAT, detox, and aftercare. The assessment surfaces ones that match.",
    ctaLabel: "Find opioid-specialized centers",
  },
  "prescription-drug-abuse": {
    headline: "Looking for prescription-drug recovery support?",
    sub: "Tapering protocols and dual-diagnosis care vary by center — let us find the right match.",
    ctaLabel: "Find centers experienced with prescription recovery",
  },
  "alcohol-addiction": {
    headline: "Looking for alcohol treatment that actually fits?",
    sub: "Detox needs, setting, and family involvement shape which centers will work for you.",
    ctaLabel: "Find alcohol-specialized centers",
  },
  "trauma-ptsd": {
    headline: "Looking for trauma-informed care?",
    sub: "EMDR, somatic experiencing, complex-trauma programs — not every center offers them. Let&apos;s find ones that do.",
    ctaLabel: "Find trauma-specialized centers",
  },
  "eating-disorders": {
    headline: "Looking for specialized eating-disorder care?",
    sub: "Level of medical supervision, family-based therapy, and step-down support vary significantly.",
    ctaLabel: "Find eating-disorder centers",
  },
  "gambling-addiction": {
    headline: "Looking for gambling-recovery support?",
    sub: "Few centers specialize in process addictions like gambling. Let us point you to the ones that do.",
    ctaLabel: "Find gambling-recovery centers",
  },
  "behavioral-addiction": {
    headline: "Looking for behavioral-addiction support?",
    sub: "Gaming, internet, sex, shopping — process addictions need specialized clinical models.",
    ctaLabel: "Find behavioral-addiction centers",
  },
  "dual-diagnosis": {
    headline: "Looking for integrated dual-diagnosis care?",
    sub: "Centers that treat addiction and mental health together — at the same time — are rarer than they look.",
    ctaLabel: "Find dual-diagnosis-certified centers",
  },
  "mental-health": {
    headline: "Looking for residential mental-health care?",
    sub: "Psychiatric depth, level of care, and family involvement vary widely — the assessment narrows it down.",
    ctaLabel: "Find mental-health-focused centers",
  },
  "drug-addiction": {
    headline: "Looking for drug-addiction treatment that fits?",
    sub: "Detox capability, substance specialization, and aftercare model — we match you to centers that actually fit.",
    ctaLabel: "Find drug-addiction centers",
  },
};

export function getPillarCta(pillarSlug: string) {
  return (
    PILLAR_CTA_COPY[pillarSlug] || {
      headline: "Not sure where to start?",
      sub: "Tell us about the situation and we&apos;ll surface centers that match — privately.",
      ctaLabel: "Start Confidential Assessment",
    }
  );
}
