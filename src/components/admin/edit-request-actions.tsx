"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

interface EditRequestActionsProps {
  requestId: string;
  centerId: string;
  changes: Record<string, unknown>;
}

export function EditRequestActions({
  requestId,
}: EditRequestActionsProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);

  async function handleAction(action: "approved" | "rejected") {
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/edit-requests/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          action,
          note: note || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update request");
        return;
      }

      toast.success(
        action === "approved"
          ? "Changes approved, applied, and partner notified"
          : "Request rejected and partner notified"
      );
      router.refresh();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Review note (shared with the partner if you reject)..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => handleAction("approved")}
          disabled={processing}
        >
          <Check className="mr-1 h-4 w-4" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleAction("rejected")}
          disabled={processing}
        >
          <X className="mr-1 h-4 w-4" />
          Reject
        </Button>
      </div>
    </div>
  );
}
