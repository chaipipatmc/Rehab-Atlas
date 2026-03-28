import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BarChart3, TrendingUp, TrendingDown, Globe, Eye, Users, Brain, FileText, ExternalLink } from "lucide-react";

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Page views — this week vs last week
  const [
    { count: viewsThisWeek },
    { count: viewsLastWeek },
    { count: viewsThisMonth },
    { data: allViews },
    { count: totalLeads },
    { count: leadsThisMonth },
    { count: totalAssessments },
    { count: assessmentsThisMonth },
    { count: publishedArticles },
  ] = await Promise.all([
    supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
    supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("page_views").select("path, country, created_at").gte("created_at", thirtyDaysAgo),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("assessments").select("id", { count: "exact", head: true }).eq("completed", true),
    supabase.from("assessments").select("id", { count: "exact", head: true }).eq("completed", true).gte("created_at", thirtyDaysAgo),
    supabase.from("pages").select("id", { count: "exact", head: true }).eq("page_type", "blog").eq("status", "published"),
  ]);

  const weeklyGrowth = (viewsLastWeek || 0) > 0
    ? Math.round(((viewsThisWeek || 0) - (viewsLastWeek || 0)) / (viewsLastWeek || 1) * 100)
    : 0;

  // Daily breakdown (last 7 days)
  const dailyCounts = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    dailyCounts.set(d.toISOString().split("T")[0], 0);
  }
  (allViews || []).forEach((v) => {
    const day = new Date(v.created_at).toISOString().split("T")[0];
    if (dailyCounts.has(day)) dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
  });
  const maxDaily = Math.max(...dailyCounts.values(), 1);

  // Top pages
  const pageCount = new Map<string, number>();
  (allViews || []).forEach((v) => { pageCount.set(v.path, (pageCount.get(v.path) || 0) + 1); });
  const topPages = Array.from(pageCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const maxPageViews = topPages[0]?.[1] || 1;

  // Top countries
  const countryCount = new Map<string, number>();
  (allViews || []).forEach((v) => { if (v.country) countryCount.set(v.country, (countryCount.get(v.country) || 0) + 1); });
  const topCountries = Array.from(countryCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Page type breakdown
  let blogViews = 0, centerViews = 0, assessmentViews = 0, homeViews = 0, otherViews = 0;
  (allViews || []).forEach((v) => {
    if (v.path.startsWith("/blog")) blogViews++;
    else if (v.path.startsWith("/centers")) centerViews++;
    else if (v.path.startsWith("/assessment")) assessmentViews++;
    else if (v.path === "/") homeViews++;
    else otherViews++;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-headline-lg font-semibold text-foreground">Analytics</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Website traffic and conversion metrics. Last 30 days.
          </p>
        </div>
        <a
          href="https://analytics.google.com"
          target="_blank"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Google Analytics <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard icon={Eye} label="Page Views" value={viewsThisMonth || 0} sub="Last 30 days" />
        <MetricCard icon={Users} label="Leads" value={totalLeads || 0} sub={`${leadsThisMonth || 0} this month`} />
        <MetricCard icon={Brain} label="Assessments" value={totalAssessments || 0} sub={`${assessmentsThisMonth || 0} this month`} />
        <MetricCard icon={FileText} label="Published Articles" value={publishedArticles || 0} sub="Total" />
      </div>

      {/* Weekly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5 text-center">
          <p className="text-3xl font-semibold text-primary">{(viewsThisWeek || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Views This Week</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5 text-center">
          <div className="flex items-center justify-center gap-2">
            <p className="text-3xl font-semibold text-foreground">{weeklyGrowth > 0 ? "+" : ""}{weeklyGrowth}%</p>
            {weeklyGrowth > 0 ? <TrendingUp className="h-5 w-5 text-emerald-600" /> : weeklyGrowth < 0 ? <TrendingDown className="h-5 w-5 text-red-600" /> : null}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Week-over-Week</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5 text-center">
          <p className="text-3xl font-semibold text-foreground">{topCountries.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Countries</p>
        </div>
      </div>

      {/* Daily Chart */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5 mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-4">Daily Page Views (Last 7 Days)</h2>
        <div className="flex items-end gap-2 h-32">
          {Array.from(dailyCounts.entries()).map(([date, count]) => {
            const height = Math.max((count / maxDaily) * 100, 4);
            const dayLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{count}</span>
                <div className="w-full bg-primary/20 rounded-t-lg relative" style={{ height: `${height}%` }}>
                  <div className="absolute inset-0 bg-primary/60 rounded-t-lg" />
                </div>
                <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Home", count: homeViews, color: "bg-primary/10 text-primary" },
          { label: "Blog", count: blogViews, color: "bg-violet-50 text-violet-700" },
          { label: "Centers", count: centerViews, color: "bg-emerald-50 text-emerald-700" },
          { label: "Assessment", count: assessmentViews, color: "bg-amber-50 text-amber-700" },
          { label: "Other", count: otherViews, color: "bg-surface-container-low text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-lg font-semibold">{s.count}</p>
            <p className="text-[10px] font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Top Pages + Countries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Pages */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Top Pages</h2>
          <div className="space-y-2">
            {topPages.map(([path, count]) => (
              <div key={path} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground truncate max-w-[250px]">{path}</span>
                    <span className="text-xs font-medium text-muted-foreground shrink-0 ml-2">{count}</span>
                  </div>
                  <div className="h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                    <div className="h-full bg-primary/50 rounded-full" style={{ width: `${(count / maxPageViews) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {topPages.length === 0 && <p className="text-xs text-muted-foreground">No data yet</p>}
          </div>
        </div>

        {/* Top Countries */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Top Countries</h2>
          <div className="space-y-2">
            {topCountries.map(([country, count]) => (
              <div key={country} className="flex items-center justify-between text-xs py-1.5">
                <span className="text-foreground flex items-center gap-2">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  {country}
                </span>
                <span className="font-medium text-muted-foreground">{count} views</span>
              </div>
            ))}
            {topCountries.length === 0 && <p className="text-xs text-muted-foreground">No data yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-foreground">{value.toLocaleString()}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
