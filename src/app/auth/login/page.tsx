"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If there's an explicit redirect, use it
    if (redirect !== "/") {
      router.push(redirect);
      router.refresh();
      return;
    }

    // Otherwise redirect based on user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", signInData.user.id)
      .single();

    if (profile?.role === "admin") {
      router.push("/admin");
    } else if (profile?.role === "partner") {
      router.push("/partner");
    } else {
      router.push("/account");
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-headline-lg font-semibold text-foreground">Sign In</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access your Rehab-Atlas account
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-ambient">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) { setError("Enter your email first"); return; }
                    setResetLoading(true);
                    setError("");
                    const supabase = createClient();
                    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/auth/callback`,
                    });
                    setResetLoading(false);
                    if (resetError) { setError(resetError.message); }
                    else { setResetSent(true); }
                  }}
                  disabled={resetLoading}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  {resetLoading ? "Sending..." : "Forgot password?"}
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>
            {resetSent && (
              <p className="text-sm text-emerald-600">Password reset link sent to {email}. Check your inbox.</p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-primary hover:text-primary-dim transition-colors duration-300">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
