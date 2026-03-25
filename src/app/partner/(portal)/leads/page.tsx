"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users, CheckCircle, XCircle, Clock, Mail, Phone, Globe,
} from "lucide-react";

interface ForwardedLead {
  id: string;
  lead_id: string;
  partner_status: string;
  partner_status_updated_at: string | null;
  treatment_fee: number | null;
  created_at: string;
  leads: {
    name: string;
    email: string;
    phone: string | null;
    country: string | null;
    concern: string | null;
    urgency: string | null;
    who_for: string | null;
    age_range: string | null;
    message: string | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800", icon: Clock },
  admitted: { label: "Admitted", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  not_admitted: { label: "Not Admitted", color: "bg-gray-100 text-gray-700", icon: XCircle },
};

export default function PartnerLeadsPage() {
  const [leads, setLeads] = useState<ForwardedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    const supabase = createClient();
    const { data: profile } = await supabase.auth.getUser().then(({ data: { user } }) =>
      supabase.from("profiles").select("center_id").eq("id", user!.id).single()
    );

    if (!profile?.center_id) return;

    const { data } = await supabase
      .from("lead_forwards")
      .select("id, lead_id, partner_status, partner_status_updated_at, treatment_fee, created_at, leads(name, email, phone, country, concern, urgency, who_for, age_range, message)")
      .eq("center_id", profile.center_id)
      .order("created_at", { ascending: false });

    setLeads((data || []) as unknown as ForwardedLead[]);
    setLoading(false);
  }

  async function updateLeadStatus(forwardId: string, status: "admitted" | "not_admitted") {
    setUpdating(forwardId);
    const supabase = createClient();

    const { error } = await supabase
      .from("lead_forwards")
      .update({
        partner_status: status,
        partner_status_updated_at: new Date().toISOString(),
      })
      .eq("id", forwardId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Lead marked as ${status === "admitted" ? "Admitted" : "Not Admitted"}`);
      loadLeads();
    }
    setUpdating(null);
  }

  const pendingCount = leads.filter((l) => l.partner_status === "pending").length;
  const admittedCount = leads.filter((l) => l.partner_status === "admitted").length;
  const notAdmittedCount = leads.filter((l) => l.partner_status === "not_admitted").length;

  if (loading) return <div className="animate-pulse h-96 bg-surface-container rounded-2xl" />;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-headline-lg font-semibold text-foreground">Referrals</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Clients referred to you by Rehab-Atlas. Please update their status so we can track outcomes together.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-ambient text-center">
          <p className="text-2xl font-semibold text-amber-700">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-ambient text-center">
          <p className="text-2xl font-semibold text-emerald-700">{admittedCount}</p>
          <p className="text-xs text-muted-foreground">Admitted</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-ambient text-center">
          <p className="text-2xl font-semibold text-gray-600">{notAdmittedCount}</p>
          <p className="text-xs text-muted-foreground">Not Admitted</p>
        </div>
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        {leads.map((forward) => {
          const lead = forward.leads;
          const statusInfo = STATUS_CONFIG[forward.partner_status] || STATUS_CONFIG.pending;
          const StatusIcon = statusInfo.icon;
          const isExpanded = expandedLead === forward.id;

          return (
            <div
              key={forward.id}
              className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden"
            >
              {/* Header row */}
              <button
                onClick={() => setExpandedLead(isExpanded ? null : forward.id)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-container-low/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.country || "Unknown location"} — referred {new Date(forward.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 ${statusInfo.color}`}>
                  <StatusIcon className="h-3 w-3" />
                  {statusInfo.label}
                </span>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-6 pb-5 border-t border-surface-container-low">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{lead.email}</span>
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                      {lead.country && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-3 w-3" />
                          <span>{lead.country}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      {lead.who_for && (
                        <p className="text-muted-foreground"><span className="font-medium text-foreground">For:</span> {lead.who_for}</p>
                      )}
                      {lead.age_range && (
                        <p className="text-muted-foreground"><span className="font-medium text-foreground">Age:</span> {lead.age_range}</p>
                      )}
                      {lead.urgency && (
                        <p className="text-muted-foreground"><span className="font-medium text-foreground">Urgency:</span> {lead.urgency.replace(/_/g, " ")}</p>
                      )}
                    </div>
                  </div>

                  {lead.concern && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-foreground mb-1">Concern</p>
                      <p className="text-sm text-muted-foreground">{lead.concern}</p>
                    </div>
                  )}

                  {lead.message && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-foreground mb-1">Message</p>
                      <p className="text-sm text-muted-foreground">{lead.message}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  {forward.partner_status === "pending" && (
                    <div className="mt-4 flex items-center gap-3">
                      <Button
                        size="sm"
                        className="rounded-full text-xs gradient-primary text-white"
                        onClick={() => updateLeadStatus(forward.id, "admitted")}
                        disabled={updating === forward.id}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {updating === forward.id ? "..." : "Mark Admitted"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-xs"
                        onClick={() => updateLeadStatus(forward.id, "not_admitted")}
                        disabled={updating === forward.id}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Admitted
                      </Button>
                    </div>
                  )}

                  {forward.partner_status !== "pending" && (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Status updated {forward.partner_status_updated_at
                        ? new Date(forward.partner_status_updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {leads.length === 0 && (
          <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-ambient text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No referrals yet. When clients are matched with your center, they will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
