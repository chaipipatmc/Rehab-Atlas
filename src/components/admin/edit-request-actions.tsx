"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  centerId,
  changes,
}: EditRequestActionsProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);

  async function handleAction(action: "approved" | "rejected") {
    setProcessing(true);
    const supabase = createClient();

    // Update request status
    const { error: reqError } = await supabase
      .from("center_edit_requests")
      .update({
        status: action,
        review_note: note || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (reqError) {
      toast.error("Failed to update request");
      setProcessing(false);
      return;
    }

    // If approved, apply changes to center
    if (action === "approved") {
      const { error: centerError } = await supabase
        .from("centers")
        .update(changes)
        .eq("id", centerId);

      if (centerError) {
        toast.error("Request approved but failed to apply changes");
        setProcessing(false);
        return;
      }
    }

    toast.success(action === "approved" ? "Changes approved and applied" : "Request rejected");
    router.refresh();
    setProcessing(false);
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Review note (optional)..."
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
