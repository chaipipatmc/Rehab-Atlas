"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

interface SaveButtonProps {
  centerId: string;
  initialSaved: boolean;
}

export function SaveButton({ centerId, initialSaved }: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleToggle() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/saved-centers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ center_id: centerId }),
        });

        if (res.status === 401) {
          router.push(
            `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`
          );
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setSaved(data.saved);
        }
      } catch (err) {
        console.error("Failed to toggle save:", err);
      }
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      aria-label={saved ? "Unsave center" : "Save center"}
      className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-surface-container-low hover:bg-surface-container-high transition-colors duration-300 disabled:opacity-50"
    >
      <Heart
        className={`h-5 w-5 transition-colors duration-300 ${
          saved
            ? "fill-rose-500 text-rose-500"
            : "text-muted-foreground"
        }`}
      />
    </button>
  );
}
