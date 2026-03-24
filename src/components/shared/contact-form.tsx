"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2 } from "lucide-react";

const SUBJECTS = [
  { value: "general", label: "General Inquiry" },
  { value: "treatment", label: "Treatment Question" },
  { value: "partnership", label: "Partnership" },
  { value: "media", label: "Media" },
];

interface FormState {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  subject: "general",
  message: "",
};

export function ContactForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setStatus("success");
      setForm(EMPTY);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mb-6">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-headline-sm font-editorial text-foreground mb-3">
          Message Received
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
          Thank you for reaching out. A member of our specialist team will respond
          within 2–4 business hours. All communications are kept strictly confidential.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-xs text-primary hover:text-primary-dim transition-colors underline underline-offset-4"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name + Email row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-medium text-foreground tracking-wide">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            placeholder="Your name"
            className="h-11 rounded-xl bg-surface-container-lowest border-surface-container-high focus-visible:border-primary focus-visible:ring-primary/20 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium text-foreground tracking-wide">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className="h-11 rounded-xl bg-surface-container-lowest border-surface-container-high focus-visible:border-primary focus-visible:ring-primary/20 text-sm"
          />
        </div>
      </div>

      {/* Phone + Subject row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-medium text-foreground tracking-wide">
            Phone Number
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="+1 (555) 000-0000"
            className="h-11 rounded-xl bg-surface-container-lowest border-surface-container-high focus-visible:border-primary focus-visible:ring-primary/20 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subject" className="text-xs font-medium text-foreground tracking-wide">
            Subject <span className="text-destructive">*</span>
          </Label>
          <select
            id="subject"
            name="subject"
            required
            value={form.subject}
            onChange={handleChange}
            className="h-11 w-full rounded-xl border border-surface-container-high bg-surface-container-lowest px-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20 transition-colors"
          >
            {SUBJECTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <Label htmlFor="message" className="text-xs font-medium text-foreground tracking-wide">
          Message <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="message"
          name="message"
          required
          value={form.message}
          onChange={handleChange}
          placeholder="How can we help you? Please share as much or as little as you are comfortable with..."
          rows={5}
          className="min-h-[140px] rounded-xl bg-surface-container-lowest border-surface-container-high focus-visible:border-primary focus-visible:ring-primary/20 text-sm resize-none"
        />
      </div>

      {/* Privacy note */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        By submitting this form, you agree to our{" "}
        <a href="/pages/privacy-policy" className="text-primary hover:underline">
          Privacy Policy
        </a>
        . All information is held in strict confidence and will never be shared
        without your explicit consent.
      </p>

      {/* Error */}
      {status === "error" && (
        <p className="text-xs text-destructive bg-destructive/8 rounded-xl px-4 py-3">
          {errorMsg}
        </p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={status === "loading"}
        className="w-full h-12 rounded-full gradient-primary text-white font-medium text-sm tracking-wide transition-all duration-300 hover:opacity-90 hover:shadow-ambient disabled:opacity-50"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Send Message"
        )}
      </Button>
    </form>
  );
}
