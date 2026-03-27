import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Building2, Users, Brain, Eye, Target, FileText,
  Clock, CheckCircle, AlertTriangle, Send, Layers,
  CalendarDays, BookOpen, Receipt,
} from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Parallel fetch all dashboard data
  const [
    { count: totalCenters },
    { count: publishedCenters },
    { count: draftCenters },
    { count: totalLeads },
    { count: newLeads },
    { count: forwardedLeads },
    { count: totalAssessments },
    { count: pendingEditRequests },
    { count: draftArticles },
    { count: approvedArticles },
    { count: publishedArticles },
    { count: pipelineTotal },
    { count: pipelineActive },
    { count: pendingAgentTasks },
  ] = await Promise.all([
    supabase.from("centers").select("*", { count: "exact", head: true }),
    supabase.from("centers").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("centers").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "forwarded"),
    supabase.from("assessments").select("*", { count: "exact", head: true }).eq("completed", true),
    supabase.from("center_edit_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("pages").select("*", { count: "exact", head: true }).eq("page_type", "blog").eq("status", "draft"),
    supabase.from("pages").select("*", { count: "exact", head: true }).eq("page_type", "blog").eq("status", "approved"),
    supabase.from("pages").select("*", { count: "exact", head: true }).eq("page_type", "blog").eq("status", "published"),
    supabase.from("outreach_pipeline").select("*", { count: "exact", head: true }),
    supabase.from("outreach_pipeline").select("*", { count: "exact", head: true }).in("stage", ["outreach_sent", "followed_up", "responded", "negotiating"]),
    supabase.from("agent_tasks").select("*", { count: "exact", head: true }).eq("status", "awaiting_owner"),
  ]);

  // Recent leads
  const { data: recentLeads } = await supabase
    .from("leads")
    .select("id, name, email, status, urgency, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // Recent agent tasks needing attention
  const { data: pendingTasks } = await supabase
    .from("agent_tasks")
    .select("id, agent_type, ai_summary, created_at")
    .eq("status", "awaiting_owner")
    .order("created_at", { ascending: false })
    .limit(5);

  // Items needing attention
  const actionItems = [
    { count: newLeads || 0, label: "new leads to review", href: "/admin/leads", icon: Users, color: "text-blue-700 bg-blue-50" },
    { count: pendingEditRequests || 0, label: "edit requests pending", href: "/admin/edit-requests", icon: Clock, color: "text-amber-700 bg-amber-50" },
    { count: draftArticles || 0, label: "articles to approve", href: "/admin/content", icon: FileText, color: "text-violet-700 bg-violet-50" },
    { count: pendingAgentTasks || 0, label: "agent tasks awaiting you", href: "/admin/agents", icon: AlertTriangle, color: "text-orange-700 bg-orange-50" },
  ].filter((item) => item.count > 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-headline-lg font-semibold text-foreground">System Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back. Here&apos;s what&apos;s happening across Rehab-Atlas.
        </p>
      </div>

      {/* Action Items — things that need your attention */}
      {actionItems.length > 0 && (
        <div className="mb-8 bg-surface-container-lowest rounded-2xl shadow-ambient p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Needs Your Attention</h2>
          <div className="flex flex-wrap gap-3">
            {actionItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 text-sm font-medium rounded-full px-4 py-2 ${item.color} hover:opacity-80 transition-opacity duration-200`}
              >
                <item.icon className="h-4 w-4" />
                {item.count} {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard icon={Building2} label="Centers" value={totalCenters || 0} sub={`${publishedCenters || 0} published · ${draftCenters || 0} draft`} href="/admin/centers" />
        <MetricCard icon={Users} label="Total Leads" value={totalLeads || 0} sub={`${newLeads || 0} new · ${forwardedLeads || 0} forwarded`} href="/admin/leads" />
        <MetricCard icon={Brain} label="Assessments" value={totalAssessments || 0} sub="completed" />
        <MetricCard icon={Target} label="Outreach Pipeline" value={pipelineTotal || 0} sub={`${pipelineActive || 0} active conversations`} href="/admin/outreach" />
      </div>

      {/* Content & Outreach Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Content Pipeline */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Content Pipeline</h2>
            </div>
            <Link href="/admin/content" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-amber-50 rounded-xl">
              <p className="text-xl font-semibold text-amber-700">{draftArticles || 0}</p>
              <p className="text-[10px] text-amber-600 font-medium">Drafts</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-xl font-semibold text-blue-700">{approvedArticles || 0}</p>
              <p className="text-[10px] text-blue-600 font-medium">In Pool</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <p className="text-xl font-semibold text-emerald-700">{publishedArticles || 0}</p>
              <p className="text-[10px] text-emerald-600 font-medium">Published</p>
            </div>
          </div>
          {(approvedArticles || 0) > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              ~{approvedArticles} day{(approvedArticles || 0) !== 1 ? "s" : ""} of content queued. Scheduler publishes 1/day.
            </p>
          )}
        </div>

        {/* Outreach Summary */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Outreach Pipeline</h2>
            </div>
            <Link href="/admin/outreach" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            <PipelineStat label="Total centers in pipeline" value={pipelineTotal || 0} />
            <PipelineStat label="Active conversations" value={pipelineActive || 0} />
            <PipelineStat label="Awaiting your action" value={pendingAgentTasks || 0} highlight />
          </div>
        </div>
      </div>

      {/* Recent Activity — Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Leads */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent Leads</h2>
            <Link href="/admin/leads" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="px-5 pb-4 space-y-2">
            {(recentLeads || []).map((lead) => (
              <Link
                key={lead.id}
                href={`/admin/leads/${lead.id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-container/30 hover:bg-surface-container/60 transition-colors duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-medium text-foreground shrink-0">
                    {(lead.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0 ${
                  lead.status === "new" ? "bg-blue-50 text-blue-700" :
                  lead.status === "forwarded" ? "bg-emerald-50 text-emerald-700" :
                  "bg-surface-container-high text-muted-foreground"
                }`}>
                  {lead.status?.replace(/_/g, " ")}
                </span>
              </Link>
            ))}
            {(!recentLeads || recentLeads.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">No leads yet.</p>
            )}
          </div>
        </div>

        {/* Pending Agent Tasks */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Pending Agent Tasks</h2>
            <Link href="/admin/agents" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="px-5 pb-4 space-y-2">
            {(pendingTasks || []).map((task) => {
              const agentLabels: Record<string, string> = {
                center_admin: "Center Review",
                content_admin: "Content Review",
                content_creator: "New Article",
                content_planner: "Calendar",
                lead_verify: "Lead Verify",
                outreach_research: "Outreach",
                outreach_response: "Reply",
                outreach_agreement: "Agreement",
              };
              return (
                <Link
                  key={task.id}
                  href="/admin/agents"
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-container/30 hover:bg-surface-container/60 transition-colors duration-200"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{task.ai_summary || "Task pending"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(task.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-amber-50 text-amber-700 shrink-0 ml-2">
                    {agentLabels[task.agent_type] || task.agent_type}
                  </span>
                </Link>
              );
            })}
            {(!pendingTasks || pendingTasks.length === 0) && (
              <div className="text-center py-6">
                <CheckCircle className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, href }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  sub: string;
  href?: string;
}) {
  const content = (
    <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient hover:shadow-ambient-lg transition-all duration-200">
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
  return href ? <Link href={href}>{content}</Link> : content;
}

function PipelineStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${highlight && value > 0 ? "text-amber-700" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
