"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, MapPin } from "lucide-react";
import { toast } from "sonner";

interface ManagedCenter {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
}

interface CenterSwitcherProps {
  currentCenterId: string;
  centers: ManagedCenter[];
}

export function CenterSwitcher({ currentCenterId, centers }: CenterSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const router = useRouter();

  if (centers.length <= 1) return null;

  const current = centers.find((c) => c.id === currentCenterId);

  async function switchCenter(centerId: string) {
    if (centerId === currentCenterId) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      const res = await fetch("/api/partner/switch-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ center_id: centerId }),
      });
      if (!res.ok) throw new Error("Failed to switch");
      const target = centers.find((c) => c.id === centerId);
      toast.success(`Switched to ${target?.name || "center"}`);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to switch center");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {current?.name || "Select Center"}
          </p>
          {current?.city && (
            <p className="text-[10px] text-muted-foreground truncate">
              {[current.city, current.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface-container-lowest rounded-xl shadow-ambient-lg py-1 ghost-border max-h-[300px] overflow-y-auto">
          <p className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
            Switch Center ({centers.length})
          </p>
          {centers.map((c) => (
            <button
              key={c.id}
              onClick={() => switchCenter(c.id)}
              disabled={switching}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface-container transition-colors ${
                c.id === currentCenterId ? "bg-primary/5" : ""
              }`}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {[c.city, c.country].filter(Boolean).join(", ")}
                </p>
              </div>
              {c.id === currentCenterId && (
                <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
