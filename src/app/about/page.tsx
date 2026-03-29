import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Shield, Search, Heart, Users, BookOpen, CheckCircle,
  ArrowRight, Eye, Pencil, Brain, Globe,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Rehab-Atlas — Our Mission & Editorial Process",
  description: "Learn about Rehab-Atlas, our editorial process, review board, and commitment to connecting individuals with world-class rehabilitation centers.",
};

export default function AboutPage() {
  return (
    <div className="bg-surface min-h-screen">
      {/* Hero with background image */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1600&q=80&auto=format&fit=crop"
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#45636b]/80 via-[#45636b]/70 to-[#45636b]/90" />
        </div>
        <div className="relative container mx-auto px-4 sm:px-6 max-w-4xl text-center py-20 md:py-32">
          <p className="text-xs uppercase tracking-widest text-white/70 font-medium mb-4">About Rehab-Atlas</p>
          <h1 className="text-3xl md:text-5xl font-serif font-semibold text-white leading-tight">
            A Digital Sanctuary <br className="hidden sm:block" />
            <em className="italic text-white/90">for Recovery</em>
          </h1>
          <p className="mt-6 text-base text-white/70 max-w-xl mx-auto leading-relaxed">
            Rehab-Atlas was founded on a simple belief: finding the right treatment center
            shouldn&apos;t be overwhelming. We act as a discreet bridge between individuals
            seeking help and the world&apos;s most distinguished recovery centers.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-headline-lg font-semibold text-foreground">Our Mission</h2>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Addiction and mental health challenges affect millions worldwide. Yet navigating
                the treatment landscape remains fragmented, confusing, and often lacking in transparency.
              </p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Rehab-Atlas exists to change this. We curate, verify, and present treatment centers
                with the same rigor and discretion you&apos;d expect from a premium healthcare concierge —
                but accessible to everyone.
              </p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                We are <strong className="text-foreground">independent</strong>. We do not own or operate
                any treatment facilities. Our recommendations are based on clinical merit, not financial
                relationships.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { icon: Shield, title: "Privacy First", desc: "Your inquiry is confidential. We never share your data without explicit consent." },
                { icon: Globe, title: "Global Network", desc: "Access to vetted treatment centers across multiple countries and specializations." },
                { icon: Heart, title: "Compassion-Driven", desc: "Every interaction is guided by empathy, discretion, and genuine care." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 bg-surface-container-lowest rounded-xl p-5 shadow-ambient">
                  <item.icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Founder Story */}
      <section className="py-16 md:py-20 bg-surface-bright">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <div className="bg-surface-container-lowest rounded-2xl p-8 md:p-10 shadow-ambient">
            <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">Why I Built This</p>
            <h2 className="text-headline-md font-serif font-semibold text-foreground">A Personal Note from Our Founder</h2>
            <div className="mt-5 space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                When someone close to me needed help with addiction, I realized how broken the search process was. There were hundreds of rehab centers online, but no way to tell which ones were legitimate, which ones actually helped people, and which ones were just marketing. The confusion and urgency made a difficult time even harder.
              </p>
              <p>
                That experience stayed with me. I started Rehab-Atlas because I believe that when someone finally reaches out for help — often one of the hardest decisions of their life — they deserve a clear, honest, and compassionate guide. Not a sales funnel.
              </p>
              <p>
                We are a small, early-stage team. We do not pretend to have all the answers, but we are committed to building something genuinely useful: a platform where quality centers are easy to find, where information is transparent, and where every person who reaches out is treated with dignity.
              </p>
              <p>
                If Rehab-Atlas can help even one person find the right center at the right time, then this work is worth it.
              </p>
            </div>
            <p className="mt-6 text-sm font-semibold text-foreground">
              Chaipipat M.
            </p>
            <p className="text-xs text-muted-foreground">Founder, Rehab-Atlas</p>
          </div>
        </div>
      </section>

      {/* Image break */}
      <section className="relative h-64 md:h-80 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1600&q=80&auto=format&fit=crop"
          alt="Team collaboration"
          className="w-full h-full object-cover object-center"
          fill
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#45636b]/60 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <p className="text-white font-serif text-2xl md:text-3xl font-semibold max-w-md leading-snug">
              Guiding you to the right center, with care.
            </p>
          </div>
        </div>
      </section>

      {/* Editorial Process */}
      <section className="py-16 md:py-20 bg-surface-bright">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl text-center">
          <h2 className="text-headline-lg font-semibold text-foreground">How We Vet Every Center</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
            A rigorous, multi-step process that puts your safety and clinical outcomes above everything else.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
            {[
              { icon: Search, title: "Public Records Review", desc: "We review publicly available accreditation records, licensing, and patient advocacy data for every center in our network." },
              { icon: Shield, title: "Zero Affiliate Bias", desc: "Our recommendations prioritize clinical fit above all else. We maintain strict editorial independence in our center evaluations." },
              { icon: CheckCircle, title: "Peer-Reviewed Content", desc: "All educational materials are reviewed by licensed clinicians before publication." },
              { icon: Eye, title: "Continuous Monitoring", desc: "We regularly reassess listed centers to ensure they maintain the standards we expect." },
            ].map((item) => (
              <div key={item.title} className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Review Board */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            <div>
              <h2 className="text-headline-lg font-semibold text-foreground">Quality Assurance</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Three pillars that ensure every recommendation meets our standard.
              </p>
            </div>
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  name: "Clinical Review",
                  title: "Our editorial process references licensed clinical standards to evaluate treatment modalities, staff credentials, and patient outcomes.",
                  icon: CheckCircle,
                },
                {
                  name: "Facility Standards",
                  title: "Accreditation status, safety protocols, and physical environment are assessed against industry benchmarks.",
                  icon: Shield,
                },
                {
                  name: "Patient Advocacy",
                  title: "Former patient feedback and advocacy records are reviewed to ensure ethical, compassionate care.",
                  icon: Heart,
                },
              ].map((item) => (
                <div key={item.name} className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{item.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 bg-surface-bright">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <h2 className="text-headline-lg font-semibold text-foreground text-center">How Rehab-Atlas Works</h2>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-md mx-auto">
            Our process ensures you receive personalized, confidential guidance.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            {[
              {
                step: "01",
                title: "Explore or Assess",
                desc: "Browse our curated directory of verified centers, or take a 2-minute assessment for personalized recommendations.",
                icon: Search,
              },
              {
                step: "02",
                title: "Specialist Review",
                desc: "Our team reviews your needs, evaluates clinical fit, and prepares a shortlist of recommended centers.",
                icon: Brain,
              },
              {
                step: "03",
                title: "Confidential Connection",
                desc: "With your consent, we introduce you to the right center. You maintain control at every step.",
                icon: Users,
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <span className="text-3xl font-editorial font-semibold text-primary/20">{item.step}</span>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mt-2 mb-4">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Image break — nature/path */}
      <section className="relative h-48 md:h-64 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1510797215324-95aa89f43c33?w=1600&q=80&auto=format&fit=crop"
          alt="Path through nature"
          className="w-full h-full object-cover object-center"
          fill
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/20" />
      </section>

      {/* Values */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
          <div className="bg-surface-container-low rounded-2xl p-8 md:p-12 ghost-border">
            <p className="font-editorial italic text-xl md:text-2xl text-foreground leading-relaxed">
              &ldquo;We believe recovery is not just about the destination, but about the dignity
              of the journey from the very first step.&rdquo;
            </p>
            <p className="mt-6 text-xs uppercase tracking-wider text-muted-foreground">
              The Rehab-Atlas Promise
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 gradient-primary">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center text-white">
          <h2 className="text-headline-lg md:text-headline-lg font-semibold">Ready to take the first step?</h2>
          <p className="mt-3 text-sm text-white/70 max-w-md mx-auto">
            Whether you&apos;re seeking help for yourself or a loved one, our team is here to guide you.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button className="rounded-full bg-white text-foreground hover:bg-white/90" asChild>
              <Link href="/assessment">Take Free Assessment</Link>
            </Button>
            <Button variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10" asChild>
              <Link href="/inquiry">
                Contact a Specialist <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
