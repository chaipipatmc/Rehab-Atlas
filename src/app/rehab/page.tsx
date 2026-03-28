import Link from "next/link";
import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/shared/json-ld";
import { ArrowRight, Heart, Brain, Pill, Shield, Dices, Utensils, Flame, Puzzle } from "lucide-react";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.vercel.app";

export const metadata: Metadata = {
  title: "Treatment Conditions | Rehab-Atlas",
  description:
    "Explore treatment conditions including alcohol addiction, drug addiction, dual diagnosis, mental health, and more. Find the right rehabilitation center for your specific needs.",
  openGraph: {
    title: "Treatment Conditions | Rehab-Atlas",
    description:
      "Explore treatment conditions including alcohol addiction, drug addiction, dual diagnosis, mental health, and more.",
    url: `${BASE_URL}/rehab`,
  },
};

interface ConditionEntry {
  slug: string;
  title: string;
  shortDescription: string;
  icon: React.ReactNode;
}

const conditions: ConditionEntry[] = [
  {
    slug: "alcohol-addiction",
    title: "Alcohol Addiction",
    shortDescription:
      "Evidence-based treatment programs for alcohol use disorder, from medically supervised detox to long-term recovery support.",
    icon: <Flame className="h-5 w-5" />,
  },
  {
    slug: "drug-addiction",
    title: "Drug Addiction",
    shortDescription:
      "Comprehensive drug rehabilitation programs addressing substance dependency through clinical and holistic approaches.",
    icon: <Pill className="h-5 w-5" />,
  },
  {
    slug: "opioid-addiction",
    title: "Opioid Addiction",
    shortDescription:
      "Specialized opioid treatment including medication-assisted therapy, detox protocols, and relapse prevention strategies.",
    icon: <Pill className="h-5 w-5" />,
  },
  {
    slug: "dual-diagnosis",
    title: "Dual Diagnosis",
    shortDescription:
      "Integrated treatment for co-occurring substance use and mental health disorders, addressing both conditions simultaneously.",
    icon: <Puzzle className="h-5 w-5" />,
  },
  {
    slug: "mental-health",
    title: "Mental Health",
    shortDescription:
      "Residential and outpatient programs for depression, anxiety, bipolar disorder, and other mental health conditions.",
    icon: <Brain className="h-5 w-5" />,
  },
  {
    slug: "gambling-addiction",
    title: "Gambling Addiction",
    shortDescription:
      "Structured recovery programs for compulsive gambling, combining cognitive-behavioral therapy with peer support.",
    icon: <Dices className="h-5 w-5" />,
  },
  {
    slug: "prescription-drug-abuse",
    title: "Prescription Drug Abuse",
    shortDescription:
      "Safe tapering protocols and rehabilitation for dependency on prescription medications including benzodiazepines and stimulants.",
    icon: <Pill className="h-5 w-5" />,
  },
  {
    slug: "eating-disorders",
    title: "Eating Disorders",
    shortDescription:
      "Specialized treatment for anorexia, bulimia, binge eating, and other disordered eating patterns with nutritional rehabilitation.",
    icon: <Utensils className="h-5 w-5" />,
  },
  {
    slug: "trauma-ptsd",
    title: "Trauma & PTSD",
    shortDescription:
      "Trauma-informed care using EMDR, somatic experiencing, and evidence-based therapies for post-traumatic stress disorder.",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    slug: "behavioral-addiction",
    title: "Behavioral Addiction",
    shortDescription:
      "Treatment for process addictions including internet, gaming, sex, and shopping compulsions through behavioral modification.",
    icon: <Heart className="h-5 w-5" />,
  },
];

export default function RehabDirectoryPage() {
  return (
    <div className="bg-surface min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: BASE_URL },
          { name: "Treatment Conditions", url: `${BASE_URL}/rehab` },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1600&q=80&auto=format&fit=crop"
            alt=""
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#45636b]/90 to-[#45636b]/65" />
        </div>
        <div className="relative container mx-auto px-4 sm:px-6 max-w-5xl py-16 md:py-24">
          <span className="text-xs uppercase tracking-widest text-white/70 font-medium">
            Treatment Directory
          </span>
          <h1 className="mt-3 text-3xl md:text-4xl font-serif font-semibold text-white leading-tight">
            Find Treatment by Condition
          </h1>
          <p className="mt-4 text-sm md:text-base text-white/70 max-w-lg leading-relaxed">
            Explore specialized rehabilitation programs tailored to specific
            conditions. Each path to recovery is unique — discover centers that
            understand yours.
          </p>
        </div>
      </section>

      {/* Conditions Grid */}
      <div className="container mx-auto px-4 sm:px-6 py-10 md:py-16 max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {conditions.map((condition) => (
            <Link
              key={condition.slug}
              href={`/rehab/${condition.slug}`}
              className="group bg-surface-container-lowest rounded-2xl p-6 shadow-ambient hover:shadow-ambient-lg transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  {condition.icon}
                </div>
                <h2 className="font-serif text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                  {condition.title}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {condition.shortDescription}
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                View centers <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 md:mt-16 text-center bg-surface-container-low rounded-2xl p-8 md:p-10 ghost-border">
          <h2 className="text-headline-sm md:text-headline-md font-semibold text-foreground">
            Not sure where to start?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Take our confidential assessment to receive personalized treatment
            recommendations.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/assessment"
              className="inline-flex items-center justify-center rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300 px-6 py-2.5 text-sm font-medium"
            >
              Take Assessment
            </Link>
            <Link
              href="/centers"
              className="inline-flex items-center justify-center rounded-full ghost-border border-0 bg-surface-container-lowest text-foreground hover:bg-surface-container transition-colors duration-300 px-6 py-2.5 text-sm font-medium"
            >
              Browse All Centers
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
