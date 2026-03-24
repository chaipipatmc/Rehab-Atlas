import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { InquiryForm } from "@/components/leads/inquiry-form";
import { Shield, Users, Eye } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit a Confidential Inquiry",
  description:
    "Submit an inquiry to Rehab-Atlas. Our team will review your needs and connect you with suitable treatment centers.",
};

interface PageProps {
  searchParams: Promise<{ center?: string }>;
}

async function InquiryFormLoader({ centerId }: { centerId?: string }) {
  let centerName: string | undefined;

  if (centerId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("centers")
      .select("name")
      .eq("id", centerId)
      .single();
    centerName = data?.name;
  }

  return <InquiryForm centerId={centerId} centerName={centerName} />;
}

export default async function InquiryPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="bg-surface min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1516302752625-fcc3c50ae61f?w=1600&q=80&auto=format&fit=crop"
            alt=""
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#45636b]/80 to-[#45636b]/90" />
        </div>
        <div className="relative container mx-auto px-4 sm:px-6 max-w-4xl py-14 md:py-20 text-center">
          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-white leading-tight">
            Submit a Confidential Inquiry
          </h1>
          <p className="mt-4 text-sm md:text-base text-white/70 max-w-lg mx-auto leading-relaxed">
            Your journey toward recovery begins with a secure, discreet conversation. Rehab-Atlas will review your needs before connecting you.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 max-w-6xl mx-auto">
          {/* Form Section */}
          <div className="lg:col-span-2">

            <div className="mt-8">
              <Suspense fallback={<div className="h-96 animate-pulse bg-surface-container rounded-2xl" />}>
                <InquiryFormLoader centerId={params.center} />
              </Suspense>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Privacy First */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Privacy First</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your inquiry is encrypted using industry-leading protocols. Information is only shared with specialized medical recovery staff at the selected treatment center under strict confidentiality agreements.
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  HIPAA Compliant Infrastructure
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  256-bit AES Encryption
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  Anonymous Routing Available
                </p>
              </div>
            </div>

            {/* Why contact us first? */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Why contact us first?
              </h3>
              <div className="space-y-4">
                {[
                  {
                    icon: Users,
                    title: "Expert Vetting",
                    desc: "Our specialists evaluate over 200+ clinical markers to instantly match you to the center precisely for your recovery.",
                  },
                  {
                    icon: Shield,
                    title: "Advocacy & Support",
                    desc: "We negotiate and advocate on your behalf during the intake process, ensuring transparency in costs and treatment plans.",
                  },
                  {
                    icon: Eye,
                    title: "Pre-Intake Review",
                    desc: "Our clinical team carefully ensures your assessment is completed to deliver a more comprehensive treatment path.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <item.icon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quote */}
            <div className="bg-surface-container-low rounded-2xl p-6 ghost-border">
              <p className="font-editorial italic text-sm text-foreground leading-relaxed">
                &ldquo;Recovery is not just about the destination, but about the dignity of the journey from the very first step.&rdquo;
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
