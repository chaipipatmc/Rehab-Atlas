import { redirect } from "next/navigation";
import Link from "next/link";
import { Brain, ArrowRight, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "My Assessments — Rehab-Atlas",
  description: "Your past assessment results and matched centers.",
};

type AssessmentAnswers = {
  contact_email?: string;
  who_for?: string;
  primary_issue?: string[];
  severity?: string;
  budget?: string;
  preferred_country?: string;
};

type AssessmentRow = {
  id: string;
  answers: AssessmentAnswers | null;
  matched_center_ids: string[] | null;
  match_scores: Record<string, number> | null;
  urgency_level: string | null;
  created_at: string;
  contact_email: string | null;
};

function UrgencyBadge({ urgency }: { urgency: string | null }) {
  if (urgency === "urgent") {
    return (
      <span className="text-[10px] uppercase tracking-wider font-medium bg-destructive/10 text-destructive rounded-full px-2.5 py-1">
        Urgent
      </span>
    );
  }
  if (urgency === "soon") {
    return (
      <span className="text-[10px] uppercase tracking-wider font-medium bg-amber-100 text-amber-800 rounded-full px-2.5 py-1">
        Soon
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-wider font-medium bg-surface-container-high text-muted-foreground rounded-full px-2.5 py-1">
      Not urgent
    </span>
  );
}

export default async function AccountAssessmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/account/assessments");
  }

  const email = (user.email || "").trim().toLowerCase();

  // Assessments are submitted pre-login and protected by RLS, so read them
  // server-side with the service role, filtered strictly to the signed-in
  // user's own auth email (dedicated column, with jsonb fallback for old rows).
  let assessments: AssessmentRow[] = [];
  if (email) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("assessments")
      .select(
        "id, answers, matched_center_ids, match_scores, urgency_level, created_at, contact_email"
      )
      .or(`contact_email.eq.${email},answers->>contact_email.eq.${email}`)
      .eq("completed", true)
      .order("created_at", { ascending: false })
      .limit(20);

    // Defense-in-depth: only keep rows whose stored email matches the auth email.
    assessments = ((data || []) as AssessmentRow[]).filter((a) => {
      const rowEmail = (
        a.contact_email ||
        a.answers?.contact_email ||
        ""
      )
        .trim()
        .toLowerCase();
      return rowEmail === email;
    });
  }

  // Resolve matched center names for inline display. We deliberately do NOT
  // link to /assessment/results?id=... — that page requires the HMAC-signed
  // assessment_session cookie from the original browser session, so the link
  // would 404 on a new device or after the cookie expires.
  const centerIds = new Set<string>();
  assessments.forEach((a) =>
    (a.matched_center_ids || []).slice(0, 3).forEach((id) => centerIds.add(id))
  );

  const centerById = new Map<
    string,
    { id: string; name: string; slug: string; city: string | null; country: string | null }
  >();
  if (centerIds.size > 0) {
    const admin = createAdminClient();
    const { data: centers } = await admin
      .from("centers")
      .select("id, name, slug, city, country")
      .in("id", Array.from(centerIds))
      .eq("status", "published");
    (centers || []).forEach((c) => centerById.set(c.id, c));
  }

  return (
    <div className="bg-surface min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-6xl">
        <h1 className="text-headline-lg font-semibold text-foreground mb-2">
          My Assessments
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Assessments you&apos;ve completed and the centers we matched you with.
        </p>

        {assessments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assessments.map((a) => {
              const answers = a.answers || {};
              const issues = Array.isArray(answers.primary_issue)
                ? answers.primary_issue
                : [];
              const topMatches = (a.matched_center_ids || [])
                .slice(0, 3)
                .map((id) => ({
                  center: centerById.get(id),
                  score: a.match_scores?.[id],
                }))
                .filter((m) => m.center);

              return (
                <div
                  key={a.id}
                  className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <UrgencyBadge urgency={a.urgency_level} />
                  </div>

                  {/* Primary concerns */}
                  {issues.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {issues.map((issue) => (
                        <span
                          key={issue}
                          className="text-[10px] uppercase tracking-wider bg-surface-container-high text-muted-foreground rounded-full px-2 py-0.5"
                        >
                          {issue.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}

                  {answers.severity && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Severity:{" "}
                      <span className="text-foreground capitalize">
                        {answers.severity.replace(/_/g, " ")}
                      </span>
                    </p>
                  )}

                  {/* Top matches */}
                  <div className="mt-4 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                      Your top matches
                    </p>
                    {topMatches.length > 0 ? (
                      <ul className="space-y-2">
                        {topMatches.map(({ center, score }) => (
                          <li key={center!.id}>
                            <Link
                              href={`/centers/${center!.slug}`}
                              className="group flex items-center justify-between gap-3 bg-surface-container-low rounded-xl px-3 py-2 ghost-border hover:shadow-ambient transition-all duration-300"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors duration-300">
                                  {center!.name}
                                </p>
                                <p className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  {[center!.city, center!.country]
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                              </div>
                              {typeof score === "number" && (
                                <span className="text-xs font-medium text-primary flex-shrink-0">
                                  {score}%
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Matched centers are no longer available.
                      </p>
                    )}
                  </div>

                  <div className="mt-5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full ghost-border border-0 text-xs"
                      asChild
                    >
                      <Link href="/assessment">
                        <RefreshCw className="mr-1.5 h-3 w-3" />
                        Retake assessment
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-ambient text-center">
            <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-headline-sm font-semibold text-foreground">
              No assessments yet
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
              Take our confidential assessment and we&apos;ll match you with
              treatment centers that fit your needs, preferences, and budget.
              Results submitted with {email || "your email"} will appear here.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                className="rounded-full gradient-primary text-white hover:opacity-90"
                asChild
              >
                <Link href="/assessment">
                  Start Assessment
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
