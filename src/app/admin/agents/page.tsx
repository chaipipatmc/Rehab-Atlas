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
  ChevronDown, ChevronUp, Settings2, ListTodo,
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
    title: "Internal Agents",
    agents: ["center_admin", "content_admin", "lead_verify", "follow_up"],
  },
  {
    title: "Outreach Pipeline",
    agents: ["outreach_orchestrator", "outreach_research", "outreach_followup", "outreach_response", "outreach_agreement", "outreach_activation"],
  },
  {
    title: "Content Agents",
    agents: ["content_planner", "content_creator", "content_scheduler"],
  },
];

const AGENT_INFO: Record<string, { label: string; description: string; icon: typeof Building2; color: string }> = {
  center_admin: { label: "Center Admin", description: "Verifies center profile completeness and reviews content quality.", icon: Building2, color: "text-primary" },
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
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  awaiting_owner: { label: "Awaiting You", color: "bg-amber-100 text-amber-800", icon: AlertCircle },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
  pending: { label: "Processing", color: "bg-blue-100 text-blue-800", icon: Loader2 },
  error: { label: "Error", color: "bg-red-100 text-red-800", icon: XCircle },
  expired: { label: "Expired", color: "bg-gray-100 text-gray-800", icon: Clock },
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

  useEffect(() => {
    async function load() {
      const configRes = await fetch("/api/agents/config");
      if (configRes.ok) setConfig(await configRes.json());
      await loadTasks("awaiting_owner", 1);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                    <button
                      onClick={() => toggleGroup(agentType)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-container/30 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className={`h-4 w-4 ${info?.color || "text-primary"}`} />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{groupLabel}</span>
                        <span className="text-[10px] font-medium bg-surface-container-low text-muted-foreground rounded-full px-2 py-0.5">
                          {groupTasks.length}
                        </span>
                      </div>
                      {isCollapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
                    </button>

                    {/* Task cards */}
                    {!isCollapsed && (
                      <div className="px-5 pb-4 space-y-2">
                        {groupTasks.map((task) => (
                          <TaskCard
                            key={task.id}
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
                              setEditedBody(String(cl?.body_text || ""));
                            }}
                            onEditCancel={() => setEditingDraft(null)}
                            onEditSubject={setEditedSubject}
                            onEditBody={setEditedBody}
                            onEditSave={async () => {
                              const cl = task.checklist as Record<string, unknown> | null;
                              const supabase = createClient();
                              await supabase.from("agent_tasks").update({
                                checklist: { ...cl, subject: editedSubject, body_text: editedBody },
                              }).eq("id", task.id);
                              setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, checklist: { ...cl, subject: editedSubject, body_text: editedBody } } : t));
                              setEditingDraft(null);
                              toast.success("Draft updated");
                            }}
                            actioning={actioning === task.id}
                            onAction={(decision) => handleAction(task.id, task.action_token!, decision)}
                          />
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
        <div className="space-y-8">
          {AGENT_GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.agents.map((key) => {
                  const info = AGENT_INFO[key];
                  if (!info) return null;
                  const enabled = config?.[key as keyof AgentConfig] || false;
                  const Icon = info.icon;

                  return (
                    <div
                      key={key}
                      className={`bg-surface-container-lowest rounded-2xl p-5 shadow-ambient transition-all duration-300 ${
                        enabled ? "ring-2 ring-primary/20" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${enabled ? "bg-primary/10" : "bg-surface-container"}`}>
                            <Icon className={`h-4 w-4 ${enabled ? info.color : "text-muted-foreground"}`} />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{info.label}</h3>
                            {enabled ? (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                                <Zap className="h-3 w-3" /> Active
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Off</span>
                            )}
                          </div>
                        </div>
                        <Switch checked={enabled} onCheckedChange={(v) => toggleAgent(key, v)} disabled={toggling === key} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{info.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Task Card Component ─── */

function TaskCard({
  task, isExpanded, onToggle, isEditing, editedSubject, editedBody,
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
  const statusInfo = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusInfo.icon;
  const isAwaiting = task.status === "awaiting_owner";
  const checklist = task.checklist as Record<string, unknown> | null;
  const isOutreachEmail = task.agent_type === "outreach_research" && !!checklist?.body_text;
  const centerName = checklist?.center_name ? String(checklist.center_name) : null;

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
                  ) : (
                    <div className="flex items-center gap-3">
                      <button onClick={() => onAction("approved")} disabled={actioning}
                        className="text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-full px-4 py-1.5 disabled:opacity-50">
                        {actioning ? "Sending..." : "Approve & Send"}
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
          ) : (
            /* Generic task detail */
            <div className="bg-surface-container-lowest rounded-xl p-4">
              {task.ai_summary && <p className="text-sm text-foreground leading-relaxed mb-3">{task.ai_summary}</p>}
              {checklist && (
                <div className="space-y-1.5">
                  {Object.entries(checklist).filter(([k]) => !["body_text", "subject", "from_email", "to_email", "persona"].includes(k)).map(([key, val]) => (
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
