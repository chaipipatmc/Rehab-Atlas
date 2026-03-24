import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Building2, Users, Brain, TrendingUp, Eye } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: totalCenters },
    { count: publishedCenters },
    { count: totalLeads },
    { count: newLeads },
    { count: totalAssessments },
  ] = await Promise.all([
    supabase.from("centers").select("*", { count: "exact", head: true }),
    supabase.from("centers").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("assessments").select("*", { count: "exact", head: true }).eq("completed", true),
  ]);

  // Fetch recent leads
  const { data: recentLeads } = await supabase
    .from("leads")
    .select("id, name, email, status, urgency, preferred_center_id, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const metrics = [
    {
      label: "Total Centers",
      value: (totalCenters || 0).toLocaleString(),
      change: "—",
      icon: TrendingUp,
    },
    {
      label: "Assessments",
      value: (totalAssessments || 0).toLocaleString(),
      change: "—",
      icon: Brain,
    },
    {
      label: "New Leads",
      value: (newLeads || 0).toLocaleString(),
      change: "—",
      icon: Users,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-headline-lg font-semibold text-foreground">System Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back. Here&apos;s what&apos;s happening across your rehabilitation network today.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <m.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs text-primary font-medium">
                {m.change}
              </span>
            </div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className="text-3xl font-semibold text-foreground mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Leads Table */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recent Leads</h2>
            <p className="text-xs text-muted-foreground">Manage and monitor incoming patient inquiries</p>
          </div>
          <Link
            href="/admin/leads"
            className="text-xs text-primary hover:text-primary-dim transition-colors duration-300"
          >
            View all leads →
          </Link>
        </div>

        <table className="w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left px-6 py-3 font-medium">Patient Name</th>
              <th className="text-left px-6 py-3 font-medium">Date Received</th>
              <th className="text-left px-6 py-3 font-medium">Status</th>
              <th className="text-left px-6 py-3 font-medium">Urgency</th>
              <th className="text-left px-6 py-3 font-medium">Preferred Center</th>
              <th className="text-left px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(recentLeads || []).map((lead) => (
              <tr key={lead.id} className="border-t border-surface-container-low hover:bg-surface-container-low/50 transition-colors duration-200">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-medium text-foreground">
                      {(lead.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-foreground">{lead.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {new Date(lead.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium ${
                    lead.status === "new" ? "text-primary" :
                    lead.status === "under_review" ? "text-amber-600" :
                    lead.status === "forwarded" ? "text-emerald-600" :
                    "text-muted-foreground"
                  }`}>
                    {lead.status?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                    lead.urgency === "urgent" ? "bg-destructive/10 text-destructive" :
                    lead.urgency === "soon" ? "bg-amber-100 text-amber-700" :
                    "bg-surface-container-high text-muted-foreground"
                  }`}>
                    {lead.urgency ? lead.urgency.charAt(0).toUpperCase() + lead.urgency.slice(1) : "—"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {lead.preferred_center_id ? "Specified" : "—"}
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container-high transition-colors duration-300"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
            {(!recentLeads || recentLeads.length === 0) && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No leads yet. They will appear here once inquiries come in.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
