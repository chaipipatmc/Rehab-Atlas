import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Users,
  ExternalLink,
  Brain,
  AlertCircle,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import AssessmentDeleteButton from "@/components/admin/AssessmentDeleteButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

type Explanation = {
  center_id: string;
  explanation: string;
  fit_summary: string;
};

type Answers = Record<string, unknown>;

export default async function AdminAssessmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .single();

  if (!assessment) notFound();

  const answers = (assessment.answers || {}) as Answers;
  const matchedIds = (assessment.matched_center_ids || []) as string[];
  const matchScores = (assessment.match_scores || {}) as Record<string, number>;
  const explanations = (assessment.explanations || []) as Explanation[];

  // Matched centers (primary + alternatives from scores)
  const allScoredIds = Object.keys(matchScores);
  const { data: centers } = allScoredIds.length
    ? await supabase
        .from("centers")
        .select("id, name, slug, city, country, short_description")
        .in("id", allScoredIds)
    : { data: [] };
  const centerById = new Map((centers || []).map((c) => [c.id, c]));

  // Linked lead, if any
  const { data: linkedLead } = await supabase
    .from("leads")
    .select("id, name, email, phone, status, created_at")
    .eq("assessment_id", id)
    .maybeSingle();

  const primaryMatches = matchedIds
    .map((cid) => ({
      center: centerById.get(cid),
      score: matchScores[cid],
      explanation: explanations.find((e) => e.center_id === cid),
    }))
    .filter((m) => m.center);

  const alternativeMatches = allScoredIds
    .filter((cid) => !matchedIds.includes(cid))
    .sort((a, b) => (matchScores[b] || 0) - (matchScores[a] || 0))
    .map((cid) => ({
      center: centerById.get(cid),
      score: matchScores[cid],
    }))
    .filter((m) => m.center);

  const urgency = assessment.urgency_level as string;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/assessments">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Assessments
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-slate-900">
              Assessment Detail
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Submitted {new Date(assessment.created_at).toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {urgency === "urgent" ? (
              <Badge variant="destructive">Urgent</Badge>
            ) : urgency === "soon" ? (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Soon
              </Badge>
            ) : (
              <Badge variant="outline">Normal</Badge>
            )}
            <Badge variant="outline" className="text-xs">
              Session: {(assessment.session_id || "").slice(0, 8)}…
            </Badge>
            {linkedLead ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-0">
                Converted to Lead
              </Badge>
            ) : (
              <Badge variant="outline">Not converted</Badge>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {linkedLead ? (
            <Button asChild className="rounded-full">
              <Link href={`/admin/leads/${linkedLead.id}`}>
                <Users className="h-4 w-4 mr-2" />
                View Lead
              </Link>
            </Button>
          ) : (
            <Button asChild className="rounded-full gradient-primary text-white">
              <Link href={`/inquiry?assessment=${assessment.id}`} target="_blank">
                <Users className="h-4 w-4 mr-2" />
                Create Lead
              </Link>
            </Button>
          )}
          <AssessmentDeleteButton id={assessment.id} redirectTo="/admin/assessments" />
        </div>
      </div>

      {urgency === "urgent" && (
        <div className="bg-destructive/5 rounded-xl p-4 mb-6 flex gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              This user marked their situation as urgent.
            </p>
            {!linkedLead && (
              <p className="text-xs text-muted-foreground mt-1">
                They did not submit a follow-up inquiry. Consider proactive outreach.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Contact card — always-visible at top when contact info is present */}
      {assessment.contact_email && (
        <Card className="mb-6 border-primary/20">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Contact (collected at assessment)
              </p>
              <p className="font-medium text-foreground">
                {assessment.contact_name || "(no name provided)"}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
                <a
                  href={`mailto:${assessment.contact_email}`}
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Mail className="h-3 w-3" />
                  {assessment.contact_email}
                </a>
                {assessment.contact_phone && (
                  <a
                    href={`tel:${assessment.contact_phone}`}
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3" />
                    {assessment.contact_phone}
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${assessment.contact_email}`}>
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </a>
              </Button>
              {assessment.contact_phone && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${assessment.contact_phone}`}>
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Answers: Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Situation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Who is this for" value={str(answers.who_for)} />
            <Field label="Age range" value={str(answers.age_range)} />
            <Field
              label="Primary issue"
              value={arr(answers.primary_issue)}
            />
            <Field label="Substances" value={arr(answers.substances)} />
            <Field label="Severity" value={str(answers.severity)} />
            <Field
              label="Co-occurring conditions"
              value={arr(answers.co_occurring)}
            />
            <Field
              label="Prior treatment"
              value={bool(answers.prior_treatment)}
            />
            <Field label="Needs detox" value={bool(answers.needs_detox)} />
          </CardContent>
        </Card>

        {/* Answers: Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Budget" value={str(answers.budget)} />
            <Field
              label="Preferred country"
              value={str(answers.preferred_country) || "Any"}
            />
            <Field
              label="Preferred setting"
              value={str(answers.preferred_setting)}
            />
            <Field
              label="Insurance provider"
              value={str(answers.insurance_provider) || "Not specified"}
            />
            <Field
              label="Privacy importance"
              value={str(answers.privacy_importance)}
            />
            <Field label="Urgency" value={str(answers.urgency)} />
          </CardContent>
        </Card>
      </div>

      {/* Linked Lead */}
      {linkedLead && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Linked Lead
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{linkedLead.name}</p>
                <p className="text-sm text-muted-foreground">{linkedLead.email}</p>
                {linkedLead.phone && (
                  <p className="text-xs text-muted-foreground">{linkedLead.phone}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted{" "}
                  {new Date(linkedLead.created_at).toLocaleDateString()} · Status:{" "}
                  <span className="font-medium">{linkedLead.status}</span>
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/leads/${linkedLead.id}`}>
                  Open Lead
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="my-6" />

      {/* Primary Matches */}
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Primary Matches ({primaryMatches.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {primaryMatches.map((m, i) => (
          <Card key={m.center!.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary rounded-full px-2 py-0.5">
                  Match #{i + 1} · {m.score}%
                </span>
              </div>
              <Link
                href={`/centers/${m.center!.slug}`}
                target="_blank"
                className="font-medium text-foreground hover:text-primary"
              >
                {m.center!.name}
              </Link>
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3" />
                {[m.center!.city, m.center!.country].filter(Boolean).join(", ")}
              </p>
              {m.explanation && (
                <div className="mt-3 bg-primary/5 rounded-lg p-2">
                  <p className="text-xs font-medium text-primary">
                    {m.explanation.fit_summary}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-4">
                    {m.explanation.explanation}
                  </p>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="text-xs h-7 flex-1" asChild>
                  <Link href={`/admin/centers/${m.center!.id}`}>
                    Edit Center
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" asChild>
                  <Link href={`/centers/${m.center!.slug}`} target="_blank">
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {primaryMatches.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-3">
            No primary matches recorded.
          </p>
        )}
      </div>

      {/* Alternatives */}
      {alternativeMatches.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Alternatives ({alternativeMatches.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {alternativeMatches.map((m) => (
              <div
                key={m.center!.id}
                className="flex items-center justify-between bg-surface-container-lowest rounded-xl p-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/centers/${m.center!.slug}`}
                    target="_blank"
                    className="text-sm font-medium text-foreground hover:text-primary truncate"
                  >
                    {m.center!.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {[m.center!.city, m.center!.country].filter(Boolean).join(", ")}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground ml-2">
                  {m.score}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Raw JSON */}
      <details className="mt-6">
        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
          Raw answers JSON
        </summary>
        <pre className="text-xs bg-slate-50 p-4 rounded-xl overflow-auto max-h-96 mt-2">
          {JSON.stringify(answers, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground capitalize">{value || "—"}</p>
    </div>
  );
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).replace(/_/g, " ");
}

function arr(v: unknown): string {
  if (!Array.isArray(v) || v.length === 0) return "";
  return v.map((x) => String(x).replace(/_/g, " ")).join(", ");
}

function bool(v: unknown): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "";
}
