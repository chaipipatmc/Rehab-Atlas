import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Brain,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Laptop,
  MousePointerClick,
  Search,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 600;

// ─── Types ──────────────────────────────────────────────────────────────────

type RangeKey = "7d" | "30d" | "90d" | "365d";

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

// ─── Config ─────────────────────────────────────────────────────────────────

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "365d", label: "1 year", days: 365 },
];

const SECTION_RULES: { label: string; match: (p: string) => boolean; color: string }[] = [
  { label: "Home", match: (p) => p === "/", color: "text-primary" },
  { label: "Centers", match: (p) => p.startsWith("/centers"), color: "text-emerald-600" },
  { label: "Hub pages", match: (p) => p.startsWith("/rehab-in") || p.startsWith("/rehab/"), color: "text-sky-600" },
  { label: "Blog", match: (p) => p.startsWith("/blog") || p.startsWith("/articles"), color: "text-violet-600" },
  { label: "Assessment", match: (p) => p.startsWith("/assessment"), color: "text-amber-600" },
  { label: "Inquiry", match: (p) => p.startsWith("/inquiry"), color: "text-rose-600" },
  { label: "Account", match: (p) => p.startsWith("/account") || p.startsWith("/login") || p.startsWith("/signup"), color: "text-gray-500" },
];

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|googlebot/i;
const MOBILE_RE = /mobile|iphone|android/i;

// ─── Helpers ────────────────────────────────────────────────────────────────

function classifySection(path: string): string {
  for (const rule of SECTION_RULES) if (rule.match(path)) return rule.label;
  return "Other";
}

function classifyDevice(ua: string | null): "Mobile" | "Desktop" | "Bot" {
  if (!ua) return "Desktop";
  if (BOT_RE.test(ua)) return "Bot";
  if (MOBILE_RE.test(ua)) return "Mobile";
  return "Desktop";
}

function classifySource(referrer: string | null): string {
  if (!referrer) return "Direct";
  const r = referrer.toLowerCase();
  if (/(rehab-atlas|localhost|vercel\.app)/.test(r)) return "Internal";
  if (/google\./.test(r)) return "Google";
  if (/bing\./.test(r)) return "Bing";
  if (/duckduckgo\./.test(r)) return "DuckDuckGo";
  if (/(facebook\.|fb\.)/.test(r)) return "Facebook";
  if (/instagram\./.test(r)) return "Instagram";
  if (/linkedin\./.test(r)) return "LinkedIn";
  if (/(twitter\.|x\.com|t\.co)/.test(r)) return "X/Twitter";
  if (/reddit\./.test(r)) return "Reddit";
  if (/youtube\./.test(r)) return "YouTube";
  if (/tiktok\./.test(r)) return "TikTok";
  if (/pinterest\./.test(r)) return "Pinterest";
  return "Other";
}

function pct(num: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.round((num / denom) * 100);
}

function delta(curr: number, prev: number): { pct: number; up: boolean | null } {
  if (prev === 0) return { pct: 0, up: null };
  const diff = ((curr - prev) / prev) * 100;
  return { pct: Math.round(Math.abs(diff)), up: diff > 0 };
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rangeKey: RangeKey =
    (RANGES.find((r) => r.key === params.range)?.key as RangeKey) || "30d";
  const range = RANGES.find((r) => r.key === rangeKey)!;

  const admin = createAdminClient();

  const now = Date.now();
  const startISO = new Date(now - range.days * 86400000).toISOString();
  const prevStartISO = new Date(now - range.days * 2 * 86400000).toISOString();
  const startDate = new Date(now - range.days * 86400000);

  // ─── Fetch (parallel) ─────────────────────────────────────────────────────

  const [
    pageViewsCurrent,
    pageViewsPrev,
    leadsCurrentRes,
    leadsPrevRes,
    leadsTotalRes,
    forwardedRes,
    assessmentsCurrentRes,
    assessmentsPrevRes,
    assessmentsTotalRes,
    publishedArticlesRes,
    publishedCentersRes,
  ] = await Promise.all([
    admin
      .from("page_views")
      .select("path, country, referrer, user_agent, session_id, created_at")
      .gte("created_at", startISO),
    admin
      .from("page_views")
      .select("session_id, created_at", { count: "exact" })
      .gte("created_at", prevStartISO)
      .lt("created_at", startISO),
    admin.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startISO),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", prevStartISO)
      .lt("created_at", startISO),
    admin.from("leads").select("id", { count: "exact", head: true }),
    admin.from("lead_forwards").select("id", { count: "exact", head: true }).eq("partner_status", "admitted"),
    admin
      .from("assessments")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startISO),
    admin
      .from("assessments")
      .select("id", { count: "exact", head: true })
      .gte("created_at", prevStartISO)
      .lt("created_at", startISO),
    admin.from("assessments").select("id", { count: "exact", head: true }),
    admin
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("page_type", "blog")
      .eq("status", "published"),
    admin
      .from("centers")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
  ]);

  const allViews = pageViewsCurrent.data || [];
  const viewsCurrent = allViews.length;
  const viewsPrev = pageViewsPrev.count || 0;
  const leadsCurrent = leadsCurrentRes.count || 0;
  const leadsPrev = leadsPrevRes.count || 0;
  const leadsTotal = leadsTotalRes.count || 0;
  const admittedTotal = forwardedRes.count || 0;
  const assessmentsCurrent = assessmentsCurrentRes.count || 0;
  const assessmentsPrev = assessmentsPrevRes.count || 0;
  const assessmentsTotal = assessmentsTotalRes.count || 0;
  const publishedArticles = publishedArticlesRes.count || 0;
  const publishedCenters = publishedCentersRes.count || 0;

  // ─── Aggregations (in-memory) ─────────────────────────────────────────────

  const sessionsCurrent = new Set<string>();
  const sessionsPrev = new Set<string>(); // tracked but the previous fetch is count-only

  // Daily buckets
  const dailyViews = new Map<string, number>();
  const dailySessions = new Map<string, Set<string>>();
  for (let i = range.days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().split("T")[0];
    dailyViews.set(key, 0);
    dailySessions.set(key, new Set());
  }

  const sectionViews = new Map<string, number>();
  const pathViews = new Map<string, number>();
  const countryViews = new Map<string, number>();
  const sourceViews = new Map<string, number>();
  const sourceSessions = new Map<string, Set<string>>();
  const deviceViews = new Map<string, number>();

  // Path-specific funnel checks
  let assessmentPageViews = 0;
  let assessmentResultsViews = 0;
  let inquiryPageViews = 0;

  for (const v of allViews) {
    const path = v.path || "";
    const day = (v.created_at || "").slice(0, 10);

    if (v.session_id) sessionsCurrent.add(v.session_id);

    if (dailyViews.has(day)) {
      dailyViews.set(day, (dailyViews.get(day) || 0) + 1);
      if (v.session_id) dailySessions.get(day)!.add(v.session_id);
    }

    const section = classifySection(path);
    sectionViews.set(section, (sectionViews.get(section) || 0) + 1);
    pathViews.set(path, (pathViews.get(path) || 0) + 1);

    if (v.country) countryViews.set(v.country, (countryViews.get(v.country) || 0) + 1);

    const source = classifySource(v.referrer);
    sourceViews.set(source, (sourceViews.get(source) || 0) + 1);
    if (v.session_id) {
      if (!sourceSessions.has(source)) sourceSessions.set(source, new Set());
      sourceSessions.get(source)!.add(v.session_id);
    }

    const device = classifyDevice(v.user_agent);
    deviceViews.set(device, (deviceViews.get(device) || 0) + 1);

    if (path === "/assessment" || path.startsWith("/assessment?")) assessmentPageViews++;
    if (path.startsWith("/assessment/results")) assessmentResultsViews++;
    if (path === "/inquiry" || path.startsWith("/inquiry?") || path.startsWith("/inquiry/")) inquiryPageViews++;
  }

  void sessionsPrev; // intentionally unused — prev fetch is count-only

  // Sort + slice
  const topPaths = Array.from(pathViews.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const topCountries = Array.from(countryViews.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topSources = Array.from(sourceViews.entries()).sort((a, b) => b[1] - a[1]);

  const sessionCount = sessionsCurrent.size;
  const sessionCoverage = pct(allViews.filter((v) => v.session_id).length, viewsCurrent);

  // Daily peak for chart scaling
  const maxDaily = Math.max(...Array.from(dailyViews.values()), 1);

  // Funnel data
  const funnelSteps = [
    { label: "Visitors", value: sessionCount > 0 ? sessionCount : viewsCurrent, sub: sessionCount > 0 ? "unique sessions" : "page views (sessions not yet tracked)" },
    { label: "Assessment views", value: assessmentPageViews, sub: "/assessment hits" },
    { label: "Assessments completed", value: assessmentsCurrent, sub: "stored in DB" },
    { label: "Inquiries submitted", value: leadsCurrent, sub: "leads created" },
  ];

  // Deltas
  const dViews = delta(viewsCurrent, viewsPrev);
  const dLeads = delta(leadsCurrent, leadsPrev);
  const dAssessments = delta(assessmentsCurrent, assessmentsPrev);
  const conversionRate = sessionCount > 0 ? (leadsCurrent / sessionCount) * 100 : 0;
  const prevSessions = pageViewsPrev.count || 0;
  // Approximate previous conversion if we don't track sessions in prev (best-effort)
  const prevConversion = prevSessions > 0 ? (leadsPrev / prevSessions) * 100 : 0;

  // Largest segment (for relative bars in source/device sections)
  const maxSourceViews = Math.max(...Array.from(sourceViews.values()), 1);
  const maxDeviceViews = Math.max(...Array.from(deviceViews.values()), 1);
  const maxPathViews = topPaths[0]?.[1] || 1;
  const maxCountryViews = topCountries[0]?.[1] || 1;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-headline-lg font-semibold text-foreground">Analytics</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Traffic, funnel, and conversion. Window:{" "}
            <span className="text-foreground">{startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>{" "}
            → today.
          </p>
        </div>
        <a
          href="https://analytics.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Open Google Analytics <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Range selector */}
      <div className="flex items-center gap-1.5 bg-surface-container-low rounded-full p-1 mb-6 w-fit">
        {RANGES.map((r) => {
          const active = r.key === rangeKey;
          return (
            <Link
              key={r.key}
              href={`/admin/analytics?range=${r.key}`}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </Link>
          );
        })}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={Users}
          label="Visitors"
          value={sessionCount}
          fallbackValue={viewsCurrent}
          showFallback={sessionCount === 0}
          fallbackLabel="page views (sessions not tracked yet)"
          delta={null}
          sub={sessionCount > 0 ? `${sessionCoverage}% session coverage` : undefined}
        />
        <KpiCard
          icon={Eye}
          label="Page Views"
          value={viewsCurrent}
          delta={dViews}
        />
        <KpiCard
          icon={Brain}
          label="Assessments"
          value={assessmentsCurrent}
          delta={dAssessments}
          sub={`${formatNumber(assessmentsTotal)} total`}
          href="/admin/assessments"
        />
        <KpiCard
          icon={MousePointerClick}
          label="Leads"
          value={leadsCurrent}
          delta={dLeads}
          sub={`${formatNumber(leadsTotal)} total · ${admittedTotal} admitted`}
          href="/admin/leads"
        />
      </div>

      {/* Conversion summary */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Conversion</p>
          {prevConversion > 0 && (
            <DeltaPill curr={conversionRate} prev={prevConversion} suffix="pp" />
          )}
        </div>
        <p className="text-2xl font-semibold text-foreground">
          {conversionRate.toFixed(1)}%{" "}
          <span className="text-xs font-normal text-muted-foreground">visitor → lead</span>
        </p>
      </div>

      {/* Funnel */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Conversion Funnel</h2>
          <span className="text-[11px] text-muted-foreground">
            {range.label} · drop-off shown between steps
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
          {funnelSteps.map((step, i) => {
            const prev = i > 0 ? funnelSteps[i - 1].value : 0;
            const stepRate = i > 0 && prev > 0 ? Math.round((step.value / prev) * 100) : null;
            return (
              <FunnelStepWithArrow
                key={step.label}
                step={step}
                isLast={i === funnelSteps.length - 1}
                stepRate={stepRate}
              />
            );
          })}
        </div>
      </div>

      {/* Trend chart */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Daily traffic</h2>
          <span className="text-[11px] text-muted-foreground">
            Peak: {maxDaily} views
          </span>
        </div>
        {/* h-36 = 144px chart area. Each column is flex-col with a fixed-
            height bar area on top (h-32 = 128px) and the date label below;
            without an explicitly-sized parent, the `height: X%` on each bar
            resolves against an undefined value and the bars collapse to 0 —
            which is the symptom we used to see (blank chart). */}
        <div className="flex items-end gap-1 h-44">
          {Array.from(dailyViews.entries()).map(([date, count]) => {
            const sessionsForDay = dailySessions.get(date)!.size;
            const heightPct = Math.max((count / maxDaily) * 100, 2);
            const sessionPct = count > 0 ? (sessionsForDay / count) * 100 : 0;
            const isWeekend = [0, 6].includes(new Date(date + "T00:00:00").getDay());
            const showLabel = range.days <= 14 || new Date(date + "T00:00:00").getDate() % 5 === 0;
            return (
              <div key={date} className="flex-1 flex flex-col items-stretch group">
                {/* Bar area — fixed height so the % on the child bar resolves */}
                <div className="relative h-32 flex flex-col justify-end">
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                    {count}
                  </span>
                  <div
                    className={`w-full rounded-t-md relative ${isWeekend ? "bg-primary/15" : "bg-primary/25"}`}
                    style={{ height: `${heightPct}%` }}
                    title={`${date}: ${count} views, ${sessionsForDay} sessions`}
                  >
                    {sessionPct > 0 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-md"
                        style={{ height: `${sessionPct}%` }}
                      />
                    )}
                  </div>
                </div>
                {showLabel ? (
                  <span className="text-[9px] text-muted-foreground tabular-nums text-center mt-1">
                    {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "numeric",
                      day: "numeric",
                    })}
                  </span>
                ) : (
                  <span className="text-[9px] mt-1">&nbsp;</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-4 mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-primary" />
            Sessions
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-primary/25" />
            Views
          </span>
        </div>
      </div>

      {/* Two-up: Sources + Devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Traffic Sources */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              Traffic sources
            </h2>
            <span className="text-[11px] text-muted-foreground">by views</span>
          </div>
          {topSources.length === 0 ? (
            <p className="text-xs text-muted-foreground">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {topSources.map(([source, count]) => {
                const sessionsForSource = sourceSessions.get(source)?.size || 0;
                return (
                  <div key={source}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-foreground">{source}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {formatNumber(count)} views
                        {sessionsForSource > 0 && (
                          <span className="ml-1.5 opacity-60">· {sessionsForSource} sessions</span>
                        )}
                      </span>
                    </div>
                    <div className="h-1 bg-surface-container-low rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          source === "Internal" ? "bg-gray-300" : "bg-primary/60"
                        }`}
                        style={{ width: `${(count / maxSourceViews) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {sessionCoverage < 50 && (
            <p className="mt-4 text-[10px] text-muted-foreground italic">
              Note: session-level attribution started recently; older rows count only views.
            </p>
          )}
        </div>

        {/* Devices */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            Devices
          </h2>
          {deviceViews.size === 0 ? (
            <p className="text-xs text-muted-foreground">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {Array.from(deviceViews.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([device, count]) => {
                  const Icon = device === "Mobile" ? Smartphone : device === "Bot" ? Globe : Laptop;
                  return (
                    <div key={device}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-foreground flex items-center gap-1.5">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                          {device}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {formatNumber(count)} ({pct(count, viewsCurrent)}%)
                        </span>
                      </div>
                      <div className="h-1 bg-surface-container-low rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            device === "Bot" ? "bg-gray-300" : "bg-primary/60"
                          }`}
                          style={{ width: `${(count / maxDeviceViews) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Section breakdown */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Views by section</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {[...SECTION_RULES.map((r) => r.label), "Other"].map((label) => {
            const count = sectionViews.get(label) || 0;
            const sharePct = pct(count, viewsCurrent);
            const rule = SECTION_RULES.find((r) => r.label === label);
            return (
              <div
                key={label}
                className="rounded-xl bg-surface-container-low/40 p-3 text-center"
              >
                <p className={`text-lg font-semibold tabular-nums ${rule?.color || "text-muted-foreground"}`}>
                  {formatNumber(count)}
                </p>
                <p className="text-[10px] text-foreground font-medium">{label}</p>
                <p className="text-[9px] text-muted-foreground">{sharePct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-up: Top Pages + Top Countries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Top Pages */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Top pages</h2>
          {topPaths.length === 0 ? (
            <p className="text-xs text-muted-foreground">No data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {topPaths.map(([path, count]) => {
                const section = classifySection(path);
                const rule = SECTION_RULES.find((r) => r.label === section);
                return (
                  <div key={path}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                            rule ? rule.color.replace("text-", "bg-") : "bg-gray-300"
                          }`}
                        />
                        <span className="text-xs text-foreground truncate" title={path}>
                          {path}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground shrink-0 tabular-nums">
                        {formatNumber(count)}
                      </span>
                    </div>
                    <div className="h-1 bg-surface-container-low rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/50 rounded-full"
                        style={{ width: `${(count / maxPathViews) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Countries */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Top countries</h2>
          {topCountries.length === 0 ? (
            <p className="text-xs text-muted-foreground">No data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {topCountries.map(([country, count]) => (
                <div key={country}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-foreground flex items-center gap-2">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      {country}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">
                      {formatNumber(count)}
                    </span>
                  </div>
                  <div className="h-1 bg-surface-container-low rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/50 rounded-full"
                      style={{ width: `${(count / maxCountryViews) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer mini-stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <FooterStat icon={FileText} label="Published articles" value={publishedArticles} href="/admin/content" />
        <FooterStat icon={Globe} label="Published centers" value={publishedCenters} href="/admin/centers" />
        <FooterStat icon={Brain} label="Assessment views" value={assessmentPageViews} href="/admin/assessments" />
        <FooterStat icon={TrendingUp} label="Results page views" value={assessmentResultsViews} />
      </div>

      <p className="text-[10px] text-muted-foreground mt-6 text-center">
        Data window: {range.label} · {formatNumber(viewsCurrent)} views ·{" "}
        {sessionCount > 0 ? `${formatNumber(sessionCount)} sessions` : "session tracking limited"} ·{" "}
        {topCountries.length} countries · {topSources.length} sources
      </p>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  fallbackValue,
  showFallback,
  fallbackLabel,
  delta,
  sub,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  fallbackValue?: number;
  showFallback?: boolean;
  fallbackLabel?: string;
  delta: { pct: number; up: boolean | null } | null;
  sub?: string;
  href?: string;
}) {
  const display = showFallback && fallbackValue != null ? fallbackValue : value;
  const inner = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {delta && delta.up !== null && (
          <span
            className={`flex items-center gap-0.5 text-[10px] font-medium ${
              delta.up ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {delta.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {delta.pct}%
          </span>
        )}
      </div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">{label}</p>
      <p className="text-2xl font-semibold text-foreground tabular-nums">
        {formatNumber(display)}
      </p>
      <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
        {showFallback && fallbackLabel ? fallbackLabel : sub || ""}
      </p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient block hover:shadow-ambient-lg transition-shadow duration-300"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient">{inner}</div>
  );
}

function DeltaPill({ curr, prev, suffix }: { curr: number; prev: number; suffix?: string }) {
  const diff = curr - prev;
  const up = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
        up ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"
      }`}
    >
      {up ? <ArrowUp className="h-3 w-3" /> : diff < 0 ? <ArrowDown className="h-3 w-3" /> : null}
      {Math.abs(diff).toFixed(1)}{suffix || "%"}
    </span>
  );
}

function FunnelStepWithArrow({
  step,
  isLast,
  stepRate,
}: {
  step: { label: string; value: number; sub: string };
  isLast: boolean;
  stepRate: number | null;
}) {
  return (
    <>
      <div className="rounded-xl bg-surface-container-low/40 p-4 text-center md:col-span-1">
        <p className="text-2xl font-semibold text-primary tabular-nums">{formatNumber(step.value)}</p>
        <p className="text-xs text-foreground font-medium mt-1">{step.label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{step.sub}</p>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center justify-center md:col-span-1 py-2 md:py-0">
          {stepRate !== null ? (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {stepRate}%
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">—</span>
          )}
          <ArrowRight className="h-4 w-4 text-muted-foreground/50 hidden md:block" />
          <ArrowDown className="h-4 w-4 text-muted-foreground/50 md:hidden" />
        </div>
      )}
    </>
  );
}

function FooterStat({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  href?: string;
}) {
  const inner = (
    <div className="bg-surface-container-lowest rounded-xl p-4 flex items-center gap-3 shadow-ambient">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground tabular-nums">{formatNumber(value)}</p>
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
