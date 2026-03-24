"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUS_OPTIONS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Send, AlertCircle, DollarSign, Percent, FileText, User } from "lucide-react";

interface EligibleCenter {
  id: string;
  name: string;
  inquiry_email: string;
  commission_type: string;
  commission_rate: number | null;
  commission_fixed_amount: number | null;
  commission_currency: string;
  commission_notes: string | null;
  agreement_status: string;
  contract_end: string | null;
  account_manager: string | null;
}

interface LeadActionsProps {
  leadId: string;
  currentStatus: string;
  adminNotes: string;
  preferredCenterId?: string;
  eligibleCenters: EligibleCenter[];
}

function CommissionBadge({ center }: { center: EligibleCenter }) {
  if (center.commission_type === "percentage" && center.commission_rate) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
        <Percent className="h-3 w-3" />
        {center.commission_rate}% commission
      </span>
    );
  }
  if (center.commission_type === "fixed" && center.commission_fixed_amount) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">
        <DollarSign className="h-3 w-3" />
        {center.commission_currency} {center.commission_fixed_amount.toLocaleString()} per client
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">No commission agreement</span>
  );
}

function AgreementStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    active: { label: "Active Agreement", className: "text-emerald-700 bg-emerald-50" },
    pending: { label: "Pending Agreement", className: "text-amber-700 bg-amber-50" },
    expired: { label: "Expired Agreement", className: "text-red-700 bg-red-50" },
    none: { label: "No Agreement", className: "text-muted-foreground bg-surface-container" },
  };
  const c = config[status] || config.none;
  return (
    <span className={`text-[10px] uppercase tracking-wider font-medium rounded-full px-2 py-0.5 ${c.className}`}>
      {c.label}
    </span>
  );
}

export function LeadActions({
  leadId,
  currentStatus,
  adminNotes,
  preferredCenterId,
  eligibleCenters,
}: LeadActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(adminNotes);
  const [forwardCenterId, setForwardCenterId] = useState(preferredCenterId || "");
  const [saving, setSaving] = useState(false);
  const [forwarding, setForwarding] = useState(false);

  const selectedCenter = eligibleCenters.find((c) => c.id === forwardCenterId);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ status, admin_notes: notes })
      .eq("id", leadId);

    if (error) {
      toast.error("Failed to update lead");
    } else {
      toast.success("Lead updated");
      router.refresh();
    }
    setSaving(false);
  }

  async function handleForward() {
    if (!forwardCenterId) return;
    setForwarding(true);

    try {
      const res = await fetch(`/api/leads/${leadId}/forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ center_id: forwardCenterId }),
      });

      if (res.ok) {
        toast.success("Lead forwarded successfully");
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to forward lead");
      }
    } catch {
      toast.error("Failed to forward lead");
    }
    setForwarding(false);
  }

  return (
    <div className="space-y-6">
      {/* Status Update */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
          Update Status
        </h3>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Admin Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this lead..."
              className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              rows={3}
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Forward Lead — with Commission Info */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
          Forward to Center
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Select a center to forward this lead. Review the commercial agreement before sending.
        </p>

        <div>
          <Label className="text-xs text-muted-foreground">Select Center</Label>
          <select
            value={forwardCenterId}
            onChange={(e) => setForwardCenterId(e.target.value)}
            className="mt-2 w-full bg-surface-container-low border-0 rounded-xl ghost-border text-sm px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
          >
            <option value="">Choose a center...</option>
            {eligibleCenters.map((c) => {
              let commLabel = "";
              if (c.commission_type === "percentage" && c.commission_rate) {
                commLabel = ` — ${c.commission_rate}% commission`;
              } else if (c.commission_type === "fixed" && c.commission_fixed_amount) {
                commLabel = ` — ${c.commission_currency} ${c.commission_fixed_amount} per client`;
              }
              const isPreferred = c.id === preferredCenterId;
              return (
                <option key={c.id} value={c.id}>
                  {isPreferred ? "★ " : ""}{c.name}{commLabel}{isPreferred ? " (Client Preferred)" : ""}
                </option>
              );
            })}
          </select>
          {preferredCenterId && (
            <p className="text-[10px] text-primary mt-1">
              ★ = Client&apos;s preferred center from their inquiry
            </p>
          )}
        </div>

        {/* Commission Details Panel — shown when center is selected */}
        {selectedCenter && (
          <div className="mt-4 bg-surface-container-low rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">{selectedCenter.name}</h4>
              <AgreementStatusBadge status={selectedCenter.agreement_status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Commission Scheme */}
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Commission</p>
                  <CommissionBadge center={selectedCenter} />
                </div>
              </div>

              {/* Account Manager */}
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Account Manager</p>
                  <p className="text-xs text-foreground">{selectedCenter.account_manager || "Unassigned"}</p>
                </div>
              </div>

              {/* Contract Period */}
              {selectedCenter.contract_end && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Contract Ends</p>
                    <p className="text-xs text-foreground">
                      {new Date(selectedCenter.contract_end).toLocaleDateString()}
                      {new Date(selectedCenter.contract_end) < new Date() && (
                        <span className="text-destructive ml-1">(Expired)</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="flex items-start gap-2">
                <Send className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Inquiry Email</p>
                  <p className="text-xs text-foreground">{selectedCenter.inquiry_email || "No email set"}</p>
                </div>
              </div>
            </div>

            {/* Commission Notes */}
            {selectedCenter.commission_notes && (
              <div className="pt-2 border-t border-surface-container">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Agreement Notes</p>
                <p className="text-xs text-muted-foreground">{selectedCenter.commission_notes}</p>
              </div>
            )}

            {/* Warnings */}
            {selectedCenter.agreement_status === "none" && (
              <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  No commercial agreement in place with this center. Consider setting up terms before forwarding.
                </p>
              </div>
            )}
            {selectedCenter.agreement_status === "expired" && (
              <div className="flex items-start gap-2 bg-red-50 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  Agreement with this center has expired. Contact account manager to renew before forwarding.
                </p>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleForward}
          disabled={!forwardCenterId || forwarding}
          className="mt-4 rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
        >
          <Send className="mr-2 h-4 w-4" />
          {forwarding ? "Forwarding..." : "Forward Lead"}
        </Button>
      </div>
    </div>
  );
}
