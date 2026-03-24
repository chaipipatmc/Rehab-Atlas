import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, Shield, Lock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inquiry Submitted — Rehab-Atlas",
  description: "Your inquiry has been submitted successfully.",
  robots: { index: false },
};

export default function InquirySuccessPage() {
  return (
    <div className="bg-surface min-h-screen flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center py-16">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>

        <h1 className="text-headline-lg font-semibold text-foreground">
          Thank you. We&apos;ve received your request.
        </h1>

        <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          A Rehab-Atlas specialist is now reviewing your information to ensure the best possible match for your needs. We prioritize discretion and clinical alignment in every step of our process.
        </p>

        {/* Timeline note */}
        <div className="mt-6 inline-flex items-center gap-2 bg-primary/5 rounded-full px-4 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-xs text-foreground">
            You can expect a confidential call or message from our team within 2-4 hours.
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button className="rounded-full px-6 gradient-primary text-white hover:opacity-90 transition-opacity duration-300" asChild>
            <Link href="/contact">
              <Mail className="mr-2 h-4 w-4" />
              Contact Us
            </Link>
          </Button>
          <Button variant="outline" className="rounded-full ghost-border border-0 hover:bg-surface-container transition-colors duration-300" asChild>
            <Link href="/centers">
              Browse More Centers
            </Link>
          </Button>
        </div>

        {/* Trust badges */}
        <div className="mt-10 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            HIPAA Compliant
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            Secure Data
          </span>
        </div>

        {/* Disclaimer */}
        <p className="mt-6 text-[10px] text-muted-foreground/60 max-w-sm mx-auto">
          Your journey to recovery is protected by the highest standards of data privacy and medical confidentiality.
        </p>
      </div>
    </div>
  );
}
