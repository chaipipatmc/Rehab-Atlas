"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  id: string;
  redirectTo?: string;
}

export default function AssessmentDeleteButton({ id, redirectTo }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (
      !confirm(
        "Delete this assessment? This will not delete any linked lead. This cannot be undone."
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/assessments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }));
        throw new Error(error || "Delete failed");
      }
      toast.success("Assessment deleted");
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
      setLoading(false);
    }
  }

  if (redirectTo) {
    return (
      <Button
        variant="outline"
        className="rounded-full text-destructive border-destructive/30 hover:bg-destructive/5"
        onClick={handleDelete}
        disabled={loading}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Delete assessment"
      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
