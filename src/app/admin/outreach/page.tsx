"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Send, Users, MessageSquare, FileSignature, CheckCircle2, Target,
  Search, Filter, RefreshCw, Plus, ArrowRight, TrendingUp,
  Clock, AlertTriangle, XCircle, Loader2,
} from "lucide-react";

// --- Types ---

interface PipelineEntry {
  id: string;
  center_id: string;
  stage: string;
  follow_up_count: number;
  proposed_commission_rate: number;
  agreed_commission_rate: number | null;
  outreach_sent_at: string | null;
  responded_at: string | null;
  agreement_signed_at: string | null;
  updated_at: string;
  created_at: string;
  notes: string | null;
  centers: {
    name: string;
    country: string | null;
    city: string | null;
    email: string | null;
    website_url: string | null;
  };
}

interface FunnelMetrics {
  total: number;
  contacted: number;
  responded: number;
  negotiating: number;
  signed: number;
  active: number;
}

// --- Stage config ---

const STAGE_CONFIG: Record<string, { label: string; color: string; icon: typeof Send }> = {
  new: { label: "New", color: "bg-gray-100 text-gray-700", icon: Plus },
  researching: { label: "Researching", color: "bg-blue-100 text-blue-700", icon: Search },
  research_complete: { label: "Researched", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  outreach_drafted: { label: "Draft Ready", color: "bg-amber-100 text-amber-700", icon: Clock },
  outreach_sent: { label: "Contacted", color: "bg-sky-100 text-sky-700", icon: Send },
  followed_up: { label: "Followed Up", color: "bg-sky-100 text-sky-700", icon: RefreshCw },
  responded: { label: "Responded", color: "bg-emerald-100 text-emerald-700", icon: MessageSquare },
  negotiating: { label: "Negotiating", color: "bg-amber-100 text-amber-700", icon: MessageSquare },
  terms_agreed: { label: "Terms Agreed", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  agreement_drafted: { label: "Agreement Draft", color: "bg-amber-100 text-amber-700", icon: FileSignature },
  agreement_sent: { label: "Agreement Sent", color: "bg-violet-100 text-violet-700", icon: FileSignature },
  agreement_signed: { label: "Signed", color: "bg-emerald-100 text-emerald-700", icon: FileSignature },
  active: { label: "Active Partner", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  stalled: { label: "Stalled", color: "bg-gray-100 text-gray-600", icon: AlertTriangle },
  declined: { label: "Declined", color: "bg-red-100 text-red-700", icon: XCircle },
};

const STAGE_FILTERS = [
  { value: "all", label: "All Stages" },
  { value: "new", label: "New" },
  { value: "outreach_drafted", label: "Draft Ready" },
  { value: "outreach_sent", label: "Contacted" },
  { value: "followed_up", label: "Followed Up" },
  { value: "responded", label: "Responded" },
  { value: "negotiating", label: "Negotiating" },
  { value: "terms_agreed", label: "Terms Agreed" },
  { value: "agreement_sent", label: "Agreement Sent" },
  { value: "active", label: "Active" },
  { value: "stalled", label: "Stalled" },
  { value: "declined", label: "Declined" },
];

export default function OutreachDashboard() {
  const [pipelines, setPipelines] = useState<PipelineEntry[]>([]);
  const [metrics, setMetrics] = useState<FunnelMetrics>({ total: 0, contacted: 0, responded: 0, negotiating: 0, signed: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const params = new URLSearchParams();
    if (stageFilter !== "all") params.set("stage", stageFilter);
    if (search) params.set("search", search);
    params.set("page", String(page));

    const res = await fetch(`/api/agents/outreach/pipeline?${params}`);
    if (res.ok) {
      const data = await res.json();
      setPipelines(data.data || []);
      setTotal(data.total || 0);
    }

    // Load metrics from all pipelines
    const supabase = createClient();
    const { data: allPipelines } = await supabase
      .from("outreach_pipeline")
      .select("stage");

    if (allPipelines) {
      const contactedStages = ["outreach_sent", "followed_up", "responded", "negotiating", "terms_agreed", "agreement_drafted", "agreement_sent", "agreement_signed", "active", "stalled", "declined"];
      const respondedStages = ["responded", "negotiating", "terms_agreed", "agreement_drafted", "agreement_sent", "agreement_signed", "active"];
      const negotiatingStages = ["negotiating", "terms_agreed", "agreement_drafted"];
      const signedStages = ["agreement_signed", "active"];

      setMetrics({
        total: allPipelines.length,
        contacted: allPipelines.filter((p) => contactedStages.includes(p.stage as string)).length,
        responded: allPipelines.filter((p) => respondedStages.includes(p.stage as string)).length,
        negotiating: allPipelines.filter((p) => negotiatingStages.includes(p.stage as string)).length,
        signed: allPipelines.filter((p) => signedStages.includes(p.stage as string)).length,
        active: allPipelines.filter((p) => p.stage === "active").length,
      });
    }

    setLoading(false);
  }, [stageFilter, search, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success("Pipeline refreshed");
  }

  async function handleAddCenters() {
    // Open a simple prompt for center IDs (in a real app, this would be a modal with center search)
    const input = prompt("Enter center IDs to add (comma-separated):");
    if (!input) return;

    const ids = input.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return;

    const res = await fetch("/api/agents/outreach/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_centers", center_ids: ids }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success(`Added ${data.added} centers to pipeline`);
      loadData();
    } else {
      toast.error("Failed to add centers");
    }
  }

  function daysInStage(updatedAt: string): number {
    return Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  if (loading) return <div className="animate-pulse h-96 bg-surface-container rounded-2xl" />;

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-headline-lg font-semibold text-foreground">Outreach Pipeline</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Partner acquisition pipeline — research, outreach, negotiate, sign, activate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="rounded-full gradient-primary text-white text-xs"
            onClick={handleAddCenters}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Centers
          </Button>
        </div>
      </div>

      {/* Funnel Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
        {[
          { label: "Total", value: metrics.total, icon: Users, color: "text-primary" },
          { label: "Contacted", value: metrics.contacted, icon: Send, color: "text-sky-600" },
          { label: "Responded", value: metrics.responded, icon: MessageSquare, color: "text-emerald-600" },
          { label: "Negotiating", value: metrics.negotiating, icon: MessageSquare, color: "text-amber-600" },
          { label: "Signed", value: metrics.signed, icon: FileSignature, color: "text-violet-600" },
          { label: "Active", value: metrics.active, icon: CheckCircle2, color: "text-emerald-700" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-surface-container-lowest rounded-2xl p-4 shadow-ambient">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            {label !== "Total" && metrics.total > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {((value / metrics.total) * 100).toFixed(0)}% of total
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Conversion arrows */}
      <div className="hidden md:flex items-center justify-center gap-2 mb-8">
        {metrics.contacted > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowRight className="h-3 w-3" />
            <span>{metrics.total > 0 ? ((metrics.contacted / metrics.total) * 100).toFixed(0) : 0}% contacted</span>
          </div>
        )}
        {metrics.responded > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowRight className="h-3 w-3" />
            <span>{metrics.contacted > 0 ? ((metrics.responded / metrics.contacted) * 100).toFixed(0) : 0}% responded</span>
          </div>
        )}
        {metrics.active > 0 && (
          <div className="flex items-center gap-1 text-xs text-emerald-600">
            <TrendingUp className="h-3 w-3" />
            <span>{metrics.responded > 0 ? ((metrics.active / metrics.responded) * 100).toFixed(0) : 0}% converted</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search centers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 rounded-xl ghost-border"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={stageFilter}
            onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
            className="text-sm bg-surface-container-lowest rounded-lg px-2 py-1.5 ghost-border text-foreground"
          >
            {STAGE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Pipeline Table */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left px-6 py-3 font-medium">Center</th>
              <th className="text-left px-6 py-3 font-medium">Location</th>
              <th className="text-left px-6 py-3 font-medium">Stage</th>
              <th className="text-left px-6 py-3 font-medium">Commission</th>
              <th className="text-left px-6 py-3 font-medium">Last Update</th>
              <th className="text-left px-6 py-3 font-medium">Days</th>
              <th className="text-left px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pipelines.map((p) => {
              const stageInfo = STAGE_CONFIG[p.stage] || STAGE_CONFIG.new;
              const StageIcon = stageInfo.icon;
              const days = daysInStage(p.updated_at);

              return (
                <tr key={p.id} className="border-t border-surface-container-low hover:bg-surface-container-low/50 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <Link href={`/admin/outreach/${p.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                      {p.centers?.name || "Unknown"}
                    </Link>
                    {p.centers?.website_url && (
                      <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{p.centers.website_url}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {[p.centers?.city, p.centers?.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 ${stageInfo.color}`}>
                      <StageIcon className="h-3 w-3" />
                      {stageInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {p.agreed_commission_rate ? (
                      <span className="text-emerald-700 font-medium">{p.agreed_commission_rate}%</span>
                    ) : (
                      <span className="text-muted-foreground">{p.proposed_commission_rate}%</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {new Date(p.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium ${days > 14 ? "text-red-600" : days > 7 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {days}d
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/outreach/${p.id}`}
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {pipelines.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No centers in the pipeline yet. Click &quot;Add Centers&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-surface-container-low">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-7"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-7"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
