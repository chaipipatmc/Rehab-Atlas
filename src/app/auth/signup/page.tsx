"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Building2, CheckCircle, ArrowLeft } from "lucide-react";

type AccountType = "user" | "center_partner";

export default function SignupPage() {
  const [step, setStep] = useState<"type" | "form">("type");
  const [accountType, setAccountType] = useState<AccountType>("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [centerName, setCenterName] = useState("");
  const [centerWebsite, setCenterWebsite] = useState("");
  const [partnerMessage, setPartnerMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    // Create user account (always starts as "user" role)
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          account_type_request: accountType,
          center_name: accountType === "center_partner" ? centerName : undefined,
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    // If partner request, update profile with the request info
    if (accountType === "center_partner" && data.user) {
      // Update profile with partner request metadata
      await supabase.from("profiles").update({
        full_name: fullName,
      }).eq("id", data.user.id);

      // Create a partner request entry (stored in admin_notes or a separate mechanism)
      // For now, we'll use a simple approach: insert a lead-like record as a partner request
      await fetch("/api/partner-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: data.user.id,
          email,
          full_name: fullName,
          center_name: centerName,
          center_website: centerWebsite,
          message: partnerMessage,
        }),
      }).catch(() => {});
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-headline-lg font-semibold text-foreground">
            {accountType === "center_partner" ? "Application Received" : "Check Your Email"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {accountType === "center_partner" ? (
              <>
                We&apos;ve created your account and received your center partnership application.
                Our team will review your request and link your account to <strong>{centerName}</strong> within 1-2 business days.
                You&apos;ll receive an email once approved.
              </>
            ) : (
              <>
                We&apos;ve sent a confirmation link to <strong>{email}</strong>.
                Please check your inbox to verify your account.
              </>
            )}
          </p>
          <Button
            variant="outline"
            className="mt-6 rounded-full ghost-border border-0"
            onClick={() => router.push("/auth/login")}
          >
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        {/* Step 1: Choose Account Type */}
        {step === "type" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-headline-lg font-semibold text-foreground">Create Your Account</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                How would you like to use Rehab-Atlas?
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => { setAccountType("user"); setStep("form"); }}
                className="w-full text-left bg-surface-container-lowest rounded-2xl p-6 shadow-ambient hover:shadow-ambient-lg transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
                    <User className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-foreground">I&apos;m Seeking Help</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Looking for treatment centers, want personalized recommendations, or seeking information for yourself or a loved one.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-[10px] bg-surface-container-high rounded-full px-2 py-0.5 text-muted-foreground">Browse Centers</span>
                      <span className="text-[10px] bg-surface-container-high rounded-full px-2 py-0.5 text-muted-foreground">Take Assessment</span>
                      <span className="text-[10px] bg-surface-container-high rounded-full px-2 py-0.5 text-muted-foreground">Submit Inquiries</span>
                      <span className="text-[10px] bg-surface-container-high rounded-full px-2 py-0.5 text-muted-foreground">Save Favorites</span>
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setAccountType("center_partner"); setStep("form"); }}
                className="w-full text-left bg-surface-container-lowest rounded-2xl p-6 shadow-ambient hover:shadow-ambient-lg transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-emerald-50 transition-colors duration-300">
                    <Building2 className="h-5 w-5 text-muted-foreground group-hover:text-emerald-600 transition-colors duration-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-foreground">I Represent a Center</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      You own or manage a rehabilitation center and want to manage your listing on Rehab-Atlas.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-[10px] bg-surface-container-high rounded-full px-2 py-0.5 text-muted-foreground">Manage Listing</span>
                      <span className="text-[10px] bg-surface-container-high rounded-full px-2 py-0.5 text-muted-foreground">Update Photos</span>
                      <span className="text-[10px] bg-surface-container-high rounded-full px-2 py-0.5 text-muted-foreground">Edit Information</span>
                      <span className="text-[10px] bg-surface-container-high rounded-full px-2 py-0.5 text-muted-foreground">Track Changes</span>
                    </div>
                    <p className="text-[10px] text-primary mt-2">Requires verification by our team</p>
                  </div>
                </div>
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:text-primary-dim transition-colors duration-300">
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* Step 2: Registration Form */}
        {step === "form" && (
          <div>
            <button
              onClick={() => setStep("type")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-300 mb-6"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </button>

            <div className="text-center mb-8">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                accountType === "center_partner" ? "bg-emerald-50" : "bg-surface-container-high"
              }`}>
                {accountType === "center_partner"
                  ? <Building2 className="h-5 w-5 text-emerald-600" />
                  : <User className="h-5 w-5 text-muted-foreground" />
                }
              </div>
              <h1 className="text-headline-lg font-semibold text-foreground">
                {accountType === "center_partner" ? "Center Partner Application" : "Create Account"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {accountType === "center_partner"
                  ? "Apply to manage your center on Rehab-Atlas"
                  : "Join Rehab-Atlas to access personalized features"
                }
              </p>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-ambient">
              <form onSubmit={handleSignup} className="space-y-5">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                    className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                  />
                </div>

                {/* Center Partner Fields */}
                {accountType === "center_partner" && (
                  <>
                    <div className="pt-4 border-t border-surface-container">
                      <p className="text-xs uppercase tracking-wider text-emerald-600 font-medium mb-4">Center Information</p>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Center Name *</Label>
                      <Input
                        value={centerName}
                        onChange={(e) => setCenterName(e.target.value)}
                        placeholder="e.g. Serenity Recovery Center"
                        required
                        className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Center Website</Label>
                      <Input
                        value={centerWebsite}
                        onChange={(e) => setCenterWebsite(e.target.value)}
                        placeholder="https://your-center.com"
                        className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your Role &amp; Message</Label>
                      <Textarea
                        value={partnerMessage}
                        onChange={(e) => setPartnerMessage(e.target.value)}
                        placeholder="Tell us about your role at the center and how you'd like to manage your listing..."
                        rows={3}
                        className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                      />
                    </div>
                    <div className="bg-primary/5 rounded-xl p-3">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Our team will verify your affiliation with the center within 1-2 business days.
                        Once approved, your account will be upgraded to Center Partner and linked to your center&apos;s listing.
                      </p>
                    </div>
                  </>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
                >
                  {loading
                    ? "Creating..."
                    : accountType === "center_partner"
                    ? "Submit Application"
                    : "Create Account"
                  }
                </Button>
              </form>
            </div>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:text-primary-dim transition-colors duration-300">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
