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

interface TrafficSource {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_path?: string;
  channel?: string;
}

/** snake_case → Title Case */
function formatLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAnswerValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value.length ? value.map(formatAnswerValue).join(", ") : "—";
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).replace(/_/g, " ");
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

  // Prepare readable assessment data
  const answers = (assessment?.answers || {}) as Record<string, unknown>;
  const answerEntries = Object.entries(answers).filter(
    ([key]) => !key.startsWith("_")
  );
  const trafficSource = (answers._source as TrafficSource | undefined) || null;
  const matchScores = (assessment?.match_scores || {}) as Record<string, number>;
  const explanations = (assessment?.explanations || []) as Array<{
    center_id: string;
    fit_summary?: string;
  }>;
  const topMatches = Object.entries(matchScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const centerNameById = new Map(
    (eligibleCenters || []).map((c) => [c.id, c.name])
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
            {answerEntries.length > 0 ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {answerEntries.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs text-slate-500 uppercase">
                      {formatLabel(key)}
                    </dt>
                    <dd className="text-sm">{formatAnswerValue(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-slate-500">No answers recorded.</p>
            )}

            {topMatches.length > 0 && (
              <div className="mt-5">
                <p className="text-xs text-slate-500 uppercase mb-2">
                  Top Matches
                </p>
                <ul className="space-y-1.5">
                  {topMatches.map(([centerId, score]) => {
                    const fitSummary = explanations.find(
                      (e) => e.center_id === centerId
                    )?.fit_summary;
                    return (
                      <li key={centerId} className="text-sm">
                        <span className="font-medium">
                          {centerNameById.get(centerId) || centerId}
                        </span>
                        <span className="text-slate-500 ml-2">{score}%</span>
                        {fitSummary && (
                          <span className="text-xs text-slate-500 ml-2">
                            — {fitSummary}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {trafficSource && (
              <p className="mt-5 pt-3 border-t text-xs text-slate-500">
                <span className="uppercase tracking-wider">Traffic source:</span>{" "}
                {[
                  trafficSource.channel,
                  trafficSource.utm_source && `utm_source=${trafficSource.utm_source}`,
                  trafficSource.utm_medium && `utm_medium=${trafficSource.utm_medium}`,
                  trafficSource.utm_campaign && `utm_campaign=${trafficSource.utm_campaign}`,
                  trafficSource.referrer && `referrer: ${trafficSource.referrer}`,
                  trafficSource.landing_path && `landed on ${trafficSource.landing_path}`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "unknown"}
              </p>
            )}
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
