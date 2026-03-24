import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  ShieldCheck,
  Star,
  Users,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Headphones,
  ArrowRight,
  CheckCircle,
  Percent,
  DollarSign,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner With Rehab-Atlas — Join Our Curated Global Network",
  description:
    "Join Rehab-Atlas as a verified partner center. Receive qualified referrals, build credibility with our trust badge, and reach patients seeking world-class rehabilitation.",
};

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: ClipboardList,
    title: "Apply",
    description:
      "Submit your center details through our partner application. Tell us about your facility, treatment programs, accreditation, and the specialties you offer.",
  },
  {
    step: "02",
    icon: ShieldCheck,
    title: "Verification",
    description:
      "Our clinical team verifies your accreditation, licensing, and facility standards. This process typically takes 5–10 business days.",
  },
  {
    step: "03",
    icon: Star,
    title: "Profile Creation",
    description:
      "We craft a premium listing for your center — complete with editorial ratings, curated photography, program highlights, and a professional narrative.",
  },
  {
    step: "04",
    icon: Users,
    title: "Receive Referrals",
    description:
      "Qualified, pre-screened leads are routed directly to your intake team. Every inquiry is matched to your specialties, ensuring relevance and fit.",
  },
];

const BENEFITS = [
  {
    icon: BadgeCheck,
    title: "Verified Trust Badge",
    description:
      "Display the Rehab-Atlas Verified seal — a recognised mark of clinical credibility that builds immediate trust with prospective patients and their families.",
  },
  {
    icon: Users,
    title: "Qualified Referrals",
    description:
      "Receive pre-screened inquiries matched to your specialties. We filter out unsuitable leads so your intake team focuses on genuine prospects.",
  },
  {
    icon: Star,
    title: "Premium Listing",
    description:
      "A professionally crafted profile with editorial ratings, curated photos, program detail, and prominent placement in our curated directory.",
  },
  {
    icon: BookOpen,
    title: "Content Platform",
    description:
      "Publish articles on Rehab-Atlas with a backlink to your center profile — positioning your team as thought leaders in your specialty.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Track profile views, inquiry volume, and engagement metrics through your partner dashboard. Understand how patients discover your center.",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description:
      "A named account manager from the Rehab-Atlas team — available to help you optimise your listing, respond to queries, and manage your partnership.",
  },
];

const REQUIREMENTS = [
  "Valid accreditation and/or licensing from a recognised national or international body",
  "Professional clinical staff with verifiable credentials and qualifications",
  "Clean facility standards meeting healthcare safety and hygiene benchmarks",
  "Transparent, clearly documented treatment programs with defined clinical modalities",
  "Willingness to provide outcome data and participate in periodic re-evaluation",
];

const FAQ = [
  {
    question: "How long does the verification process take?",
    answer:
      "Verification typically takes 5–10 business days from the date we receive your complete application and supporting documentation. We will keep you informed at each stage.",
  },
  {
    question: "Can we update our listing after it goes live?",
    answer:
      "Yes. Partners can submit updates through the partner portal at any time. All changes are reviewed by our editorial team before publishing to ensure quality and accuracy.",
  },
  {
    question: "How are referrals delivered to us?",
    answer:
      "Qualified leads are sent directly to your designated inquiry email address through a secure notification from Rehab-Atlas. Your account manager can also access leads through the admin dashboard.",
  },
  {
    question: "Are there exclusivity arrangements available?",
    answer:
      "We do not offer geographic exclusivity as standard, but we will discuss your situation during the onboarding process. Commission terms and referral volume targets can be customised per partner.",
  },
  {
    question: "What happens if we want to pause or end the partnership?",
    answer:
      "You may suspend or terminate your partnership at any time with written notice. We will archive your profile and cease referrals within the notice period agreed in your contract.",
  },
];

export default function PartnerJoinPage() {
  return (
    <div className="bg-surface min-h-screen">

      {/* Hero */}
      <section className="bg-surface-bright py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl text-center">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            Center Partnership
          </p>
          <h1 className="text-display-md md:text-display-lg font-semibold text-foreground">
            Partner With{" "}
            <em className="font-editorial italic text-primary">Rehab-Atlas</em>
          </h1>
          <p className="mt-6 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Join a curated global network of distinguished rehabilitation centers.
            We connect your facility with individuals who are actively seeking
            world-class care — matched precisely to your specialties and clinical strengths.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              className="rounded-full px-8 h-12 gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
              asChild
            >
              <Link href="/auth/signup">
                Apply to Join
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className="rounded-full px-8 h-12 ghost-border border-0 hover:bg-surface-container transition-colors duration-300"
              asChild
            >
              <Link href="/centers">View Partner Centers</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-headline-lg font-semibold text-foreground">
              How It Works
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
              A straightforward, transparent process designed around your center&apos;s needs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient flex flex-col"
              >
                <span className="text-3xl font-editorial font-semibold text-primary/20 mb-3">
                  {item.step}
                </span>
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Partner — Benefits Grid */}
      <section className="py-16 md:py-20 bg-surface-bright">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-headline-lg font-semibold text-foreground">
              Why Partner With Us
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
              Rehab-Atlas partners receive far more than a directory listing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient ghost-border"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Models */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-headline-lg font-semibold text-foreground">
              Partnership & Commission
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
              We offer two flexible commission structures, customised to your referral volume and business model.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Percentage-based */}
            <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-ambient ghost-border">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center flex-shrink-0">
                  <Percent className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Percentage-Based
                  </h3>
                  <p className="text-xs text-muted-foreground">Per successful admission</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                An agreed percentage of the first admission fee for each patient successfully
                admitted through a Rehab-Atlas referral. This model aligns our incentives
                directly with your admissions outcomes.
              </p>
              <ul className="mt-5 space-y-2">
                {["Rate agreed during onboarding", "Applied to verified admissions only", "Monthly reconciliation"].map((pt) => (
                  <li key={pt} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>

            {/* Fixed fee */}
            <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-ambient ghost-border">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Fixed Fee
                  </h3>
                  <p className="text-xs text-muted-foreground">Per qualified referral</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A flat rate per qualified lead forwarded to your center. Predictable costs
                make this model well-suited for centers that prefer straightforward, volume-based
                planning without variable commission exposure.
              </p>
              <ul className="mt-5 space-y-2">
                {["Fixed amount per qualified lead", "Transparent invoicing", "No variable cost surprises"].map((pt) => (
                  <li key={pt} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground italic">
            Terms are customised per partner. Contact us to discuss which model suits your center.
          </p>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16 md:py-20 bg-surface-bright">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-headline-lg font-semibold text-foreground">
                What We Look For
              </h2>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Rehab-Atlas maintains a curated network. We are selective by design —
                every center in our directory has been evaluated against consistent
                clinical and operational standards.
              </p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Our verification is ongoing. Partners are periodically reassessed to
                ensure they continue to meet the standards our patients expect.
              </p>
            </div>

            <div className="space-y-3">
              {REQUIREMENTS.map((req, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 bg-surface-container-lowest rounded-xl p-4 shadow-ambient"
                >
                  <CheckCircle className="h-4.5 w-4.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{req}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 gradient-primary">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center text-white">
          <p className="text-xs uppercase tracking-widest text-white/60 mb-4">
            Take the Next Step
          </p>
          <h2 className="text-headline-lg md:text-display-md font-semibold">
            Ready to Join?
          </h2>
          <p className="mt-4 text-sm text-white/70 max-w-lg mx-auto leading-relaxed">
            Create a partner account to begin your application. Our team will reach
            out within 2 business days to guide you through the verification process.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              className="rounded-full px-8 h-12 bg-white text-foreground hover:bg-white/90 transition-opacity duration-300"
              asChild
            >
              <Link href="/auth/signup">
                Create Partner Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className="rounded-full px-8 h-12 border-white/30 text-white hover:bg-white/10 transition-colors duration-300"
              asChild
            >
              <Link href="/pages/contact">Speak With Our Team</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-headline-lg font-semibold text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Common questions from prospective partner centers.
            </p>
          </div>

          <div className="space-y-4">
            {FAQ.map((item) => (
              <div
                key={item.question}
                className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient ghost-border"
              >
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  {item.question}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground">
              Have a question not answered here?{" "}
              <Link
                href="/pages/contact"
                className="text-primary hover:text-primary-dim underline underline-offset-4 transition-colors duration-300"
              >
                Contact our partnership team
              </Link>
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
