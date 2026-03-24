import Link from "next/link";
import {
  Mail,
  Clock,
  AlertTriangle,
  Shield,
  Lock,
  HeartHandshake,
  ChevronRight,
} from "lucide-react";
import { ContactForm } from "@/components/shared/contact-form";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import type { Metadata } from "next";
import { FAQJsonLd } from "@/components/shared/json-ld";

export const metadata: Metadata = {
  title: "Contact a Specialist — Rehab-Atlas",
  description:
    "Speak confidentially with a Rehab-Atlas specialist. We help you find the right treatment center with care, discretion, and no pressure.",
};

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1920&q=80&auto=format&fit=crop";

const CONTACT_INFO = [
  {
    icon: Mail,
    label: "Email",
    value: "info@rehab-atlas.com",
    sub: "We respond within 2–4 business hours",
  },
  {
    icon: Clock,
    label: "Office Hours",
    value: "Mon – Fri: 8 AM – 8 PM EST",
    sub: "Sat: 9 AM – 5 PM · Sun: Emergency only",
  },
];

const TRUST_ITEMS = [
  {
    icon: Shield,
    title: "Strictly Confidential",
    description:
      "Every conversation is private. Your information is never shared without your explicit consent.",
  },
  {
    icon: Lock,
    title: "HIPAA-Aligned Security",
    description:
      "We voluntarily adopt HIPAA-aligned practices — AES-256 encryption in transit and at rest.",
  },
  {
    icon: HeartHandshake,
    title: "No Pressure, Ever",
    description:
      "Our team provides guidance and information. We never use sales pressure or push you to any specific center.",
  },
];

const FAQS = [
  {
    q: "Will my information be shared with treatment centers?",
    a: "Never without your consent. Rehab-Atlas acts as an intermediary — your details are only shared with a center after you explicitly approve the introduction.",
  },
  {
    q: "How quickly will I hear back?",
    a: "During office hours, most inquiries receive an initial response within 2–4 hours. After hours, we will follow up the next business day.",
  },
  {
    q: "Is this service free?",
    a: "Yes, completely free for individuals seeking treatment. Rehab-Atlas earns a referral fee from centers only when a placement occurs — this never affects the guidance we provide.",
  },
  {
    q: "What if I'm not ready to commit to anything?",
    a: "That's perfectly fine. Many people contact us simply to understand their options. There is no obligation whatsoever.",
  },
  {
    q: "Can I contact you on behalf of someone else?",
    a: "Absolutely. Families and loved ones frequently reach out. We can guide you on how best to support the person in your life who may need help.",
  },
  {
    q: "Do you handle international inquiries?",
    a: "Yes. Rehab-Atlas features centers across multiple countries and we are experienced in helping international clients navigate treatment options abroad.",
  },
];

export default function ContactPage() {
  return (
    <div className="bg-surface min-h-screen">
      <FAQJsonLd
        faqs={FAQS.map((f) => ({ question: f.q, answer: f.a }))}
      />
      {/* ── Hero ── */}
      <section className="relative min-h-[52vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt="Peaceful outdoor wellness setting"
            className="w-full h-full object-cover"
          />
          {/* Gradient: dark at bottom for text legibility, lighter at top */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#2b3437]/80 via-[#2b3437]/30 to-transparent" />
          {/* Teal tint overlay */}
          <div className="absolute inset-0 bg-primary/10" />
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 pb-14 pt-32 max-w-5xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] text-white/70 hover:text-white/90 transition-colors mb-6 group"
          >
            <ChevronRight className="h-3 w-3 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>
          <p className="text-[10px] uppercase tracking-widest text-primary-container mb-3">
            Speak with a Specialist
          </p>
          <h1 className="text-display-md md:text-display-lg font-semibold text-white leading-tight max-w-2xl">
            Your Recovery Journey{" "}
            <em className="font-editorial italic text-primary-container not-italic">
              Begins Here
            </em>
          </h1>
          <p className="mt-4 text-sm md:text-base text-white/75 max-w-xl leading-relaxed">
            Reach out in complete confidence. Our specialists are here to help you
            navigate the path to treatment — without judgment, without pressure.
          </p>
        </div>
      </section>

      {/* ── Main content ── */}
      <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 md:gap-14">
          {/* ── Contact Form ── */}
          <div className="lg:col-span-3">
            <div className="bg-surface-container-lowest rounded-2xl shadow-ambient-lg p-7 md:p-9">
              <h2 className="text-headline-md font-editorial text-foreground mb-1">
                Send Us a Message
              </h2>
              <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
                Fill in the form below and a specialist will reply within 2–4 business hours.
                All responses are kept entirely confidential.
              </p>
              <ContactForm />
            </div>
          </div>

          {/* ── Side Panel ── */}
          <aside className="lg:col-span-2 space-y-6">
            {/* Contact Info Cards */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
              <div className="px-6 py-5 border-b border-surface-container-high">
                <h3 className="text-sm font-semibold text-foreground">Direct Contact</h3>
              </div>
              <div className="divide-y divide-surface-container-high">
                {CONTACT_INFO.map((item) => (
                  <div key={item.label} className="px-6 py-4 flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                        {item.label}
                      </p>
                      <p className="text-sm font-medium text-foreground leading-snug">
                        {item.value}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Notice */}
            <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-5">
              <div className="flex gap-3 items-start">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-900 mb-2">
                    If this is a medical emergency
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed mb-3">
                    Please call <strong>911</strong> immediately or your local emergency number.
                    For crisis support, contact:
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      { name: "SAMHSA Helpline", value: "1-800-662-4357" },
                      { name: "Crisis Text Line", value: "Text HOME to 741741" },
                      { name: "Suicide Prevention", value: "988" },
                    ].map((r) => (
                      <li key={r.name} className="text-[11px] text-amber-900">
                        <span className="font-medium">{r.name}:</span> {r.value}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Trust Items */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-6 space-y-5">
              <h3 className="text-sm font-semibold text-foreground">Our Commitment</h3>
              {TRUST_ITEMS.map((item) => (
                <div key={item.title} className="flex gap-3">
                  <div className="w-7 h-7 rounded-md bg-primary-container flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground mb-0.5">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Inquiry CTA */}
            <div className="rounded-2xl overflow-hidden shadow-ambient">
              <div className="gradient-primary px-6 py-5">
                <p className="text-[10px] uppercase tracking-widest text-white/70 mb-1">
                  Treatment Inquiry
                </p>
                <h3 className="text-sm font-semibold text-white leading-snug mb-2">
                  Looking for a specific center?
                </h3>
                <p className="text-[11px] text-white/75 leading-relaxed mb-4">
                  Use our detailed inquiry form to share your needs and let our
                  specialists find the right match for you.
                </p>
                <Link
                  href="/inquiry"
                  className="inline-flex items-center gap-1.5 bg-white text-primary text-xs font-medium rounded-full px-4 py-2 hover:bg-white/90 transition-colors"
                >
                  Submit an Inquiry
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Quote Section ── */}
      <section className="bg-surface-container py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
          <blockquote className="font-editorial italic text-xl md:text-2xl text-foreground leading-relaxed">
            &ldquo;The first step doesn&apos;t have to be a leap.
            Sometimes it&apos;s just a quiet conversation.&rdquo;
          </blockquote>
          <p className="mt-4 text-xs text-muted-foreground tracking-widest uppercase">
            Rehab-Atlas — A Digital Sanctuary for Recovery
          </p>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <div className="text-center mb-10">
            <p className="text-[10px] uppercase tracking-widest text-primary mb-3">
              Common Questions
            </p>
            <h2 className="text-headline-lg font-editorial text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Everything you need to know before reaching out.
            </p>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
            <Accordion>
              {FAQS.map((faq, i) => (
                <AccordionItem key={i}>
                  <AccordionTrigger className="px-6 py-4 text-sm font-medium text-foreground hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Still have questions?{" "}
            <Link href="/inquiry" className="text-primary hover:underline underline-offset-4">
              Submit a detailed inquiry
            </Link>{" "}
            and we&apos;ll get back to you personally.
          </p>
        </div>
      </section>
    </div>
  );
}
