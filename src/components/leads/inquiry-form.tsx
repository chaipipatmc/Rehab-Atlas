"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WHO_FOR_OPTIONS, AGE_RANGE_OPTIONS, URGENCY_OPTIONS, BUDGET_OPTIONS } from "@/lib/constants";
import { ArrowRight } from "lucide-react";

interface InquiryFormProps {
  centerId?: string;
  centerName?: string;
}

export function InquiryForm({ centerId, centerName }: InquiryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string || undefined,
      country: formData.get("country") as string || undefined,
      who_for: formData.get("who_for") as string || undefined,
      age_range: formData.get("age_range") as string || undefined,
      concern: formData.get("concern") as string,
      urgency: formData.get("urgency") as string || undefined,
      preferred_center_id: centerId || undefined,
      budget: formData.get("budget") as string || undefined,
      message: formData.get("message") as string || undefined,
      consent: formData.get("consent") === "on",
      request_call: formData.get("request_call") === "on",
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to submit inquiry");
        setLoading(false);
        return;
      }

      router.push("/inquiry/success");
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {centerName && (
        <div className="bg-primary/5 rounded-xl p-3">
          <p className="text-sm text-foreground">
            Inquiring about: <strong>{centerName}</strong>
          </p>
        </div>
      )}

      {/* Personal Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">Full Name</Label>
          <Input id="name" name="name" required className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border" />
        </div>
        <div>
          <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
          <Input id="email" name="email" type="email" required className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground">Phone / WhatsApp</Label>
          <Input id="phone" name="phone" className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border" />
        </div>
        <div>
          <Label htmlFor="country" className="text-xs uppercase tracking-wider text-muted-foreground">Country</Label>
          <Input id="country" name="country" className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border" />
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Who needs help?</Label>
          <Select name="who_for">
            <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {WHO_FOR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Age Range</Label>
          <Select name="age_range">
            <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {AGE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="concern" className="text-xs uppercase tracking-wider text-muted-foreground">Primary Concern</Label>
        <Textarea
          id="concern"
          name="concern"
          required
          minLength={10}
          placeholder="Please describe the situation and how we can best support you..."
          className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border min-h-[100px]"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Preference (if any)</Label>
          <Select name="urgency">
            <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
              <SelectValue placeholder="Select urgency..." />
            </SelectTrigger>
            <SelectContent>
              {URGENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Monthly Budget Range</Label>
          <Select name="budget">
            <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
              <SelectValue placeholder="Select range..." />
            </SelectTrigger>
            <SelectContent>
              {BUDGET_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="message" className="text-xs uppercase tracking-wider text-muted-foreground">Specific Message</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="Briefly describe the situation and how we can best support you..."
          className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
          rows={3}
        />
      </div>

      {/* Request Call */}
      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-container-low ghost-border">
        <Checkbox id="request_call" name="request_call" />
        <Label htmlFor="request_call" className="text-sm text-foreground cursor-pointer">
          Request a discreet call from a specialist
        </Label>
      </div>

      {/* Consent */}
      <div className="flex items-start gap-3">
        <Checkbox id="consent" name="consent" required className="mt-0.5" />
        <Label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
          I consent to Rehab-Atlas processing my data according to the{" "}
          <a href="/pages/privacy-policy" className="text-primary underline">Privacy Policy</a>.
          I understand that my information is encrypted and only shared with selected treatment centers under strict confidentiality agreements.
        </Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        className="w-full rounded-full h-12 gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
        disabled={loading}
      >
        {loading ? "Submitting..." : "Submit Inquiry"}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );
}
