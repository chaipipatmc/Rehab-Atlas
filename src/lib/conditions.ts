/**
 * Canonical definitions for the 10 treatment-condition pillars.
 *
 * Single source of truth consumed by:
 *  - /rehab/[condition] (pillar pages)
 *  - /rehab-in/[country]/[city] (condition cross-links)
 *  - /rehab-in/[country]/[city]/[condition] (city × condition pages)
 *  - sitemap.ts (which URLs get emitted)
 *
 * `filters` are matched against `centers.treatment_focus` tokens. Because the
 * sitemap and the pages share this list, a URL is only emitted when the page
 * that renders it will actually find ≥1 center.
 */

export interface ConditionDef {
  slug: string;
  /** Full pillar-page H1, e.g. "Alcohol Addiction Treatment" */
  title: string;
  /** Short label for cards/cross-links, e.g. "Alcohol Addiction" */
  shortLabel: string;
  /** Long description used on the pillar page */
  description: string;
  /** Shorter clinical description used on city × condition pages */
  cityDescription: string;
  /** Blog tags used to pull related articles on the pillar page */
  relatedTags: string[];
  /** treatment_focus tokens that count as a match for this condition */
  filters: string[];
  /** Slugs of conceptually related conditions for internal linking */
  related: string[];
}

export const CONDITIONS: Record<string, ConditionDef> = {
  "alcohol-addiction": {
    slug: "alcohol-addiction",
    title: "Alcohol Addiction Treatment",
    shortLabel: "Alcohol Addiction",
    description:
      "Alcohol addiction is one of the most prevalent substance use disorders worldwide. Effective treatment combines medically supervised detoxification with behavioral therapies such as CBT and motivational interviewing. Recovery programs range from intensive inpatient stays to flexible outpatient options, each tailored to the severity of dependence.",
    cityDescription:
      "Alcohol addiction treatment combining medically supervised detox with behavioral therapy. Programs cover assessment, withdrawal management, individual and group therapy, and structured aftercare.",
    relatedTags: ["alcohol", "detox", "addiction", "substance abuse", "recovery"],
    filters: ["alcohol", "alcohol_addiction", "substance_abuse", "detox"],
    related: ["drug-addiction", "prescription-drug-abuse", "dual-diagnosis", "trauma-ptsd"],
  },
  "drug-addiction": {
    slug: "drug-addiction",
    title: "Drug Addiction Treatment",
    shortLabel: "Drug Addiction",
    description:
      "Drug addiction encompasses dependency on illicit substances including cocaine, methamphetamine, heroin, and synthetic drugs. Comprehensive rehabilitation addresses the physical, psychological, and social dimensions of dependency. Treatment typically includes medically managed withdrawal, individual and group counseling, and long-term aftercare planning.",
    cityDescription:
      "Comprehensive drug addiction rehabilitation covering cocaine, methamphetamine, cannabis, and other illicit substances. Includes medically managed withdrawal and long-term recovery planning.",
    relatedTags: ["drugs", "substance abuse", "addiction", "rehabilitation", "recovery"],
    filters: ["drug_addiction", "substance_abuse", "drugs"],
    related: ["alcohol-addiction", "opioid-addiction", "prescription-drug-abuse", "dual-diagnosis"],
  },
  "opioid-addiction": {
    slug: "opioid-addiction",
    title: "Opioid Addiction Treatment",
    shortLabel: "Opioid Addiction",
    description:
      "The opioid crisis demands specialized treatment approaches including medication-assisted therapy (MAT) with buprenorphine, methadone, or naltrexone. Centers specializing in opioid addiction provide safe detox protocols, chronic pain management alternatives, and evidence-based relapse prevention. Early intervention significantly improves long-term outcomes.",
    cityDescription:
      "Specialized opioid addiction programs with medication-assisted treatment (MAT), safe detox protocols, and chronic pain alternatives.",
    relatedTags: ["opioids", "heroin", "fentanyl", "MAT", "detox", "addiction"],
    filters: ["opioid_addiction", "opioids", "substance_abuse", "detox"],
    related: ["prescription-drug-abuse", "drug-addiction", "alcohol-addiction", "dual-diagnosis"],
  },
  "dual-diagnosis": {
    slug: "dual-diagnosis",
    title: "Dual Diagnosis Treatment",
    shortLabel: "Dual Diagnosis",
    description:
      "Dual diagnosis — the co-occurrence of a substance use disorder and a mental health condition — requires integrated treatment that addresses both issues simultaneously. Without treating both conditions, recovery from either becomes significantly harder. Specialized programs employ psychiatrists, therapists, and addiction counselors working as a coordinated care team.",
    cityDescription:
      "Integrated treatment for co-occurring substance use and mental health disorders, delivered by a coordinated psychiatric and addiction care team.",
    relatedTags: ["dual diagnosis", "co-occurring", "mental health", "addiction", "psychiatric"],
    filters: ["dual_diagnosis", "co_occurring", "mental_health"],
    related: ["mental-health", "trauma-ptsd", "alcohol-addiction", "drug-addiction"],
  },
  "mental-health": {
    slug: "mental-health",
    title: "Mental Health Treatment",
    shortLabel: "Mental Health",
    description:
      "Residential and outpatient mental health treatment addresses conditions such as depression, anxiety, bipolar disorder, schizophrenia, and personality disorders. Programs combine psychiatric medication management with evidence-based psychotherapies including CBT, DBT, and EMDR. A supportive therapeutic environment is foundational to lasting mental wellness.",
    cityDescription:
      "Residential and outpatient mental health treatment for depression, anxiety, bipolar disorder, and other psychiatric conditions.",
    relatedTags: ["mental health", "depression", "anxiety", "bipolar", "psychiatric", "therapy"],
    filters: ["mental_health", "depression", "anxiety", "psychiatric"],
    related: ["dual-diagnosis", "trauma-ptsd", "eating-disorders", "behavioral-addiction"],
  },
  "gambling-addiction": {
    slug: "gambling-addiction",
    title: "Gambling Addiction Treatment",
    shortLabel: "Gambling Addiction",
    description:
      "Compulsive gambling is a behavioral addiction that can devastate finances, relationships, and mental health. Treatment centers use cognitive-behavioral therapy to restructure distorted thinking patterns around risk and reward. Programs also address co-occurring conditions like depression and anxiety that frequently accompany problem gambling.",
    cityDescription:
      "Treatment for compulsive gambling using cognitive-behavioral therapy and co-occurring condition support.",
    relatedTags: ["gambling", "behavioral addiction", "compulsive", "addiction"],
    filters: ["gambling", "behavioral_addiction", "gambling_addiction"],
    related: ["behavioral-addiction", "mental-health", "dual-diagnosis", "alcohol-addiction"],
  },
  "prescription-drug-abuse": {
    slug: "prescription-drug-abuse",
    title: "Prescription Drug Abuse Treatment",
    shortLabel: "Prescription Drug Abuse",
    description:
      "Prescription drug abuse involves dependency on medications such as benzodiazepines, opioid painkillers, and stimulants. Because abrupt cessation can be medically dangerous, treatment requires carefully supervised tapering protocols alongside therapeutic support. Rehabilitation centers help patients develop non-pharmacological coping strategies and pain management techniques.",
    cityDescription:
      "Medically supervised tapering and rehabilitation for benzodiazepine, opioid painkiller, and stimulant dependence.",
    relatedTags: ["prescription drugs", "benzodiazepines", "painkillers", "medication", "detox"],
    filters: ["prescription_drug_abuse", "prescription_drugs", "substance_abuse", "detox"],
    related: ["opioid-addiction", "drug-addiction", "alcohol-addiction", "dual-diagnosis"],
  },
  "eating-disorders": {
    slug: "eating-disorders",
    title: "Eating Disorder Treatment",
    shortLabel: "Eating Disorders",
    description:
      "Eating disorders — including anorexia nervosa, bulimia, and binge eating disorder — are serious conditions that affect both physical and mental health. Specialized treatment centers offer nutritional rehabilitation, body image therapy, and structured meal support alongside psychiatric care. Early, comprehensive treatment leads to the best recovery outcomes.",
    cityDescription:
      "Treatment for anorexia, bulimia, and binge eating disorder — nutritional rehabilitation alongside body image and psychiatric therapy.",
    relatedTags: ["eating disorders", "anorexia", "bulimia", "body image", "nutrition"],
    filters: ["eating_disorders", "eating_disorder", "anorexia", "bulimia"],
    related: ["mental-health", "trauma-ptsd", "dual-diagnosis", "behavioral-addiction"],
  },
  "trauma-ptsd": {
    slug: "trauma-ptsd",
    title: "Trauma & PTSD Treatment",
    shortLabel: "Trauma & PTSD",
    description:
      "Trauma-informed care is essential for individuals living with PTSD, complex trauma, or the lingering effects of abuse and adverse experiences. Evidence-based modalities like EMDR, somatic experiencing, and prolonged exposure therapy help process traumatic memories safely. Residential programs provide a secure environment for deep healing work.",
    cityDescription:
      "Trauma-informed care including EMDR, somatic experiencing, and prolonged exposure therapy in a secure residential setting.",
    relatedTags: ["trauma", "PTSD", "EMDR", "abuse", "therapy", "mental health"],
    filters: ["trauma", "ptsd", "trauma_ptsd"],
    related: ["mental-health", "dual-diagnosis", "eating-disorders", "alcohol-addiction"],
  },
  "behavioral-addiction": {
    slug: "behavioral-addiction",
    title: "Behavioral Addiction Treatment",
    shortLabel: "Behavioral Addiction",
    description:
      "Behavioral or process addictions — such as internet, gaming, sex, and shopping compulsions — share neurological pathways with substance addictions. Treatment focuses on identifying triggers, restructuring compulsive behaviors, and building healthier reward systems. Centers offering behavioral addiction programs integrate individual therapy, group work, and digital wellness strategies.",
    cityDescription:
      "Treatment for internet, gaming, sex, and shopping compulsions with trigger identification and reward-system restructuring.",
    relatedTags: ["behavioral addiction", "internet addiction", "gaming", "compulsive", "process addiction"],
    filters: ["behavioral_addiction", "process_addiction", "internet_addiction"],
    related: ["gambling-addiction", "mental-health", "eating-disorders", "dual-diagnosis"],
  },
};

export const CONDITION_SLUGS = Object.keys(CONDITIONS);

export const CONDITION_LIST: ConditionDef[] = Object.values(CONDITIONS);
