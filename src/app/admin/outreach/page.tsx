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
  Clock, AlertTriangle, XCircle, Loader2, MapPin,
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
    description: string | null;
    short_description: string | null;
    phone: string | null;
    address: string | null;
    treatment_focus: string[] | null;
    conditions: string[] | null;
    services: string[] | null;
    treatment_methods: string[] | null;
    setting_type: string | null;
    program_length: string | null;
    languages: string[] | null;
    pricing_text: string | null;
    accreditation: string | null;
    status: string | null;
    updated_at: string | null;
    is_unclaimed: boolean | null;
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

interface AgentTask {
  id: string;
  entity_id: string;
  status: string;
  checklist: {
    center_name?: string;
    to_email?: string;
    from_email?: string;
    subject?: string;
    body_text?: string;
  } | null;
}

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

function quickCompleteness(c: PipelineEntry["centers"]): number {
  if (!c) return 0;
  const checks = [
    !!c.name, !!c.description, !!c.short_description, !!c.country, !!c.city,
    !!c.address, !!c.phone, !!c.email, !!c.website_url,
    !!(c.treatment_focus && c.treatment_focus.length > 0),
    !!(c.conditions && c.conditions.length > 0),
    !!(c.services && c.services.length > 0),
    !!(c.treatment_methods && c.treatment_methods.length > 0),
    !!c.setting_type, !!c.program_length,
    !!(c.languages && c.languages.length > 0),
    !!c.pricing_text, !!c.accreditation,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function OutreachDashboard() {
  const [pipelines, setPipelines] = useState<PipelineEntry[]>([]);
  const [metrics, setMetrics] = useState<FunnelMetrics>({ total: 0, contacted: 0, responded: 0, negotiating: 0, signed: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [researching, setResearching] = useState(false);
  const [locationFilter, setLocationFilter] = useState("all");
  const [unclaimedFilter, setUnclaimedFilter] = useState("all");
  const [unclaimedCount, setUnclaimedCount] = useState(0);
  const [countries, setCountries] = useState<string[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [draftTasks, setDraftTasks] = useState<Record<string, AgentTask>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const params = new URLSearchParams();
    if (stageFilter !== "all") params.set("stage", stageFilter);
    if (search) params.set("search", search);
    params.set("page", String(page));

    let pipelineData: PipelineEntry[] = [];
    const res = await fetch(`/api/agents/outreach/pipeline?${params}`);
    if (res.ok) {
      const json = await res.json();
      pipelineData = json.data || [];
      setPipelines(pipelineData);
      setTotal(json.total || 0);
    }

    // Load metrics from all pipelines
    const supabase = createClient();
    const { data: allPipelines } = await supabase
      .from("outreach_pipeline")
      .select("stage");

    // Extract unique countries for filter
    const countrySet = new Set<string>();
    pipelineData.forEach((p: PipelineEntry) => {
      if (p.centers?.country) countrySet.add(p.centers.country);
    });
    // Also get from all pipelines
    const { data: allCountries } = await supabase
      .from("outreach_pipeline")
      .select("centers!inner(country)");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (allCountries || []).forEach((p: any) => {
      const c = Array.isArray(p.centers) ? p.centers[0] : p.centers;
      if (c?.country) countrySet.add(c.country);
    });
    setCountries(Array.from(countrySet).sort());

    // Count unclaimed listings
    const { count: ucCount } = await supabase
      .from("centers")
      .select("id", { count: "exact", head: true })
      .eq("is_unclaimed", true);
    setUnclaimedCount(ucCount || 0);

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

    // Load draft tasks for outreach_drafted pipelines
    const draftedPipelines = pipelineData.filter((p: PipelineEntry) => p.stage === "outreach_drafted");
    if (draftedPipelines.length > 0) {
      const pipelineIds = draftedPipelines.map((p: PipelineEntry) => p.id);
      const { data: tasks } = await supabase
        .from("agent_tasks")
        .select("id, entity_id, status, checklist")
        .eq("agent_type", "outreach_research")
        .eq("status", "awaiting_owner")
        .in("entity_id", pipelineIds);

      const taskMap: Record<string, AgentTask> = {};
      (tasks || []).forEach((t: AgentTask) => { taskMap[t.entity_id] = t; });
      setDraftTasks(taskMap);
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

  async function handleApproveEmail(taskId: string) {
    setApprovingId(taskId);
    try {
      const res = await fetch("/api/agents/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, decision: "approve" }),
      });
      if (res.ok) {
        toast.success("Email approved and sending...");
        setExpandedRow(null);
        setTimeout(() => loadData(), 2000);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to approve");
      }
    } catch {
      toast.error("Failed to approve email");
    }
    setApprovingId(null);
  }

  async function handleRejectEmail(taskId: string) {
    const reason = prompt("Reason for rejection (optional):");
    try {
      const res = await fetch("/api/agents/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, decision: "reject", reason }),
      });
      if (res.ok) {
        toast.success("Email rejected");
        setExpandedRow(null);
        loadData();
      } else {
        toast.error("Failed to reject");
      }
    } catch {
      toast.error("Failed to reject");
    }
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
          {metrics.total > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={async () => {
                setResearching(true);
                const newCount = pipelines.filter(p => p.stage === "new").length || metrics.total - metrics.contacted;
                toast.success(`Starting research for ${newCount} centers...`);
                // Trigger orchestrator multiple times in parallel batches
                const runs = Math.min(newCount, 20);
                for (let i = 0; i < runs; i++) {
                  fetch("/api/agents/outreach/research", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ center_id: "__batch__" }),
                  }).catch(() => {});
                  // Small delay between requests
                  await new Promise(r => setTimeout(r, 500));
                }
                // Wait a bit then refresh
                setTimeout(() => { loadData(); setResearching(false); }, 5000);
              }}
              disabled={researching}
            >
              <Search className={`h-3 w-3 mr-1 ${researching ? "animate-spin" : ""}`} />
              {researching ? "Researching..." : "Research All New"}
            </Button>
          )}
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
        <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <select
              value={locationFilter}
              onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
              className="text-sm bg-surface-container-lowest rounded-lg px-2 py-1.5 ghost-border text-foreground"
            >
              <option value="all">All Locations</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <select
              value={unclaimedFilter}
              onChange={(e) => { setUnclaimedFilter(e.target.value); setPage(1); }}
              className="text-sm bg-surface-container-lowest rounded-lg px-2 py-1.5 ghost-border text-foreground"
            >
              <option value="all">All Listings</option>
              <option value="unclaimed">Unclaimed ({unclaimedCount})</option>
              <option value="claimed">Claimed</option>
            </select>
          </div>
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
              <th className="text-left px-6 py-3 font-medium">Profile</th>
              <th className="text-left px-6 py-3 font-medium">Last Update</th>
              <th className="text-left px-6 py-3 font-medium">Days</th>
              <th className="text-left px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pipelines.filter((p) => {
              if (locationFilter !== "all" && p.centers?.country !== locationFilter) return false;
              if (unclaimedFilter === "unclaimed" && !p.centers?.is_unclaimed) return false;
              if (unclaimedFilter === "claimed" && p.centers?.is_unclaimed) return false;
              return true;
            }).map((p) => {
              const stageInfo = STAGE_CONFIG[p.stage] || STAGE_CONFIG.new;
              const StageIcon = stageInfo.icon;
              const days = daysInStage(p.updated_at);
              const hasDraft = p.stage === "outreach_drafted" && draftTasks[p.id];
              const isExpanded = expandedRow === p.id;
              const task = draftTasks[p.id];

              return (
                <tr key={p.id} className="border-t border-surface-container-low hover:bg-surface-container-low/50 transition-colors duration-200 group">
                  <td className="px-6 py-4" colSpan={isExpanded ? 7 : 1}>
                    {isExpanded && task?.checklist ? (
                      /* Expanded email preview */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{p.centers?.name || "Unknown"}</h3>
                            <p className="text-[10px] text-muted-foreground">{[p.centers?.city, p.centers?.country].filter(Boolean).join(", ")}</p>
                          </div>
                          <button onClick={() => setExpandedRow(null)} className="text-xs text-muted-foreground hover:text-foreground">
                            Close
                          </button>
                        </div>

                        <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span><strong className="text-foreground">To:</strong> {task.checklist.to_email}</span>
                            <span><strong className="text-foreground">From:</strong> {task.checklist.from_email || "info@rehab-atlas.com"}</span>
                          </div>
                          <div className="text-xs">
                            <strong className="text-foreground">Subject:</strong>{" "}
                            <span className="text-foreground">{task.checklist.subject}</span>
                          </div>
                          <div className="border-t border-surface-container pt-3">
                            <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                              {task.checklist.body_text}
                            </pre>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="rounded-full gradient-primary text-white text-xs"
                            onClick={() => handleApproveEmail(task.id)}
                            disabled={approvingId === task.id}
                          >
                            {approvingId === task.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3 mr-1" />
                            )}
                            Approve & Send
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full text-xs"
                            onClick={() => handleRejectEmail(task.id)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                          <Link
                            href={`/admin/outreach/${p.id}`}
                            className="text-xs text-primary hover:underline ml-2"
                          >
                            Full Details
                          </Link>
                        </div>
                      </div>
                    ) : (
                      /* Normal row - center name */
                      <>
                        <div className="flex items-center gap-1.5">
                          <Link href={`/admin/outreach/${p.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                            {p.centers?.name || "Unknown"}
                          </Link>
                          {p.centers?.is_unclaimed && (
                            <span className="text-[9px] font-medium text-amber-600 bg-amber-50 rounded px-1 py-0.5">Unclaimed</span>
                          )}
                        </div>
                        {p.centers?.website_url && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{p.centers.website_url}</p>
                        )}
                      </>
                    )}
                  </td>
                  {!isExpanded && (
                    <>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {[p.centers?.city, p.centers?.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 ${stageInfo.color}`}>
                          <StageIcon className="h-3 w-3" />
                          {stageInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const pct = quickCompleteness(p.centers);
                          return (
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className={`text-xs font-medium ${pct >= 80 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-red-500"}`}>{pct}%</span>
                            </div>
                          );
                        })()}
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
                        <div className="flex items-center gap-2">
                          {hasDraft && (
                            <button
                              onClick={() => setExpandedRow(p.id)}
                              className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
                            >
                              Preview Email
                            </button>
                          )}
                          <Link
                            href={`/admin/outreach/${p.id}`}
                            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </>
                  )}
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
