"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

interface CardSaveButtonProps {
  centerId: string;
}

/**
 * Compact save toggle for directory cards. Cards render on cached/ISR pages,
 * so the true saved state isn't known at render time — the button starts
 * neutral and reflects the authoritative state returned by the toggle API.
 * Anonymous users are routed to login (mirrors SaveButton on the profile).
 */
export function CardSaveButton({ centerId }: CardSaveButtonProps) {
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        const res = await fetch("/api/saved-centers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ center_id: centerId }),
        });
        if (res.status === 401) {
          router.push(
            `/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
          );
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setSaved(Boolean(data.saved));
        }
      } catch {
        // best-effort — leave state unchanged
      }
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      aria-label={saved ? "Unsave center" : "Save center"}
      title={saved ? "Saved to your list" : "Save for later"}
      className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors duration-300 disabled:opacity-50"
    >
      <Heart
        className={`h-3.5 w-3.5 transition-colors duration-300 ${
          saved ? "fill-rose-500 text-rose-500" : "text-muted-foreground"
        }`}
      />
    </button>
  );
}
