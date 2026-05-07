import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import {
  ActivityIcon,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  CalendarDays,
  CheckCircle,
  DollarSign,
  FileText,
  Globe,
  Inbox,
  MessageSquare,
  Mail,
  Pencil,
  Send,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 300;

// ─── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string | Date): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

function pct(num: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.round((num / denom) * 100);
}

// ─── Activity feed types ────────────────────────────────────────────────────

type ActivityType = "lead" | "assessment" | "article" | "edit" | "outreach" | "agent";

interface ActivityItem {
  id: string;
  ts: string;
  type: ActivityType;
  title: string;
  subtitle?: string;
  href?: string;
}

const ACTIVITY_STYLES: Record<ActivityType, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  lead: { icon: Users, color: "text-blue-700 bg-blue-50", label: "Lead" },
  assessment: { icon: Brain, color: "text-amber-700 bg-amber-50", label: "Assessment" },
  article: { icon: FileText, color: "text-violet-700 bg-violet-50", label: "Article" },
  edit: { icon: Pencil, color: "text-emerald-700 bg-emerald-50", label: "Edit Req" },
  outreach: { icon: Send, color: "text-sky-700 bg-sky-50", label: "Outreach" },
  agent: { icon: Sparkles, color: "text-rose-700 bg-rose-50", label: "Agent" },
};

// ─── Outreach stages config ─────────────────────────────────────────────────

const OUTREACH_BUCKETS: { label: string; stages: string[]; color: string }[] = [
  { label: "Researching", stages: ["new", "researching", "research_complete"], color: "bg-gray-200 text-gray-700" },
  { label: "Drafted", stages: ["outreach_drafted", "agreement_drafted"], color: "bg-amber-200 text-amber-900" },
  { label: "Contacted", stages: ["outreach_sent", "followed_up"], color: "bg-sky-200 text-sky-900" },
  { label: "In dialog", stages: ["responded", "negotiating", "terms_agreed"], color: "bg-emerald-200 text-emerald-900" },
  { label: "Signing", stages: ["agreement_sent", "agreement_signed"], color: "bg-violet-200 text-violet-900" },
  { label: "Active", stages: ["active"], color: "bg-emerald-500 text-white" },
  { label: "Paused", stages: ["stalled", "declined"], color: "bg-gray-300 text-gray-600" },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const admin = createAdminClient();

  const now = Date.now();
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() - 1,
    1
  ).toISOString();
  const endOfLastMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    0,
    23,
    59,
    59
  ).toISOString();
  const sevenDaysAgo = new Date(now - 7 * 86_400_000).toISOString();
  const fourteenDaysAgo = new Date(now - 14 * 86_400_000).toISOString();
  const oneDayAgo = new Date(now - 86_400_000).toISOString();

  // ─── Mass parallel fetch ─────────────────────────────────────────────────

  const [
    centersRes,
    publishedCentersRes,
    draftCentersRes,
    leadsTotalRes,
    leadsNewRes,
    leadsForwardedRes,
    leads7dRes,
    leadsPrev7dRes,
    leads24hRes,
    assessmentsTotalRes,
    assessments7dRes,
    assessmentsPrev7dRes,
    assessments24hRes,
    pendingEditsRes,
    pendingTasksCountRes,
    blogDraftRes,
    blogApprovedRes,
    blogPublishedRes,
    blogPublished7dRes,
    pipelineAllRes,
    plannedTopicsRes,
    forwardedAdmittedRes,
    pageViewsAllRes,
    apiUsageThisMonthRes,
    apiUsageLastMonthRes,
    settingsRes,
    recentLeadsRes,
    recentAssessmentsRes,
    recentArticlesRes,
    recentEditsRes,
    recentOutreachRes,
    recentAgentTasksRes,
    recentAgentLogRes,
  ] = await Promise.all([
    admin.from("centers").select("*", { count: "exact", head: true }),
    admin.from("centers").select("*", { count: "exact", head: true }).eq("status", "published"),
    admin.from("centers").select("*", { count: "exact", head: true }).eq("status", "draft"),
    admin.from("leads").select("*", { count: "exact", head: true }),
    admin.from("leads").select("*", { count: "exact", head: true }).eq("status", "new"),
    admin.from("leads").select("*", { count: "exact", head: true }).eq("status", "forwarded"),
    admin.from("leads").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    admin
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", fourteenDaysAgo)
      .lt("created_at", sevenDaysAgo),
    admin.from("leads").select("*", { count: "exact", head: true }).gte("created_at", oneDayAgo),
    admin.from("assessments").select("*", { count: "exact", head: true }).eq("completed", true),
    admin
      .from("assessments")
      .select("*", { count: "exact", head: true })
      .eq("completed", true)
      .gte("created_at", sevenDaysAgo),
    admin
      .from("assessments")
      .select("*", { count: "exact", head: true })
      .eq("completed", true)
      .gte("created_at", fourteenDaysAgo)
      .lt("created_at", sevenDaysAgo),
    admin
      .from("assessments")
      .select("*", { count: "exact", head: true })
      .eq("completed", true)
      .gte("created_at", oneDayAgo),
    admin
      .from("center_edit_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    admin.from("agent_tasks").select("*", { count: "exact", head: true }).eq("status", "awaiting_owner"),
    admin
      .from("pages")
      .select("*", { count: "exact", head: true })
      .eq("page_type", "blog")
      .eq("status", "draft"),
    admin
      .from("pages")
      .select("*", { count: "exact", head: true })
      .eq("page_type", "blog")
      .eq("status", "approved"),
    admin
      .from("pages")
      .select("*", { count: "exact", head: true })
      .eq("page_type", "blog")
      .eq("status", "published"),
    admin
      .from("pages")
      .select("*", { count: "exact", head: true })
      .eq("page_type", "blog")
      .eq("status", "published")
      .gte("published_at", sevenDaysAgo),
    admin.from("outreach_pipeline").select("stage"),
    admin
      .from("content_calendar")
      .select("*", { count: "exact", head: true })
      .eq("status", "planned")
      .gte("planned_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
    admin
      .from("lead_forwards")
      .select("*", { count: "exact", head: true })
      .eq("partner_status", "admitted"),
    admin.from("page_views").select("path, country, created_at").gte("created_at", sevenDaysAgo),
    admin
      .from("api_usage")
      .select("agent_type, cost_usd, input_tokens, output_tokens")
      .gte("created_at", startOfMonth),
    admin
      .from("api_usage")
      .select("cost_usd")
      .gte("created_at", startOfLastMonth)
      .lte("created_at", endOfLastMonth),
    admin.from("site_settings").select("key, value").like("key", "agent_%_enabled"),
    admin
      .from("leads")
      .select("id, name, email, status, urgency, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("assessments")
      .select("id, contact_name, contact_email, urgency_level, created_at")
      .eq("completed", true)
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("pages")
      .select("id, slug, title, published_at")
      .eq("page_type", "blog")
      .eq("status", "published")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(8),
    admin
      .from("center_edit_requests")
      .select("id, status, created_at, center:centers(name, slug)")
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("outreach_pipeline")
      .select("id, stage, updated_at, center:centers(name)")
      .in("stage", ["outreach_sent", "responded", "negotiating", "agreement_sent", "active"])
      .order("updated_at", { ascending: false })
      .limit(6),
    admin
      .from("agent_tasks")
      .select("id, agent_type, ai_summary, created_at")
      .eq("status", "awaiting_owner")
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("agent_log")
      .select("id, agent_type, action, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // ─── Derived counts ──────────────────────────────────────────────────────

  const centersTotal = centersRes.count || 0;
  const centersPublished = publishedCentersRes.count || 0;
  const centersDraft = draftCentersRes.count || 0;
  const leadsTotal = leadsTotalRes.count || 0;
  const leadsNew = leadsNewRes.count || 0;
  const leadsForwarded = leadsForwardedRes.count || 0;
  const leads7d = leads7dRes.count || 0;
  const leadsPrev7d = leadsPrev7dRes.count || 0;
  const leads24h = leads24hRes.count || 0;
  const assessmentsTotal = assessmentsTotalRes.count || 0;
  const assessments7d = assessments7dRes.count || 0;
  const assessmentsPrev7d = assessmentsPrev7dRes.count || 0;
  const assessments24h = assessments24hRes.count || 0;
  const pendingEdits = pendingEditsRes.count || 0;
  const pendingTasksCount = pendingTasksCountRes.count || 0;
  const blogDraft = blogDraftRes.count || 0;
  const blogApproved = blogApprovedRes.count || 0;
  const blogPublished = blogPublishedRes.count || 0;
  const blogPublished7d = blogPublished7dRes.count || 0;
  const plannedTopics = plannedTopicsRes.count || 0;
  const admittedTotal = forwardedAdmittedRes.count || 0;

  // Pipeline stages
  const pipelineStages = (pipelineAllRes.data || []) as { stage: string }[];
  const pipelineTotal = pipelineStages.length;
  const stageCount = new Map<string, number>();
  pipelineStages.forEach((p) => stageCount.set(p.stage, (stageCount.get(p.stage) || 0) + 1));
  const pipelineActive = stageCount.get("active") || 0;

  // Page views
  const allViews = pageViewsAllRes.data || [];
  const views7d = allViews.length;
  const sessionsByCountry = new Map<string, number>();
  allViews.forEach((v) => {
    if (v.country) sessionsByCountry.set(v.country, (sessionsByCountry.get(v.country) || 0) + 1);
  });
  const topCountries = Array.from(sessionsByCountry.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // API costs
  const thisMonth = apiUsageThisMonthRes.data || [];
  const thisMonthCost = thisMonth.reduce((s, r) => s + Number(r.cost_usd || 0), 0);
  const lastMonthCost = (apiUsageLastMonthRes.data || []).reduce(
    (s, r) => s + Number(r.cost_usd || 0),
    0
  );
  const thisMonthCalls = thisMonth.length;
  const thisMonthTokens = thisMonth.reduce(
    (s, r) => s + (r.input_tokens || 0) + (r.output_tokens || 0),
    0
  );
  const costByAgent = new Map<string, number>();
  thisMonth.forEach((r) => {
    const key = r.agent_type || "other";
    costByAgent.set(key, (costByAgent.get(key) || 0) + Number(r.cost_usd || 0));
  });
  const topAgentCosts = Array.from(costByAgent.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Agent health
  const settings = (settingsRes.data || []) as { key: string; value: string }[];
  const enabledCount = settings.filter((s) => s.value === "true").length;
  const disabledAgents = settings
    .filter((s) => s.value !== "true")
    .map((s) => s.key.replace(/^agent_/, "").replace(/_enabled$/, "").replace(/_/g, " "));

  // Trend deltas
  const leadsTrend = leadsPrev7d > 0 ? Math.round(((leads7d - leadsPrev7d) / leadsPrev7d) * 100) : null;
  const assessmentsTrend = assessmentsPrev7d > 0
    ? Math.round(((assessments7d - assessmentsPrev7d) / assessmentsPrev7d) * 100)
    : null;

  // ─── Build merged activity feed ──────────────────────────────────────────

  const activity: ActivityItem[] = [];

  for (const l of recentLeadsRes.data || []) {
    activity.push({
      id: `lead-${l.id}`,
      ts: l.created_at,
      type: "lead",
      title: `Lead from ${l.name || "Anonymous"}`,
      subtitle: l.urgency ? `${l.urgency} · ${l.email || "no email"}` : l.email || "no email",
      href: `/admin/leads/${l.id}`,
    });
  }
  for (const a of recentAssessmentsRes.data || []) {
    activity.push({
      id: `asmt-${a.id}`,
      ts: a.created_at,
      type: "assessment",
      title: `Assessment: ${a.contact_name || a.contact_email || "anonymous"}`,
      subtitle: a.urgency_level ? `Urgency: ${a.urgency_level}` : "Completed",
      href: `/admin/assessments/${a.id}`,
    });
  }
  for (const p of recentArticlesRes.data || []) {
    if (!p.published_at) continue;
    activity.push({
      id: `art-${p.id}`,
      ts: p.published_at as string,
      type: "article",
      title: `Published: ${p.title}`,
      subtitle: "Article live on /blog",
      href: `/blog/${p.slug}`,
    });
  }
  for (const e of recentEditsRes.data || []) {
    const c = e.center as unknown as { name?: string } | null;
    activity.push({
      id: `edit-${e.id}`,
      ts: e.created_at,
      type: "edit",
      title: `Edit request: ${c?.name || "Unknown center"}`,
      subtitle: `Status: ${e.status}`,
      href: "/admin/edit-requests",
    });
  }
  for (const o of recentOutreachRes.data || []) {
    const c = o.center as unknown as { name?: string } | null;
    activity.push({
      id: `out-${o.id}`,
      ts: o.updated_at,
      type: "outreach",
      title: `Outreach ${o.stage.replace(/_/g, " ")}: ${c?.name || "—"}`,
      subtitle: `Pipeline stage updated`,
      href: `/admin/outreach/${o.id}`,
    });
  }
  for (const t of recentAgentTasksRes.data || []) {
    activity.push({
      id: `task-${t.id}`,
      ts: t.created_at,
      type: "agent",
      title: t.ai_summary || `Agent task: ${t.agent_type.replace(/_/g, " ")}`,
      subtitle: `Awaiting your review`,
      href: "/admin/agents",
    });
  }

  activity.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  const feed = activity.slice(0, 14);

  // ─── Action items ────────────────────────────────────────────────────────

  const actionItems = [
    { count: leadsNew, label: "new leads", href: "/admin/leads", icon: Users, tone: "blue" },
    { count: pendingEdits, label: "edit requests", href: "/admin/edit-requests", icon: Pencil, tone: "emerald" },
    { count: blogDraft, label: "drafts to approve", href: "/admin/content?status=draft", icon: FileText, tone: "violet" },
    { count: pendingTasksCount, label: "agent tasks", href: "/admin/agents", icon: AlertTriangle, tone: "amber" },
  ].filter((i) => i.count > 0);

  const TONE_CLASSES: Record<string, string> = {
    blue: "text-blue-700 bg-blue-50 hover:bg-blue-100",
    emerald: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100",
    violet: "text-violet-700 bg-violet-50 hover:bg-violet-100",
    amber: "text-amber-700 bg-amber-50 hover:bg-amber-100",
  };

  // ─── Funnel snapshot (7d) ────────────────────────────────────────────────

  const funnelSteps = [
    { label: "Page views", value: views7d, sub: "all sessions, last 7d" },
    { label: "Assessments", value: assessments7d, sub: "completed" },
    { label: "Leads", value: leads7d, sub: "submitted" },
    { label: "Forwarded", value: leadsForwarded, sub: "to centers (lifetime)" },
    { label: "Admitted", value: admittedTotal, sub: "lifetime" },
  ];

  const totalContentPool = blogDraft + blogApproved;
  const daysOfContent = Math.floor(totalContentPool / 3);

  return (
    <div>
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-end justify-between gap-2 mb-5">
        <div>
          <h1 className="text-headline-lg font-semibold text-foreground flex items-center gap-2">
            <ActivityIcon className="h-5 w-5 text-primary" />
            Mission Control
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live overview of every movement across Rehab-Atlas — last 7 days unless noted.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Updated{" "}
          {new Date().toLocaleString("en-US", {
            timeZone: "Asia/Bangkok",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}{" "}
          BKK
        </div>
      </div>

      {/* ─── Action items ─── */}
      {actionItems.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mr-1">
            Needs you →
          </span>
          {actionItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 transition-colors ${
                TONE_CLASSES[item.tone]
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              <span className="tabular-nums font-semibold">{item.count}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* ─── Funnel snapshot (7d) ─── */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Funnel · last 7 days
          </h2>
          <Link href="/admin/analytics" className="text-xs text-primary hover:underline">
            Open analytics →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {funnelSteps.map((s, i) => {
            const prev = i > 0 ? funnelSteps[i - 1].value : 0;
            const rate = i > 0 && prev > 0 ? Math.round((s.value / prev) * 100) : null;
            return (
              <div key={s.label} className="relative bg-surface-container/40 rounded-xl p-3 text-center">
                <p className="text-2xl font-semibold text-primary tabular-nums">
                  {s.value.toLocaleString()}
                </p>
                <p className="text-xs text-foreground font-medium mt-0.5">{s.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{s.sub}</p>
                {rate !== null && (
                  <p className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px] bg-foreground text-background px-1.5 py-0.5 rounded-full font-medium">
                    {rate}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── KPI Row ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <KpiCard
          icon={Building2}
          label="Centers"
          value={centersTotal}
          sub={`${centersPublished} live · ${centersDraft} draft`}
          href="/admin/centers"
        />
        <KpiCard
          icon={Inbox}
          label="Leads"
          value={leadsTotal}
          sub={
            leads24h > 0
              ? `+${leads24h} today · ${leadsNew} new`
              : `${leadsNew} new · ${leadsForwarded} forwarded`
          }
          trend={leadsTrend}
          href="/admin/leads"
        />
        <KpiCard
          icon={Brain}
          label="Assessments"
          value={assessmentsTotal}
          sub={
            assessments24h > 0
              ? `+${assessments24h} today`
              : `${assessments7d} in last 7d`
          }
          trend={assessmentsTrend}
          href="/admin/assessments"
        />
        <KpiCard
          icon={BookOpen}
          label="Articles live"
          value={blogPublished}
          sub={`+${blogPublished7d} this week`}
          href="/admin/content"
        />
        <KpiCard
          icon={Send}
          label="Outreach"
          value={pipelineTotal}
          sub={`${pipelineActive} active partner${pipelineActive === 1 ? "" : "s"}`}
          href="/admin/outreach"
        />
      </div>

      {/* ─── Outreach + Content (2-col) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Outreach stages */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Outreach pipeline by stage
            </h2>
            <Link href="/admin/outreach" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          </div>
          {/* Horizontal stacked bar */}
          {pipelineTotal > 0 && (
            <div className="flex h-3 w-full rounded-full overflow-hidden mb-3">
              {OUTREACH_BUCKETS.map((b) => {
                const count = b.stages.reduce((s, st) => s + (stageCount.get(st) || 0), 0);
                if (count === 0) return null;
                const widthPct = (count / pipelineTotal) * 100;
                return (
                  <div
                    key={b.label}
                    className={b.color}
                    style={{ width: `${widthPct}%` }}
                    title={`${b.label}: ${count}`}
                  />
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {OUTREACH_BUCKETS.map((b) => {
              const count = b.stages.reduce((s, st) => s + (stageCount.get(st) || 0), 0);
              return (
                <div key={b.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-sm ${b.color.split(" ")[0]}`} />
                    <span className="text-muted-foreground">{b.label}</span>
                  </span>
                  <span className="font-medium text-foreground tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content production */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Content production
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <Link href="/admin/content-calendar" className="text-primary hover:underline">
                Calendar
              </Link>
              <Link href="/admin/content" className="text-primary hover:underline">
                Articles →
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <ContentStat label="Planned" value={plannedTopics} color="text-blue-700 bg-blue-50" />
            <ContentStat label="Drafts" value={blogDraft} color="text-amber-700 bg-amber-50" />
            <ContentStat label="In pool" value={blogApproved} color="text-sky-700 bg-sky-50" />
            <ContentStat label="Live" value={blogPublished} color="text-emerald-700 bg-emerald-50" />
          </div>
          <div className="mt-3 pt-3 border-t border-surface-container-low text-[11px] text-muted-foreground flex items-center justify-between">
            <span>
              <span className="text-foreground font-medium">+{blogPublished7d}</span> published in 7d
            </span>
            <span>
              ~<span className="text-foreground font-medium">{daysOfContent}</span> day
              {daysOfContent === 1 ? "" : "s"} of pool · 3/day cadence
            </span>
          </div>
        </div>
      </div>

      {/* ─── Activity feed + Agent health (2-col) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {/* Activity feed (2/3 width on desktop) */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-surface-container-low">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-primary" />
              Live activity
            </h2>
            <span className="text-[11px] text-muted-foreground">latest {feed.length} events</span>
          </div>
          {feed.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-12">
              No recent activity yet.
            </p>
          ) : (
            <ol className="divide-y divide-surface-container-low">
              {feed.map((item) => {
                const style = ACTIVITY_STYLES[item.type];
                const Icon = style.icon;
                const inner = (
                  <div className="px-5 py-2.5 flex items-center gap-3 hover:bg-surface-container-low/40 transition-colors">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${style.color}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                      {relativeTime(item.ts)}
                    </span>
                  </div>
                );
                return (
                  <li key={item.id}>
                    {item.href ? <Link href={item.href}>{inner}</Link> : inner}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Right column: Agent health + traffic snapshot */}
        <div className="space-y-4">
          {/* Agent health */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Agent health
              </h2>
              <Link href="/admin/agents" className="text-xs text-primary hover:underline">
                Settings →
              </Link>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Enabled</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {enabledCount}/{settings.length}
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-surface-container-low overflow-hidden mb-3">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{ width: `${pct(enabledCount, settings.length)}%` }}
              />
            </div>
            {disabledAgents.length > 0 ? (
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="text-amber-600 font-medium">Disabled:</span>{" "}
                {disabledAgents.join(", ")}
              </p>
            ) : (
              <p className="text-[10px] text-emerald-600">All agents are running.</p>
            )}
            {(recentAgentLogRes.data || []).length > 0 && (
              <div className="mt-3 pt-3 border-t border-surface-container-low">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Last agent action
                </p>
                <p className="text-xs text-foreground">
                  {recentAgentLogRes.data![0].agent_type.replace(/_/g, " ")}{" "}
                  <span className="text-muted-foreground">
                    {recentAgentLogRes.data![0].action || "—"} ·{" "}
                    {relativeTime(recentAgentLogRes.data![0].created_at as string)} ago
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Traffic snapshot */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Traffic 7d
              </h2>
              <Link href="/admin/analytics" className="text-xs text-primary hover:underline">
                Open →
              </Link>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <p className="text-2xl font-semibold text-primary tabular-nums">
                {views7d.toLocaleString()}
              </p>
              <span className="text-[11px] text-muted-foreground">views</span>
            </div>
            {topCountries.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Top countries
                </p>
                <div className="space-y-1">
                  {topCountries.map(([c, n]) => {
                    const maxC = topCountries[0][1];
                    return (
                      <div key={c} className="flex items-center gap-2 text-xs">
                        <span className="text-foreground flex items-center gap-1.5 w-12">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          {c}
                        </span>
                        <div className="flex-1 h-1 bg-surface-container-low rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full"
                            style={{ width: `${(n / maxC) * 100}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground tabular-nums w-10 text-right">{n}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Recent leads + Pending tasks (2-col) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-surface-container-low">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Recent leads
            </h2>
            <Link href="/admin/leads" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          </div>
          {(recentLeadsRes.data || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No leads yet.</p>
          ) : (
            <div className="divide-y divide-surface-container-low">
              {(recentLeadsRes.data || []).slice(0, 5).map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-container-low/40 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-medium text-foreground shrink-0">
                    {(lead.name || "?")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{lead.name || "Anonymous"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {lead.email || "no email"}
                      {lead.urgency && (
                        <span className="ml-2 text-[10px] text-rose-600 uppercase">
                          {lead.urgency}
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0 ${
                      lead.status === "new"
                        ? "bg-blue-50 text-blue-700"
                        : lead.status === "forwarded"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-surface-container-high text-muted-foreground"
                    }`}
                  >
                    {(lead.status || "").replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-8 text-right">
                    {relativeTime(lead.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-surface-container-low">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Pending agent tasks
            </h2>
            <Link href="/admin/agents" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          </div>
          {(recentAgentTasksRes.data || []).length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-container-low">
              {(recentAgentTasksRes.data || []).slice(0, 5).map((task) => (
                <Link
                  key={task.id}
                  href="/admin/agents"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-container-low/40 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">
                      {task.ai_summary || "Task pending review"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {task.agent_type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {relativeTime(task.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── API costs ─── */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Platform costs · this month
          </h2>
          <span className="text-[10px] text-muted-foreground">Claude API</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <CostStat label="This month" value={`$${thisMonthCost.toFixed(2)}`} highlight />
          <CostStat label="Last month" value={`$${lastMonthCost.toFixed(2)}`} />
          <CostStat label="API calls" value={thisMonthCalls.toLocaleString()} />
          <CostStat
            label="Tokens"
            value={
              thisMonthTokens > 1_000_000
                ? `${(thisMonthTokens / 1_000_000).toFixed(1)}M`
                : thisMonthTokens > 1000
                ? `${(thisMonthTokens / 1000).toFixed(0)}K`
                : thisMonthTokens.toString()
            }
          />
        </div>
        {topAgentCosts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            {topAgentCosts.map(([agent, cost]) => {
              const sharePct = thisMonthCost > 0 ? (cost / thisMonthCost) * 100 : 0;
              return (
                <div key={agent} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-32 truncate">
                    {agent.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 h-1 bg-surface-container-low rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full"
                      style={{ width: `${Math.max(sharePct, 2)}%` }}
                    />
                  </div>
                  <span className="font-medium text-foreground tabular-nums w-14 text-right">
                    ${cost.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Bottom: deep-dive shortcuts ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <ShortcutLink href="/admin/centers" icon={Building2} label="Centers" />
        <ShortcutLink href="/admin/leads" icon={Inbox} label="Leads" />
        <ShortcutLink href="/admin/assessments" icon={Brain} label="Assessments" />
        <ShortcutLink href="/admin/outreach" icon={Send} label="Outreach" />
        <ShortcutLink href="/admin/content" icon={FileText} label="Articles" />
        <ShortcutLink href="/admin/content-calendar" icon={CalendarDays} label="Calendar" />
        <ShortcutLink href="/admin/analytics" icon={BarChart3} label="Analytics" />
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  sub: string;
  trend?: number | null;
  href?: string;
}) {
  const inner = (
    <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-ambient hover:shadow-ambient-lg transition-shadow duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        {trend !== undefined && trend !== null && (
          <span
            className={`flex items-center gap-0.5 text-[10px] font-medium ${
              trend > 0
                ? "text-emerald-600"
                : trend < 0
                ? "text-red-600"
                : "text-muted-foreground"
            }`}
          >
            {trend > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : null}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </p>
      <p className="text-2xl font-semibold text-foreground tabular-nums mt-0.5">
        {value.toLocaleString()}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function ContentStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-3 text-center ${color}`}>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] font-medium">{label}</p>
    </div>
  );
}

function CostStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 text-center ${
        highlight ? "bg-primary/5" : "bg-surface-container-low/50"
      }`}
    >
      <p
        className={`text-xl font-semibold tabular-nums ${
          highlight ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
    </div>
  );
}

function ShortcutLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 bg-surface-container-lowest rounded-xl px-3 py-2.5 shadow-ambient hover:shadow-ambient-lg transition-shadow duration-200"
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-xs font-medium text-foreground truncate">{label}</span>
    </Link>
  );
}

