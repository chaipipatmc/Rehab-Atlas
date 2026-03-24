import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LEAD_STATUS_OPTIONS } from "@/lib/constants";
import { LeadActions } from "@/components/admin/lead-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*, preferred_center:centers(id, name, slug, inquiry_email)")
    .eq("id", id)
    .single();

  if (!lead) notFound();

  // Fetch forward history
  const { data: forwards } = await supabase
    .from("lead_forwards")
    .select("*, center:centers(name)")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  // Fetch assessment if linked
  let assessment = null;
  if (lead.assessment_id) {
    const { data } = await supabase
      .from("assessments")
      .select("answers, match_scores, explanations")
      .eq("id", lead.assessment_id)
      .single();
    assessment = data;
  }

  // Fetch all published centers for forwarding (include commission info)
  const { data: eligibleCenters } = await supabase
    .from("centers")
    .select("id, name, inquiry_email, commission_type, commission_rate, commission_fixed_amount, commission_currency, commission_notes, agreement_status, contract_start, contract_end, account_manager")
    .eq("status", "published")
    .order("name");

  const statusConfig = LEAD_STATUS_OPTIONS.find(
    (s) => s.value === lead.status
  );

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Lead Details</h1>
      <div className="flex items-center gap-3 mb-6">
        <Badge variant="outline" className={statusConfig?.color}>
          {statusConfig?.label || lead.status}
        </Badge>
        {lead.urgency === "urgent" && (
          <Badge variant="destructive">Urgent</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 uppercase">Name</p>
              <p className="font-medium">{lead.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Email</p>
              <p>{lead.email}</p>
            </div>
            {lead.phone && (
              <div>
                <p className="text-xs text-slate-500 uppercase">Phone</p>
                <p>{lead.phone}</p>
              </div>
            )}
            {lead.country && (
              <div>
                <p className="text-xs text-slate-500 uppercase">Country</p>
                <p>{lead.country}</p>
              </div>
            )}
            {lead.request_call && (
              <Badge variant="secondary">Callback Requested</Badge>
            )}
          </CardContent>
        </Card>

        {/* Inquiry Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inquiry Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lead.who_for && (
              <div>
                <p className="text-xs text-slate-500 uppercase">Who For</p>
                <p>{lead.who_for}</p>
              </div>
            )}
            {lead.age_range && (
              <div>
                <p className="text-xs text-slate-500 uppercase">Age Range</p>
                <p>{lead.age_range}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 uppercase">Concern</p>
              <p className="whitespace-pre-line">{lead.concern}</p>
            </div>
            {lead.budget && (
              <div>
                <p className="text-xs text-slate-500 uppercase">Budget</p>
                <p>{lead.budget}</p>
              </div>
            )}
            {lead.message && (
              <div>
                <p className="text-xs text-slate-500 uppercase">Message</p>
                <p className="whitespace-pre-line">{lead.message}</p>
              </div>
            )}
            {lead.preferred_center && (
              <div>
                <p className="text-xs text-slate-500 uppercase">
                  Preferred Center
                </p>
                <p className="font-medium">
                  {(lead.preferred_center as { name: string }).name}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assessment Data */}
      {assessment && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Assessment Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-64">
              {JSON.stringify(assessment.answers, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Forward History */}
      {forwards && forwards.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Forward History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {forwards.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm border-b pb-2">
                  <div>
                    <span className="font-medium">
                      {(f.center as { name: string } | null)?.name}
                    </span>
                    <span className="text-slate-500 ml-2">via {f.method}</span>
                  </div>
                  <span className="text-slate-400">
                    {new Date(f.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="my-6" />

      {/* Actions */}
      <LeadActions
        leadId={lead.id}
        currentStatus={lead.status}
        adminNotes={lead.admin_notes || ""}
        preferredCenterId={lead.preferred_center_id || ""}
        eligibleCenters={(eligibleCenters || []).map((c) => ({
          id: c.id,
          name: c.name,
          inquiry_email: c.inquiry_email || "",
          commission_type: c.commission_type || "none",
          commission_rate: c.commission_rate,
          commission_fixed_amount: c.commission_fixed_amount,
          commission_currency: c.commission_currency || "USD",
          commission_notes: c.commission_notes,
          agreement_status: c.agreement_status || "none",
          contract_end: c.contract_end,
          account_manager: c.account_manager,
        }))}
      />
    </div>
  );
}
