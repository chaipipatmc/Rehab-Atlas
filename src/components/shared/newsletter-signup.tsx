"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function NewsletterSignup({ source = "footer" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="text-xs text-emerald-600 font-medium">
        Thank you for subscribing.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        required
        className="flex-1 text-xs bg-surface-container-lowest rounded-full px-3.5 py-2 ghost-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 min-w-0"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="shrink-0 w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white hover:opacity-90 transition-opacity duration-300 disabled:opacity-50"
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
