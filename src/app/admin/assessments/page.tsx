import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, ChevronLeft, ChevronRight, Users, Brain } from "lucide-react";
import AssessmentDeleteButton from "@/components/admin/AssessmentDeleteButton";

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

type AssessmentAnswers = {
  who_for?: string;
  age_range?: string;
  primary_issue?: string[];
  severity?: string;
  budget?: string;
  preferred_country?: string;
};

type AssessmentRow = {
  id: string;
  session_id: string | null;
  answers: AssessmentAnswers | null;
  matched_center_ids: string[] | null;
  match_scores: Record<string, number> | null;
  urgency_level: string | null;
  completed: boolean | null;
  created_at: string;
  contact_email: string | null;
  contact_name: string | null;
  contact_phone: string | null;
};

export default async function AdminAssessmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const currentPage = Number(params.page) || 1;
  const offset = (currentPage - 1) * PAGE_SIZE;
  const urgencyFilter = params.urgency?.trim() || "";
  const convertedFilter = params.converted?.trim() || "";

  let query = supabase
    .from("assessments")
    .select(
      "id, session_id, answers, matched_center_ids, match_scores, urgency_level, completed, created_at, contact_email, contact_name, contact_phone",
      { count: "exact" }
    )
    .eq("completed", true)
    .order("created_at", { ascending: false });

  if (urgencyFilter) query = query.eq("urgency_level", urgencyFilter);

  const { data: assessments, count } = await query.range(
    offset,
    offset + PAGE_SIZE - 1
  );

  const rows = (assessments || []) as AssessmentRow[];

  // Lookup: which assessments have been converted to leads?
  const ids = rows.map((a) => a.id);
  const { data: leadLinks } = ids.length
    ? await supabase
        .from("leads")
        .select("id, assessment_id, name, email")
        .in("assessment_id", ids)
    : { data: [] };

  const leadByAssessment = new Map<
    string,
    { id: string; name: string; email: string }
  >();
  (leadLinks || []).forEach((l) => {
    if (l.assessment_id) {
      leadByAssessment.set(l.assessment_id, {
        id: l.id,
        name: l.name,
        email: l.email,
      });
    }
  });

  // Collect top-match center IDs to display names
  const topCenterIds = new Set<string>();
  rows.forEach((a) => {
    const first = a.matched_center_ids?.[0];
    if (first) topCenterIds.add(first);
  });
  const { data: centers } = topCenterIds.size
    ? await supabase
        .from("centers")
        .select("id, name, slug")
        .in("id", Array.from(topCenterIds))
    : { data: [] };
  const centerById = new Map((centers || []).map((c) => [c.id, c]));

  // Apply converted filter client-side (can't join in query easily)
  const filtered =
    convertedFilter === "yes"
      ? rows.filter((a) => leadByAssessment.has(a.id))
      : convertedFilter === "no"
      ? rows.filter((a) => !leadByAssessment.has(a.id))
      : rows;

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  const buildPageUrl = (page: number) => {
    const p = new URLSearchParams();
    if (page > 1) p.set("page", String(page));
    if (urgencyFilter) p.set("urgency", urgencyFilter);
    if (convertedFilter) p.set("converted", convertedFilter);
    const qs = p.toString();
    return `/admin/assessments${qs ? `?${qs}` : ""}`;
  };

  const buildFilterUrl = (key: string, value: string) => {
    const p = new URLSearchParams();
    if (urgencyFilter && key !== "urgency") p.set("urgency", urgencyFilter);
    if (convertedFilter && key !== "converted") p.set("converted", convertedFilter);
    if (value) p.set(key, value);
    const qs = p.toString();
    return `/admin/assessments${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-slate-900">Assessments</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Completed AI self-assessments. {count ?? 0} total.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs uppercase tracking-wider text-muted-foreground mr-2">
          Urgency:
        </span>
        {["", "urgent", "soon", "not_urgent"].map((v) => (
          <Link
            key={v || "all"}
            href={buildFilterUrl("urgency", v)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              urgencyFilter === v
                ? "bg-primary text-white"
                : "bg-surface-container-low text-muted-foreground hover:bg-surface-container"
            }`}
          >
            {v === "" ? "All" : v === "not_urgent" ? "Not Urgent" : v.charAt(0).toUpperCase() + v.slice(1)}
          </Link>
        ))}
        <span className="text-xs uppercase tracking-wider text-muted-foreground ml-4 mr-2">
          Converted:
        </span>
        {[
          { v: "", label: "All" },
          { v: "yes", label: "Yes" },
          { v: "no", label: "No" },
        ].map((o) => (
          <Link
            key={o.v || "all-conv"}
            href={buildFilterUrl("converted", o.v)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              convertedFilter === o.v
                ? "bg-primary text-white"
                : "bg-surface-container-low text-muted-foreground hover:bg-surface-container"
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>

      <div className="border rounded-lg bg-surface-container-lowest">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Primary Issue</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Top Match</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => {
              const answers = a.answers || {};
              const topId = a.matched_center_ids?.[0];
              const topCenter = topId ? centerById.get(topId) : null;
              const topScore = topId ? a.match_scores?.[topId] : null;
              const lead = leadByAssessment.get(a.id);
              const issues = Array.isArray(answers.primary_issue)
                ? answers.primary_issue
                : [];

              return (
                <TableRow key={a.id}>
                  <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                    {new Date(a.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {a.contact_email ? (
                      <div className="min-w-0 max-w-[220px]">
                        <p className="text-xs font-medium text-foreground truncate">
                          {a.contact_name || (answers.who_for || "Anonymous").replace(/_/g, " ")}
                        </p>
                        <a
                          href={`mailto:${a.contact_email}`}
                          className="text-[11px] text-primary hover:underline truncate block"
                        >
                          {a.contact_email}
                        </a>
                        {a.contact_phone && (
                          <a
                            href={`tel:${a.contact_phone}`}
                            className="text-[11px] text-muted-foreground hover:text-primary block"
                          >
                            {a.contact_phone}
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Anonymous (pre-contact)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {issues.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {issues.slice(0, 2).map((i) => (
                          <span
                            key={i}
                            className="text-[10px] uppercase tracking-wider bg-surface-container-high text-muted-foreground rounded-full px-2 py-0.5"
                          >
                            {i.replace(/_/g, " ")}
                          </span>
                        ))}
                        {issues.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{issues.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {answers.severity || "—"}
                  </TableCell>
                  <TableCell>
                    {a.urgency_level === "urgent" ? (
                      <Badge variant="destructive">Urgent</Badge>
                    ) : a.urgency_level === "soon" ? (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Soon
                      </Badge>
                    ) : (
                      <Badge variant="outline">Normal</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {topCenter ? (
                      <Link
                        href={`/centers/${topCenter.slug}`}
                        className="text-primary hover:underline"
                        target="_blank"
                      >
                        {topCenter.name}
                        {topScore !== null && topScore !== undefined && (
                          <span className="text-muted-foreground ml-1">
                            · {topScore}%
                          </span>
                        )}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {lead ? (
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Users className="h-3 w-3" />
                        {lead.name}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not converted</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/assessments/${a.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AssessmentDeleteButton id={a.id} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                  No assessments match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-500">
            Page {currentPage} of {totalPages} ({count} total)
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild disabled={currentPage <= 1}>
              <Link href={buildPageUrl(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild disabled={currentPage >= totalPages}>
              <Link href={buildPageUrl(currentPage + 1)}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
