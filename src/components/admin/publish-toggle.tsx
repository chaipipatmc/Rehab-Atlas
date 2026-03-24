"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

interface PublishToggleProps {
  id: string;
  type: "center" | "page";
  currentStatus: string;
}

export function PublishToggle({ id, type, currentStatus }: PublishToggleProps) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const isPublished = status === "published";

  async function toggle() {
    setLoading(true);
    const newStatus = isPublished ? "draft" : "published";

    try {
      const endpoint = type === "center" ? "/api/admin/centers" : "/api/admin/content";
      const body = type === "center"
        ? { id, center: { status: newStatus } }
        : { id, status: newStatus, published_at: newStatus === "published" ? new Date().toISOString() : null };

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error();

      setStatus(newStatus);
      toast.success(newStatus === "published" ? "Published" : "Unpublished");
    } catch {
      toast.error("Failed to update status");
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isPublished ? "Unpublish" : "Publish"}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${
        isPublished
          ? "text-emerald-600 hover:text-amber-600 hover:bg-amber-50"
          : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
      }`}
    >
      {isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </button>
  );
}
