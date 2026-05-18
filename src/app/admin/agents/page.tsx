"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Building2, FileText, UserSearch, Clock,
  CheckCircle, XCircle, AlertCircle, Loader2,
  Bot, Zap, Search, Send, MessageSquare, FileSignature,
  Activity, Target, PenTool, CalendarClock,
  ChevronDown, ChevronUp, Settings2, ListTodo, RefreshCw,
  Sliders, Save, ShieldCheck,
} from "lucide-react";

interface AgentConfig {
  center_admin: boolean;
  content_admin: boolean;
  follow_up: boolean;
  lead_verify: boolean;
  outreach_research: boolean;
  outreach_followup: boolean;
  outreach_response: boolean;
  outreach_agreement: boolean;
  outreach_activation: boolean;
  outreach_orchestrator: boolean;
  content_creator: boolean;
  content_scheduler: boolean;
  content_planner: boolean;
  content_auto_approve: boolean;
  content_orchestrator: boolean;
  system_orchestrator: boolean;
  data_verifier: boolean;
}

interface AgentTaskRow {
  id: string;
  agent_type: string;
  entity_type: string;
  status: string;
  ai_recommendation: string | null;
  ai_summary: string | null;
  created_at: string;
  owner_decision: string | null;
  action_token: string | null;
  checklist: Record<string, unknown> | null;
}

const AGENT_GROUPS = [
  {
    title: "System",
    agents: ["system_orchestrator"],
  },
  {
    title: "Internal Agents",
    agents: ["center_admin", "data_verifier", "content_admin", "lead_verify", "follow_up"],
  },
  {
    title: "Outreach Pipeline",
    agents: ["outreach_orchestrator", "outreach_research", "outreach_followup", "outreach_response", "outreach_agreement", "outreach_activation"],
  },
  {
    title: "Content Agents",
    agents: ["content_orchestrator", "content_planner", "content_creator", "content_auto_approve", "content_scheduler"],
  },
];

const AGENT_INFO: Record<string, { label: string; description: string; icon: typeof Building2; color: string }> = {
  center_admin: { label: "Center Admin", description: "Verifies center profile completeness and reviews content quality.", icon: Building2, color: "text-primary" },
  data_verifier: { label: "Data Verifier", description: "Nightly: cross-checks each center's facts against its official website and verifies photo provenance via Claude Vision. Flags mismatches and suspicious photos for one-click review.", icon: ShieldCheck, color: "text-emerald-700" },
  content_admin: { label: "Content Admin", description: "Reviews blog posts for relevance, medical accuracy, and SEO quality.", icon: FileText, color: "text-emerald-600" },
  lead_verify: { label: "Lead Verify", description: "Validates inquiries, checks commission agreements, verifies match quality.", icon: UserSearch, color: "text-amber-600" },
  follow_up: { label: "Follow-up", description: "Sends daily reminders for incomplete profiles and stale content.", icon: Clock, color: "text-violet-600" },
  outreach_research: { label: "Research & Draft", description: "Researches center websites and drafts personalized outreach emails.", icon: Search, color: "text-sky-600" },
  outreach_followup: { label: "Follow-up", description: "Auto-sends follow-up emails (Day 3, 7, 14) to unresponsive centers.", icon: Send, color: "text-sky-600" },
  outreach_response: { label: "Response Handler", description: "Detects inbound replies, analyzes sentiment, routes next steps.", icon: MessageSquare, color: "text-emerald-600" },
  outreach_agreement: { label: "Agreement", description: "Prepares partnership agreements via PandaDoc for e-signature.", icon: FileSignature, color: "text-violet-600" },
  outreach_activation: { label: "Activation", description: "Updates center data after agreement signing. Sends welcome emails.", icon: Activity, color: "text-emerald-600" },
  outreach_orchestrator: { label: "Orchestrator", description: "Coordinates all outreach agents and advances pipeline stages.", icon: Target, color: "text-primary" },
  content_creator: { label: "Content Creator", description: "Writes SEO blog articles with Unsplash images. Runs weekdays.", icon: PenTool, color: "text-rose-600" },
  content_scheduler: { label: "Scheduler", description: "Publishes 1 approved article per day at optimal time.", icon: CalendarClock, color: "text-indigo-600" },
  content_planner: { label: "Planner", description: "Plans monthly editorial calendar with 2-3 topics per weekday.", icon: CalendarClock, color: "text-violet-600" },
  content_auto_approve: { label: "Auto-Approve", description: "Automatically approves draft articles that pass quality checks (word count, images, SEO, tags). When OFF, you review manually.", icon: CheckCircle, color: "text-emerald-600" },
  content_orchestrator: { label: "Content Orchestrator", description: "Domain supervisor for the content pillar. Detects stalls (no calendar for next month, pool below target, nothing published today) and triggers the right leaf agent. Runs every 30 min.", icon: Target, color: "text-violet-600" },
  system_orchestrator: { label: "System Orchestrator", description: "Top-level health watcher. Compares each agent's last run to its expected interval and surfaces stale agents on the dashboard. Read-only — does not coordinate work between agents (each pillar still has its own orchestrator). Runs every 10 min.", icon: Activity, color: "text-primary" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  awaiting_owner: { label: "Awaiting You", color: "bg-amber-100 text-amber-800", icon: AlertCircle },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
  pending: { label: "Processing", color: "bg-blue-100 text-blue-800", icon: Loader2 },
  error: { label: "Error", color: "bg-red-100 text-red-800", icon: XCircle },
  expired: { label: "Expired", color: "bg-gray-100 text-gray-800", icon: Clock },
};

// ─── Per-agent editable knobs ───────────────────────────────────────────────
//
// Only knobs listed here are exposed in the UI. They are persisted to
// site_settings via /api/agents/settings and read by agent code at runtime.
// See src/lib/agents/config.ts and the corresponding agent .ts files.

interface AgentKnob {
  key: string;
  label: string;
  description: string;
  type: "number" | "text" | "csv-numbers";
  default: string;
  unit?: string;
  min?: number;
  max?: number;
}

const AGENT_KNOBS: Record<string, AgentKnob[]> = {
  content_creator: [
    {
      key: "pool_target",
      label: "Pool target",
      description: "Stop drafting once this many articles are in the pool (drafts + approved, not yet published).",
      type: "number",
      default: "20",
      min: 5,
      max: 100,
      unit: "articles",
    },
    {
      key: "articles_per_run",
      label: "Articles per run",
      description: "How many new articles to draft each weekday execution.",
      type: "number",
      default: "3",
      min: 1,
      max: 10,
      unit: "/day",
    },
  ],
  outreach_research: [
    {
      key: "persona_name",
      label: "Persona first name",
      description: "First name used in outreach email signatures and AI tone.",
      type: "text",
      default: "Sarah",
    },
  ],
  outreach_followup: [
    {
      key: "follow_up_days",
      label: "Follow-up cadence",
      description: "Comma-separated days after initial outreach when follow-ups go out.",
      type: "csv-numbers",
      default: "3,7,14",
      unit: "days",
    },
  ],
  content_orchestrator: [
    {
      key: "creator_stall_hours",
      label: "Creator stall threshold",
      description: "If the content pool is below target and the creator hasn't run in this many hours, the orchestrator will kick it off itself.",
      type: "number",
      default: "24",
      min: 1,
      max: 168,
      unit: "hours",
    },
  ],
  system_orchestrator: [
    {
      key: "stale_threshold_multiplier",
      label: "Stale threshold multiplier",
      description: "An agent is flagged stale when its last run is older than (expected interval × this multiplier). Set higher to be more lenient.",
      type: "number",
      default: "2",
      min: 1,
      max: 10,
      unit: "x",
    },
  ],
  data_verifier: [
    {
      key: "batch_size",
      label: "Batch size",
      description: "Number of centers verified per nightly run. Each center costs ~1 Claude text call + ~4 Vision calls.",
      type: "number",
      default: "5",
      min: 1,
      max: 30,
      unit: "centers",
    },
    {
      key: "recheck_days",
      label: "Re-check window",
      description: "Skip centers already verified within this many days. Lower = faster catches on data drift, higher = lower API cost.",
      type: "number",
      default: "30",
      min: 1,
      max: 365,
      unit: "days",
    },
    {
      key: "vision_threshold_verified",
      label: "Vision verified threshold",
      description: "Claude Vision score (1-10) at or above which a photo is auto-marked verified.",
      type: "number",
      default: "7",
      min: 5,
      max: 10,
    },
    {
      key: "vision_threshold_suspicious",
      label: "Vision suspicious threshold",
      description: "Claude Vision score (1-10) at or below which a photo is flagged suspicious. Should be lower than the verified threshold.",
      type: "number",
      default: "4",
      min: 1,
      max: 6,
    },
    {
      key: "max_image_bytes",
      label: "Max image size",
      description: "Skip hashing/Vision for images larger than this. Most facility photos are well under 1MB.",
      type: "number",
      default: "2000000",
      min: 100000,
      max: 10000000,
      unit: "bytes",
    },
  ],
};

// Agent type → task group label
const TASK_GROUP_LABELS: Record<string, string> = {
  outreach_research: "Outreach Emails",
  outreach_response: "Center Replies",
  outreach_agreement: "Agreements",
  content_creator: "New Articles",
  content_admin: "Content Reviews",
  content_planner: "Content Calendar",
  center_admin: "Center Reviews",
  data_verifier: "Data Verification",
  lead_verify: "Lead Verification",
  follow_up: "Follow-ups",
};

export default function AdminAgentsPage() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [tasks, setTasks] = useState<AgentTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("awaiting_owner");
  const [taskPage, setTaskPage] = useState(1);
  const [taskTotal, setTaskTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<"tasks" | "config">("tasks");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkActioning, setBulkActioning] = useState(false);
  const [agentStats, setAgentStats] = useState<Record<string, { pending: number; recent: number; detail: string }>>({});
  const [agentSettings, setAgentSettings] = useState<Record<string, Record<string, string>>>({});
  const [draftSettings, setDraftSettings] = useState<Record<string, Record<string, string>>>({});
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [savingSetting, setSavingSetting] = useState<string | null>(null);
  const TASKS_PER_PAGE = 50;

  async function loadTasks(filter?: string, page?: number) {
    const supabase = createClient();
    const currentFilter = filter ?? statusFilter;
    const currentPage = page ?? taskPage;
    const offset = (currentPage - 1) * TASKS_PER_PAGE;

    let query = supabase
      .from("agent_tasks")
      .select("id, agent_type, entity_type, status, ai_recommendation, ai_summary, created_at, owner_decision, action_token, checklist", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + TASKS_PER_PAGE - 1);

    if (currentFilter !== "all") {
      query = query.eq("status", currentFilter);
    }

    const { data, count } = await query;
    setTasks((data || []) as AgentTaskRow[]);
    setTaskTotal(count || 0);
  }

  async function loadAgentStats() {
    const supabase = createClient();

    // Task counts per agent type
    const { data: pendingTasks } = await supabase
      .from("agent_tasks")
      .select("agent_type")
      .eq("status", "awaiting_owner");

    const { data: recentTasks } = await supabase
      .from("agent_tasks")
      .select("agent_type, status")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Pipeline stats
    const { data: pipelineStats } = await supabase
      .from("outreach_pipeline")
      .select("stage");

    // Content pool
    const { count: draftsCount } = await supabase
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("page_type", "blog")
      .eq("status", "draft");

    const { count: approvedCount } = await supabase
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("page_type", "blog")
      .eq("status", "approved");

    // Leads stats
    const { count: newLeads } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");

    // Build stats per agent
    const pending: Record<string, number> = {};
    const recent: Record<string, number> = {};
    for (const t of pendingTasks || []) {
      pending[t.agent_type] = (pending[t.agent_type] || 0) + 1;
    }
    for (const t of recentTasks || []) {
      recent[t.agent_type] = (recent[t.agent_type] || 0) + 1;
    }

    const pStages: Record<string, number> = {};
    for (const p of pipelineStats || []) {
      pStages[p.stage] = (pStages[p.stage] || 0) + 1;
    }

    const totalPool = (draftsCount || 0) + (approvedCount || 0);

    const stats: Record<string, { pending: number; recent: number; detail: string }> = {};

    // Internal agents
    stats.center_admin = { pending: pending.center_admin || 0, recent: recent.center_admin || 0, detail: `${pending.center_admin || 0} reviews awaiting` };
    stats.content_admin = { pending: pending.content_admin || 0, recent: recent.content_admin || 0, detail: `${pending.content_admin || 0} articles to review` };
    stats.lead_verify = { pending: pending.lead_verify || 0, recent: recent.lead_verify || 0, detail: `${newLeads || 0} new leads pending` };
    stats.follow_up = { pending: pending.follow_up || 0, recent: recent.follow_up || 0, detail: "Runs daily at 09:00 Bangkok time" };

    // Outreach agents
    stats.outreach_orchestrator = { pending: 0, recent: 0, detail: `Pipeline: ${pStages.new || 0} new, ${pStages.researching || 0} researching, ${pStages.outreach_sent || 0} sent, ${pStages.responded || 0} responded, ${pStages.active || 0} active` };
    stats.outreach_research = { pending: pending.outreach_research || 0, recent: recent.outreach_research || 0, detail: `${pending.outreach_research || 0} drafts awaiting approval, ${pStages.researching || 0} centers being researched` };
    stats.outreach_followup = { pending: 0, recent: 0, detail: `${pStages.outreach_sent || 0} centers awaiting response (Day 3/7/14 follow-ups)` };
    stats.outreach_response = { pending: pending.outreach_response || 0, recent: recent.outreach_response || 0, detail: `Checks Gmail every 15 min. ${pending.outreach_response || 0} replies need review` };
    stats.outreach_agreement = { pending: pending.outreach_agreement || 0, recent: recent.outreach_agreement || 0, detail: `${pStages.terms_agreed || 0} centers ready for agreement` };
    stats.outreach_activation = { pending: 0, recent: 0, detail: `${pStages.active || 0} active partners onboarded` };

    // Content agents
    stats.content_creator = { pending: 0, recent: recent.content_creator || 0, detail: `Pool: ${totalPool}/20 articles (${draftsCount || 0} drafts, ${approvedCount || 0} approved)` };
    stats.content_scheduler = { pending: 0, recent: 0, detail: "Publishes 1 approved article per day" };
    stats.content_planner = { pending: pending.content_planner || 0, recent: recent.content_planner || 0, detail: "Plans 2-3 topics per weekday" };
    stats.content_auto_approve = { pending: 0, recent: 0, detail: `${draftsCount || 0} drafts in queue for review` };

    // Orchestrators
    stats.content_orchestrator = {
      pending: 0,
      recent: recent.content_orchestrator || 0,
      detail: `Supervises planner → creator → scheduler. Runs every 30 min.`,
    };
    stats.system_orchestrator = {
      pending: 0,
      recent: recent.system_orchestrator || 0,
      detail: `Health watcher across all agents. Snapshot updated every 10 min.`,
    };

    setAgentStats(stats);
  }

  async function loadSettings() {
    const res = await fetch("/api/agents/settings");
    if (res.ok) {
      const json = await res.json();
      setAgentSettings(json.settings || {});
    }
  }

  useEffect(() => {
    async function load() {
      const configRes = await fetch("/api/agents/config");
      if (configRes.ok) setConfig(await configRes.json());
      await Promise.all([
        loadTasks("awaiting_owner", 1),
        loadAgentStats(),
        loadSettings(),
      ]);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getSettingValue(agent: string, key: string): string {
    const draft = draftSettings[agent]?.[key];
    if (draft !== undefined) return draft;
    const saved = agentSettings[agent]?.[key];
    if (saved !== undefined) return saved;
    const knob = AGENT_KNOBS[agent]?.find((k) => k.key === key);
    return knob?.default ?? "";
  }

  function setDraftValue(agent: string, key: string, value: string) {
    setDraftSettings((prev) => ({
      ...prev,
      [agent]: { ...(prev[agent] || {}), [key]: value },
    }));
  }

  function isDirty(agent: string, key: string): boolean {
    const draft = draftSettings[agent]?.[key];
    if (draft === undefined) return false;
    const saved = agentSettings[agent]?.[key] ?? AGENT_KNOBS[agent]?.find((k) => k.key === key)?.default ?? "";
    return draft !== saved;
  }

  async function saveSetting(agent: string, key: string) {
    const value = getSettingValue(agent, key);
    setSavingSetting(`${agent}:${key}`);
    try {
      const res = await fetch("/api/agents/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent, key, value }),
      });
      if (res.ok) {
        setAgentSettings((prev) => ({
          ...prev,
          [agent]: { ...(prev[agent] || {}), [key]: value },
        }));
        setDraftSettings((prev) => {
          const next = { ...prev };
          if (next[agent]) {
            const inner = { ...next[agent] };
            delete inner[key];
            next[agent] = inner;
          }
          return next;
        });
        toast.success("Setting saved");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    }
    setSavingSetting(null);
  }

  function resetSetting(agent: string, key: string) {
    const knob = AGENT_KNOBS[agent]?.find((k) => k.key === key);
    setDraftValue(agent, key, knob?.default ?? "");
  }

  async function toggleAgent(agent: string, enabled: boolean) {
    setToggling(agent);
    const res = await fetch("/api/agents/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, enabled }),
    });

    if (res.ok) {
      setConfig((prev) => prev ? { ...prev, [agent]: enabled } : prev);
      toast.success(`${AGENT_INFO[agent]?.label || agent} ${enabled ? "enabled" : "disabled"}`);
    } else {
      toast.error("Failed to update agent");
    }
    setToggling(null);
  }

  async function handleAction(taskId: string, token: string, decision: string) {
    setActioning(taskId);
    try {
      const form = new FormData();
      form.append("token", token);
      form.append("decision", decision);
      const res = await fetch("/api/agents/action", { method: "POST", body: form });
      if (res.ok) {
        toast.success(`Task ${decision}`);
        await loadTasks();
      } else {
        toast.error("Action failed");
      }
    } catch {
      toast.error("Action failed");
    }
    setActioning(null);
  }

  function toggleTaskSelection(taskId: string) {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  }

  function selectAllInGroup(groupTasks: AgentTaskRow[]) {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      const allSelected = groupTasks.every((t) => next.has(t.id));
      if (allSelected) {
        groupTasks.forEach((t) => next.delete(t.id));
      } else {
        groupTasks.forEach((t) => { if (t.status === "awaiting_owner") next.add(t.id); });
      }
      return next;
    });
  }

  async function handleBulkAction(decision: string) {
    if (selectedTasks.size === 0) return;
    const confirmed = confirm(`Are you sure you want to ${decision === "approved" ? "approve" : "reject"} ${selectedTasks.size} tasks?`);
    if (!confirmed) return;

    setBulkActioning(true);
    const taskIds = [...selectedTasks];

    try {
      const res = await fetch("/api/agents/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_ids: taskIds,
          decision: decision === "approved" ? "approve" : "reject",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${data.processed} tasks ${decision}${data.emails_queued ? ` — ${data.emails_queued} emails sending in background` : ""}`);
      } else {
        toast.error(data.error || "Bulk action failed");
      }
    } catch {
      toast.error("Bulk action failed — network error");
    }

    setSelectedTasks(new Set());
    await loadTasks();
    setBulkActioning(false);
  }

  function toggleGroup(group: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  if (loading) return <div className="animate-pulse h-96 bg-surface-container rounded-2xl" />;

  // Group tasks by agent type
  const taskGroups = new Map<string, AgentTaskRow[]>();
  tasks.forEach((t) => {
    const key = t.agent_type;
    if (!taskGroups.has(key)) taskGroups.set(key, []);
    taskGroups.get(key)!.push(t);
  });

  // Sort groups: most tasks first
  const sortedGroups = Array.from(taskGroups.entries()).sort((a, b) => b[1].length - a[1].length);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-headline-lg font-semibold text-foreground">AI Agents</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage agent settings and review pending tasks.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-surface-container-low rounded-full p-1 w-fit">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-2 text-sm font-medium rounded-full px-4 py-2 transition-colors duration-200 ${
            activeTab === "tasks" ? "bg-surface-container-lowest text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ListTodo className="h-4 w-4" />
          Tasks {taskTotal > 0 && <span className="text-[10px] bg-amber-100 text-amber-800 rounded-full px-1.5 py-0.5">{taskTotal}</span>}
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`flex items-center gap-2 text-sm font-medium rounded-full px-4 py-2 transition-colors duration-200 ${
            activeTab === "config" ? "bg-surface-container-lowest text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings2 className="h-4 w-4" />
          Settings
        </button>
      </div>

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <div>
          {/* Filter bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {["awaiting_owner", "all", "approved", "rejected"].map((f) => {
                const labels: Record<string, string> = { awaiting_owner: "Awaiting You", all: "All", approved: "Approved", rejected: "Rejected" };
                return (
                  <button
                    key={f}
                    onClick={() => { setStatusFilter(f); setTaskPage(1); loadTasks(f, 1); }}
                    className={`text-xs font-medium rounded-full px-3.5 py-1.5 transition-colors duration-200 ${
                      statusFilter === f
                        ? "bg-primary text-white"
                        : "bg-surface-container-lowest text-muted-foreground hover:bg-primary/10 hover:text-primary shadow-ambient"
                    }`}
                  >
                    {labels[f] || f}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{taskTotal} task{taskTotal !== 1 ? "s" : ""}</p>
          </div>

          {/* Bulk action bar */}
          {selectedTasks.size > 0 && (
            <div className="flex items-center justify-between bg-primary/5 rounded-xl px-4 py-2.5 mb-4">
              <span className="text-sm font-medium text-foreground">{selectedTasks.size} selected</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="rounded-full text-xs gradient-primary text-white"
                  onClick={() => handleBulkAction("approved")}
                  disabled={bulkActioning}
                >
                  {bulkActioning ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                  Approve All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => handleBulkAction("rejected")}
                  disabled={bulkActioning}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => setSelectedTasks(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Task groups */}
          {sortedGroups.length > 0 ? (
            <div className="space-y-4">
              {sortedGroups.map(([agentType, groupTasks]) => {
                const info = AGENT_INFO[agentType];
                const Icon = info?.icon || Bot;
                const groupLabel = TASK_GROUP_LABELS[agentType] || info?.label || agentType;
                const isCollapsed = collapsedGroups.has(agentType);

                return (
                  <div key={agentType} className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
                    {/* Group header */}
                    <div className="flex items-center justify-between px-5 py-3 hover:bg-surface-container/30 transition-colors duration-200">
                      <div className="flex items-center gap-3">
                        {statusFilter === "awaiting_owner" && (
                          <input
                            type="checkbox"
                            checked={groupTasks.filter(t => t.status === "awaiting_owner").every(t => selectedTasks.has(t.id)) && groupTasks.some(t => t.status === "awaiting_owner")}
                            onChange={() => selectAllInGroup(groupTasks)}
                            className="h-4 w-4 rounded text-primary cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <button onClick={() => toggleGroup(agentType)} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className={`h-4 w-4 ${info?.color || "text-primary"}`} />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{groupLabel}</span>
                        <span className="text-[10px] font-medium bg-surface-container-low text-muted-foreground rounded-full px-2 py-0.5">
                          {groupTasks.length}
                        </span>
                      </button>
                      </div>
                      {isCollapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => toggleGroup(agentType)} /> : <ChevronUp className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => toggleGroup(agentType)} />}
                    </div>

                    {/* Task cards */}
                    {!isCollapsed && (
                      <div className="px-5 pb-4 space-y-2">
                        {groupTasks.map((task) => (
                          <div key={task.id} className="flex items-start gap-2">
                            {task.status === "awaiting_owner" && (
                              <input
                                type="checkbox"
                                checked={selectedTasks.has(task.id)}
                                onChange={() => toggleTaskSelection(task.id)}
                                className="h-4 w-4 rounded text-primary cursor-pointer mt-3 flex-shrink-0"
                              />
                            )}
                          <TaskCard
                            task={task}
                            isExpanded={expandedTask === task.id}
                            onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                            isEditing={editingDraft === task.id}
                            editedSubject={editedSubject}
                            editedBody={editedBody}
                            onEditStart={() => {
                              const cl = task.checklist as Record<string, unknown> | null;
                              setEditingDraft(task.id);
                              setEditedSubject(String(cl?.subject || ""));
                              // Use suggested_reply for response tasks, body_text for outreach drafts
                              setEditedBody(String(cl?.suggested_reply || cl?.body_text || ""));
                            }}
                            onEditCancel={() => setEditingDraft(null)}
                            onEditSubject={setEditedSubject}
                            onEditBody={setEditedBody}
                            onEditSave={async () => {
                              const cl = task.checklist as Record<string, unknown> | null;
                              const isReply = task.agent_type === "outreach_response" && !!cl?.suggested_reply;
                              const updated = isReply
                                ? { ...cl, suggested_reply: editedBody }
                                : { ...cl, subject: editedSubject, body_text: editedBody };
                              const supabase = createClient();
                              await supabase.from("agent_tasks").update({ checklist: updated }).eq("id", task.id);
                              setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, checklist: updated } : t));
                              setEditingDraft(null);
                              toast.success("Draft updated");
                            }}
                            actioning={actioning === task.id}
                            onAction={(decision) => handleAction(task.id, task.action_token!, decision)}
                          />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-12 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {statusFilter === "awaiting_owner" ? "No tasks awaiting your approval." : "No tasks found."}
              </p>
            </div>
          )}

          {/* Pagination */}
          {taskTotal > TASKS_PER_PAGE && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                Showing {(taskPage - 1) * TASKS_PER_PAGE + 1}–{Math.min(taskPage * TASKS_PER_PAGE, taskTotal)} of {taskTotal}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-full ghost-border border-0" disabled={taskPage <= 1}
                  onClick={() => { const p = taskPage - 1; setTaskPage(p); loadTasks(undefined, p); }}>Previous</Button>
                <Button variant="outline" size="sm" className="rounded-full ghost-border border-0" disabled={taskPage * TASKS_PER_PAGE >= taskTotal}
                  onClick={() => { const p = taskPage + 1; setTaskPage(p); loadTasks(undefined, p); }}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Config Tab */}
      {activeTab === "config" && (
        <div className="space-y-6">
          {AGENT_GROUPS.map((group) => (
            <section key={group.title}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {group.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.agents.map((key) => {
                  const info = AGENT_INFO[key];
                  if (!info) return null;
                  const enabled = config?.[key as keyof AgentConfig] || false;
                  const Icon = info.icon;
                  const knobs = AGENT_KNOBS[key] || [];
                  const hasKnobs = knobs.length > 0;
                  const isExpanded = expandedAgent === key;
                  const stats = agentStats[key];

                  return (
                    <div
                      key={key}
                      className={`bg-surface-container-lowest rounded-2xl shadow-ambient transition-all duration-300 ${
                        enabled ? "ring-1 ring-primary/15" : ""
                      } ${isExpanded ? "md:col-span-2" : ""}`}
                    >
                      {/* Header row */}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                enabled ? "bg-primary/10" : "bg-surface-container"
                              }`}
                            >
                              <Icon className={`h-4 w-4 ${enabled ? info.color : "text-muted-foreground"}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-semibold text-foreground">{info.label}</h3>
                                {hasKnobs && (
                                  <span className="text-[9px] font-medium text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                                    {knobs.length} setting{knobs.length === 1 ? "" : "s"}
                                  </span>
                                )}
                              </div>
                              {enabled ? (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium mt-0.5">
                                  <Zap className="h-3 w-3" /> Active
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground mt-0.5 inline-block">
                                  Off — manual mode
                                </span>
                              )}
                            </div>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(v) => toggleAgent(key, v)}
                            disabled={toggling === key}
                          />
                        </div>

                        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{info.description}</p>

                        {/* Stats line */}
                        {stats && (
                          <div className="mt-3 pt-3 border-t border-surface-container-low">
                            <p className="text-xs text-foreground leading-relaxed">{stats.detail}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {stats.pending > 0 && (
                                <span className="text-[10px] font-medium bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">
                                  {stats.pending} pending
                                </span>
                              )}
                              {stats.recent > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  {stats.recent} task{stats.recent === 1 ? "" : "s"} in 24h
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Configure toggle */}
                        {hasKnobs && (
                          <button
                            onClick={() => setExpandedAgent(isExpanded ? null : key)}
                            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            <Sliders className="h-3.5 w-3.5" />
                            {isExpanded ? "Hide settings" : "Configure"}
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        )}
                      </div>

                      {/* Expanded settings panel */}
                      {isExpanded && hasKnobs && (
                        <div className="px-5 pb-5 pt-1 border-t border-surface-container-low bg-surface-container/20">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-3 mt-3">
                            Configuration
                          </p>
                          <div className="space-y-4">
                            {knobs.map((knob) => {
                              const value = getSettingValue(key, knob.key);
                              const dirty = isDirty(key, knob.key);
                              const saving = savingSetting === `${key}:${knob.key}`;
                              const inputId = `${key}-${knob.key}`;

                              return (
                                <div key={knob.key} className="rounded-xl bg-surface-container-lowest p-3 shadow-ambient">
                                  <label
                                    htmlFor={inputId}
                                    className="block text-xs font-semibold text-foreground"
                                  >
                                    {knob.label}
                                    {knob.unit && (
                                      <span className="text-muted-foreground font-normal ml-1">
                                        ({knob.unit})
                                      </span>
                                    )}
                                  </label>
                                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                    {knob.description}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <input
                                      id={inputId}
                                      type={knob.type === "number" ? "number" : "text"}
                                      min={knob.min}
                                      max={knob.max}
                                      value={value}
                                      onChange={(e) => setDraftValue(key, knob.key, e.target.value)}
                                      placeholder={knob.default}
                                      className="flex-1 text-sm bg-white border border-surface-container-high rounded-lg px-3 py-1.5 ghost-border focus:outline-none focus:ring-1 focus:ring-primary/40 tabular-nums"
                                    />
                                    {dirty ? (
                                      <>
                                        <button
                                          onClick={() => saveSetting(key, knob.key)}
                                          disabled={saving}
                                          className="text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-full px-3 py-1.5 transition-colors disabled:opacity-50 flex items-center gap-1"
                                        >
                                          {saving ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <Save className="h-3 w-3" />
                                          )}
                                          Save
                                        </button>
                                        <button
                                          onClick={() => {
                                            setDraftSettings((prev) => {
                                              const next = { ...prev };
                                              if (next[key]) {
                                                const inner = { ...next[key] };
                                                delete inner[knob.key];
                                                next[key] = inner;
                                              }
                                              return next;
                                            });
                                          }}
                                          className="text-xs text-muted-foreground hover:text-foreground"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => resetSetting(key, knob.key)}
                                        className="text-[10px] text-muted-foreground hover:text-foreground"
                                        title={`Reset to default (${knob.default})`}
                                      >
                                        Default: {knob.default}
                                      </button>
                                    )}
                                  </div>
                                  {dirty && (
                                    <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
                                      <AlertCircle className="h-2.5 w-2.5" />
                                      Unsaved change — applies to next agent run after Save
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                            Settings are persisted in <code className="text-foreground bg-surface-container px-1 rounded">site_settings</code>.
                            Agents pick up new values on their next scheduled run.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Footer hint */}
          <div className="text-center text-[11px] text-muted-foreground pt-2">
            Need a knob that&apos;s not here yet? Settings are extensible —
            add a key to <code className="text-foreground bg-surface-container px-1 rounded">AGENT_KNOBS</code> in{" "}
            <code className="text-foreground bg-surface-container px-1 rounded">/admin/agents/page.tsx</code> and wire the
            agent code to read from <code className="text-foreground bg-surface-container px-1 rounded">getAgentSetting*</code>.
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Task Card Component ─── */

function TaskCard({
  task: initialTask, isExpanded, onToggle, isEditing, editedSubject, editedBody,
  onEditStart, onEditCancel, onEditSubject, onEditBody, onEditSave,
  actioning, onAction,
}: {
  task: AgentTaskRow;
  isExpanded: boolean;
  onToggle: () => void;
  isEditing: boolean;
  editedSubject: string;
  editedBody: string;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSubject: (v: string) => void;
  onEditBody: (v: string) => void;
  onEditSave: () => void;
  actioning: boolean;
  onAction: (decision: string) => void;
}) {
  const [task, setTask] = useState(initialTask);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rewriting, setRewriting] = useState(false);

  const statusInfo = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusInfo.icon;
  const isAwaiting = task.status === "awaiting_owner";
  const checklist = task.checklist as Record<string, unknown> | null;
  const isOutreachEmail = task.agent_type === "outreach_research" && !!checklist?.body_text;
  const isReplyTask = task.agent_type === "outreach_response" && !!checklist?.suggested_reply;
  const centerName = checklist?.center_name ? String(checklist.center_name) : null;
  const feedbackHistory = (checklist?.feedback_history as string[]) || [];

  async function handleRewrite() {
    if (!feedback.trim()) return;
    setRewriting(true);
    try {
      const res = await fetch("/api/agents/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, feedback: feedback.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update local task state with rewritten content
        setTask((prev) => ({
          ...prev,
          checklist: {
            ...prev.checklist,
            subject: data.subject,
            body_text: data.body_text,
            feedback_history: [...feedbackHistory, feedback.trim()],
          },
        }));
        setFeedback("");
        setFeedbackMode(false);
        toast.success("Rewritten based on your feedback");
      } else {
        toast.error("Rewrite failed");
      }
    } catch {
      toast.error("Rewrite failed");
    }
    setRewriting(false);
  }

  return (
    <div className="rounded-xl bg-surface-container/30 overflow-hidden">
      {/* Summary row */}
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-container/50 transition-colors duration-200 text-left">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground truncate">
              {centerName || task.ai_summary || "Task pending"}
            </p>
            {centerName && task.ai_summary && !isOutreachEmail && (
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{task.ai_summary}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            {new Date(task.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 ${statusInfo.color}`}>
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </span>
          {isAwaiting && task.action_token && !isExpanded && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onAction("approved"); }}
                disabled={actioning}
                className="text-[10px] font-medium text-white bg-primary hover:bg-primary/90 rounded-full px-2.5 py-1 transition-colors disabled:opacity-50"
              >
                {actioning ? "..." : "Approve"}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onAction("rejected"); }}
                disabled={actioning}
                className="text-[10px] font-medium text-red-600 hover:text-red-700 rounded-full px-2.5 py-1 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}
          {task.owner_decision && (
            <span className="text-[10px] text-muted-foreground capitalize">{task.owner_decision}</span>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {isOutreachEmail ? (
            /* Email preview */
            <div className="bg-surface-container-lowest rounded-xl p-5">
              <div className="space-y-2 text-sm mb-4">
                <div className="flex gap-2">
                  <span className="text-muted-foreground font-medium w-12 shrink-0">To:</span>
                  <span className="text-foreground">{String(checklist?.to_email || "")}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground font-medium w-12 shrink-0">From:</span>
                  <span className="text-foreground">Sarah &lt;info@rehab-atlas.com&gt;</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground font-medium w-12 shrink-0">Subj:</span>
                  {isEditing ? (
                    <input value={editedSubject} onChange={(e) => onEditSubject(e.target.value)}
                      className="flex-1 text-sm bg-white border rounded-lg px-2 py-1 ghost-border" />
                  ) : (
                    <span className="text-foreground font-medium">{String(checklist?.subject || "")}</span>
                  )}
                </div>
              </div>
              <div className="border-t border-surface-container pt-4">
                {isEditing ? (
                  <textarea value={editedBody} onChange={(e) => onEditBody(e.target.value)}
                    className="w-full text-sm bg-white border rounded-lg p-3 ghost-border font-sans leading-relaxed min-h-[300px]" />
                ) : (
                  <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-sans">{String(checklist?.body_text || "")}</pre>
                )}
              </div>
              {isAwaiting && task.action_token && (
                <div className="mt-4 pt-4 border-t border-surface-container">
                  {isEditing ? (
                    <div className="flex items-center gap-3">
                      <button onClick={onEditSave} className="text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-full px-4 py-1.5">Save Changes</button>
                      <button onClick={onEditCancel} className="text-xs font-medium text-muted-foreground hover:text-foreground rounded-full px-4 py-1.5">Cancel</button>
                    </div>
                  ) : feedbackMode ? (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">Tell the AI what to change — it will rewrite the email based on your feedback.</p>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="e.g. Make the tone warmer, mention their detox program specifically, shorten the email..."
                        className="w-full text-sm bg-white border rounded-lg p-3 ghost-border font-sans leading-relaxed min-h-[80px]"
                      />
                      {feedbackHistory.length > 0 && (
                        <div className="text-[10px] text-muted-foreground">
                          Previous feedback: {feedbackHistory.map((f, i) => <span key={i} className="inline-block bg-surface-container-low rounded px-1.5 py-0.5 mr-1">{f}</span>)}
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <button onClick={handleRewrite} disabled={rewriting || !feedback.trim()}
                          className="text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-full px-4 py-1.5 disabled:opacity-50 flex items-center gap-1">
                          <RefreshCw className={`h-3 w-3 ${rewriting ? "animate-spin" : ""}`} />
                          {rewriting ? "Rewriting..." : "Rewrite"}
                        </button>
                        <button onClick={() => { setFeedbackMode(false); setFeedback(""); }}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground rounded-full px-4 py-1.5">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button onClick={() => onAction("approved")} disabled={actioning}
                        className="text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-full px-4 py-1.5 disabled:opacity-50">
                        {actioning ? "Sending..." : "Approve & Send"}
                      </button>
                      <button onClick={() => setFeedbackMode(true)}
                        className="text-xs font-medium text-amber-700 hover:text-amber-800 rounded-full px-4 py-1.5 border border-amber-200 bg-amber-50 flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Request Rewrite
                      </button>
                      <button onClick={onEditStart}
                        className="text-xs font-medium text-primary hover:text-primary/80 rounded-full px-4 py-1.5 border border-primary/20">Edit Draft</button>
                      <button onClick={() => onAction("rejected")} disabled={actioning}
                        className="text-xs font-medium text-red-600 hover:text-red-700 rounded-full px-4 py-1.5 disabled:opacity-50">Reject</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : isReplyTask ? (
            /* Reply editor for outreach responses */
            <div className="bg-surface-container-lowest rounded-xl p-5">
              {/* Reply context */}
              {(() => {
                const replyFrom = String(checklist?.reply_from || "");
                const sentiment = String(checklist?.sentiment || "");
                const summary = String(checklist?.summary || "");
                const keyPoints = checklist?.key_points ? JSON.stringify(checklist.key_points) : "";
                return (
                  <div className="space-y-2 text-sm mb-4">
                    {replyFrom && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground font-medium w-24 shrink-0">reply from:</span>
                        <span className="text-foreground">{replyFrom}</span>
                      </div>
                    )}
                    {sentiment && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground font-medium w-24 shrink-0">sentiment:</span>
                        <span className={`font-medium ${sentiment === "positive" ? "text-emerald-600" : sentiment === "negative" ? "text-red-600" : "text-amber-600"}`}>
                          {sentiment}
                        </span>
                      </div>
                    )}
                    {summary && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground font-medium w-24 shrink-0">summary:</span>
                        <span className="text-foreground">{summary}</span>
                      </div>
                    )}
                    {keyPoints && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground font-medium w-24 shrink-0">key points:</span>
                        <span className="text-foreground">{keyPoints}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Original reply */}
              {String(checklist?.reply_body || "") && (
                <div className="mb-4 p-3 bg-surface-container-low rounded-lg border-l-2 border-muted-foreground/20">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">Their Reply</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{String(checklist?.reply_body || "")}</p>
                </div>
              )}

              {/* Suggested reply — editable */}
              <div className="border-t border-surface-container pt-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Your Reply (editable)</p>
                {isEditing ? (
                  <textarea
                    value={editedBody}
                    onChange={(e) => onEditBody(e.target.value)}
                    className="w-full text-sm bg-white border rounded-lg p-3 ghost-border font-sans leading-relaxed min-h-[200px]"
                  />
                ) : (
                  <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-sans">
                    {String(checklist?.suggested_reply || "")}
                  </pre>
                )}
              </div>

              {isAwaiting && task.action_token && (
                <div className="mt-4 pt-4 border-t border-surface-container">
                  {isEditing ? (
                    <div className="flex items-center gap-3">
                      <button onClick={onEditSave} className="text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-full px-4 py-1.5">Save Changes</button>
                      <button onClick={onEditCancel} className="text-xs font-medium text-muted-foreground hover:text-foreground rounded-full px-4 py-1.5">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button onClick={() => onAction("approved")} disabled={actioning}
                        className="text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-full px-4 py-1.5 disabled:opacity-50">
                        {actioning ? "Sending..." : "Approve & Send Reply"}
                      </button>
                      <button onClick={onEditStart}
                        className="text-xs font-medium text-primary hover:text-primary/80 rounded-full px-4 py-1.5 border border-primary/20">Edit Reply</button>
                      <button onClick={() => onAction("rejected")} disabled={actioning}
                        className="text-xs font-medium text-red-600 hover:text-red-700 rounded-full px-4 py-1.5 disabled:opacity-50">Dismiss</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Generic task detail */
            <div className="bg-surface-container-lowest rounded-xl p-4">
              {task.ai_summary && <p className="text-sm text-foreground leading-relaxed mb-3">{task.ai_summary}</p>}
              {checklist && (
                <div className="space-y-1.5">
                  {Object.entries(checklist).filter(([k]) => !["body_text", "subject", "from_email", "to_email", "persona", "feedback_history", "suggested_reply", "reply_body"].includes(k)).map(([key, val]) => (
                    <div key={key} className="flex gap-2 text-xs">
                      <span className="text-muted-foreground font-medium min-w-[100px]">{key.replace(/_/g, " ")}:</span>
                      <span className="text-foreground">{typeof val === "object" ? JSON.stringify(val) : String(val || "—")}</span>
                    </div>
                  ))}
                </div>
              )}
              {isAwaiting && task.action_token && (
                <div className="mt-4 pt-3 border-t border-surface-container flex items-center gap-3">
                  <button onClick={() => onAction("approved")} disabled={actioning}
                    className="text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-full px-4 py-1.5 disabled:opacity-50">
                    {actioning ? "..." : "Approve"}
                  </button>
                  <button onClick={() => onAction("rejected")} disabled={actioning}
                    className="text-xs font-medium text-red-600 hover:text-red-700 rounded-full px-4 py-1.5 disabled:opacity-50">Reject</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
