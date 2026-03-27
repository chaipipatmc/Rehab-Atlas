"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2, FileText, UserSearch, Clock,
  CheckCircle, XCircle, AlertCircle, Loader2,
  Bot, Zap, Search, Send, MessageSquare, FileSignature,
  Activity, Target, PenTool, CalendarClock,
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

const AGENT_INFO = {
  center_admin: {
    label: "Center Admin Agent",
    description: "Verifies center profile completeness, reviews content quality with AI, emails you to approve/reject.",
    icon: Building2,
    color: "text-primary",
  },
  content_admin: {
    label: "Content Admin Agent",
    description: "Reviews blog posts and pages for relevance, medical accuracy, and SEO quality before publishing.",
    icon: FileText,
    color: "text-emerald-600",
  },
  lead_verify: {
    label: "Lead Verify Agent",
    description: "Validates inquiries, checks commission agreements, verifies match quality before forwarding leads.",
    icon: UserSearch,
    color: "text-amber-600",
  },
  follow_up: {
    label: "Follow-up Agent",
    description: "Sends daily reminders for incomplete profiles and stale content. Runs every morning at 9 AM.",
    icon: Clock,
    color: "text-violet-600",
  },
  outreach_research: {
    label: "Outreach Research",
    description: "Researches center websites and drafts personalized outreach emails for partner acquisition.",
    icon: Search,
    color: "text-sky-600",
  },
  outreach_followup: {
    label: "Outreach Follow-up",
    description: "Auto-sends follow-up emails (Day 3, 7, 14) to centers that haven't responded.",
    icon: Send,
    color: "text-sky-600",
  },
  outreach_response: {
    label: "Response Handler",
    description: "Detects inbound replies from centers, analyzes sentiment, and routes to appropriate next step.",
    icon: MessageSquare,
    color: "text-emerald-600",
  },
  outreach_agreement: {
    label: "Agreement Agent",
    description: "Prepares customized partnership agreements and sends via PandaDoc for e-signature.",
    icon: FileSignature,
    color: "text-violet-600",
  },
  outreach_activation: {
    label: "Activation Agent",
    description: "Updates center commission data in the database after agreement signing. Sends welcome emails.",
    icon: Activity,
    color: "text-emerald-600",
  },
  outreach_orchestrator: {
    label: "Master Orchestrator",
    description: "Coordinates all outreach agents, advances pipeline stages, and generates daily digest reports.",
    icon: Target,
    color: "text-primary",
  },
  content_creator: {
    label: "Content Creator",
    description: "Auto-researches rehab & addiction topics, writes SEO blog articles with Unsplash images, and saves as drafts for your approval. Runs daily on weekdays.",
    icon: PenTool,
    color: "text-rose-600",
  },
  content_scheduler: {
    label: "Content Scheduler",
    description: "Publishes 1 approved article per day at peak SEO time (6 AM EST). Picks from the content pool with topic diversity rotation.",
    icon: CalendarClock,
    color: "text-indigo-600",
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  awaiting_owner: { label: "Awaiting You", color: "bg-amber-100 text-amber-800", icon: AlertCircle },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
  pending: { label: "Processing", color: "bg-blue-100 text-blue-800", icon: Loader2 },
  error: { label: "Error", color: "bg-red-100 text-red-800", icon: XCircle },
  expired: { label: "Expired", color: "bg-gray-100 text-gray-800", icon: Clock },
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
  const [regenerateNote, setRegenerateNote] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("awaiting_owner");
  const [taskPage, setTaskPage] = useState(1);
  const [taskTotal, setTaskTotal] = useState(0);
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
      toast.success(`${AGENT_INFO[agent as keyof typeof AGENT_INFO].label} ${enabled ? "enabled" : "disabled"}`);
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

  if (loading) return <div className="animate-pulse h-96 bg-surface-container rounded-2xl" />;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-headline-lg font-semibold text-foreground">AI Agents</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Toggle agents on/off. When OFF, the system works manually (as before). When ON, agents process events and email you for approval.
        </p>
      </div>

      {/* Internal Agent Toggle Cards */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Internal Agents</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {(Object.entries(AGENT_INFO) as [keyof typeof AGENT_INFO, typeof AGENT_INFO[keyof typeof AGENT_INFO]][]).filter(([key]) => !key.startsWith("outreach_")).map(([key, info]) => {
          const enabled = config?.[key] || false;
          const Icon = info.icon;

          return (
            <div
              key={key}
              className={`bg-surface-container-lowest rounded-2xl p-6 shadow-ambient transition-all duration-300 ${
                enabled ? "ring-2 ring-primary/20" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? "bg-primary/10" : "bg-surface-container"}`}>
                    <Icon className={`h-5 w-5 ${enabled ? info.color : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{info.label}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {enabled ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                          <Zap className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Manual mode</span>
                      )}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => toggleAgent(key, v)}
                  disabled={toggling === key}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{info.description}</p>
            </div>
          );
        })}
      </div>

      {/* Outreach Agent Toggle Cards */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Outreach Pipeline Agents</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {(Object.entries(AGENT_INFO) as [keyof typeof AGENT_INFO, typeof AGENT_INFO[keyof typeof AGENT_INFO]][]).filter(([key]) => key.startsWith("outreach_")).map(([key, info]) => {
          const enabled = config?.[key] || false;
          const Icon = info.icon;

          return (
            <div
              key={key}
              className={`bg-surface-container-lowest rounded-2xl p-6 shadow-ambient transition-all duration-300 ${
                enabled ? "ring-2 ring-primary/20" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? "bg-primary/10" : "bg-surface-container"}`}>
                    <Icon className={`h-5 w-5 ${enabled ? info.color : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{info.label}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {enabled ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                          <Zap className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Manual mode</span>
                      )}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => toggleAgent(key, v)}
                  disabled={toggling === key}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{info.description}</p>
            </div>
          );
        })}
      </div>

      {/* Content Agents */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Content Agents</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {(Object.entries(AGENT_INFO) as [keyof typeof AGENT_INFO, typeof AGENT_INFO[keyof typeof AGENT_INFO]][]).filter(([key]) => key.startsWith("content_")).map(([key, info]) => {
          const enabled = config?.[key] || false;
          const Icon = info.icon;

          return (
            <div
              key={key}
              className={`bg-surface-container-lowest rounded-2xl p-6 shadow-ambient transition-all duration-300 ${
                enabled ? "ring-2 ring-primary/20" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? "bg-primary/10" : "bg-surface-container"}`}>
                    <Icon className={`h-5 w-5 ${enabled ? info.color : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{info.label}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {enabled ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                          <Zap className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Manual mode</span>
                      )}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => toggleAgent(key, v)}
                  disabled={toggling === key}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{info.description}</p>
            </div>
          );
        })}
      </div>

      {/* Agent Tasks */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Agent Activity</h2>
            <p className="text-xs text-muted-foreground mt-1">{taskTotal} task{taskTotal !== 1 ? "s" : ""}</p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setTaskPage(1); loadTasks(e.target.value, 1); }}
            className="text-sm bg-surface-container-low rounded-lg px-3 py-1.5 ghost-border text-foreground"
          >
            <option value="awaiting_owner">Awaiting Approval</option>
            <option value="all">All Tasks</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="pending">Processing</option>
            <option value="error">Errors</option>
          </select>
        </div>

        <table className="w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left px-6 py-3 font-medium">Agent</th>
              <th className="text-left px-6 py-3 font-medium">Entity</th>
              <th className="text-left px-6 py-3 font-medium">Recommendation</th>
              <th className="text-left px-6 py-3 font-medium">Status</th>
              <th className="text-left px-6 py-3 font-medium">Date</th>
              <th className="text-left px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const agentInfo = AGENT_INFO[task.agent_type as keyof typeof AGENT_INFO];
              const statusInfo = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusInfo.icon;
              const isExpanded = expandedTask === task.id;
              const isAwaiting = task.status === "awaiting_owner";

              const checklist = task.checklist as Record<string, unknown> | null;
              const isOutreachEmail = task.agent_type === "outreach_research" && !!checklist?.body_text;

              return (
                <tr key={task.id} className="border-t border-surface-container-low hover:bg-surface-container-low/50 transition-colors duration-200 align-top">
                  <td className="px-6 py-4" colSpan={isExpanded && isOutreachEmail ? 6 : 1}>
                    <button onClick={() => setExpandedTask(isExpanded ? null : task.id)} className="text-left w-full">
                      <p className="text-sm font-medium text-foreground">{agentInfo?.label || task.agent_type}</p>
                      {isExpanded && !isOutreachEmail && task.ai_summary && (
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-xs">{task.ai_summary}</p>
                      )}
                    </button>

                    {/* Full email preview for outreach tasks */}
                    {isExpanded && isOutreachEmail && (() => {
                      const isEditing = editingDraft === task.id;
                      const centerName = String(checklist.center_name || "");
                      return (
                      <div className="mt-4 bg-surface-container-low rounded-xl p-5 max-w-2xl">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Email Preview</h4>
                            {centerName && <p className="text-sm font-medium text-primary mt-1">{centerName}</p>}
                          </div>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 ${statusInfo.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm mb-4">
                          <div className="flex gap-2">
                            <span className="text-muted-foreground font-medium w-12 shrink-0">To:</span>
                            <span className="text-foreground">{String(checklist.to_email || "")}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground font-medium w-12 shrink-0">From:</span>
                            <span className="text-foreground">{String(checklist.persona || "Sarah")} &lt;info@rehab-atlas.com&gt;</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground font-medium w-12 shrink-0">Subj:</span>
                            {isEditing ? (
                              <input
                                value={editedSubject}
                                onChange={(e) => setEditedSubject(e.target.value)}
                                className="flex-1 text-sm bg-white border rounded-lg px-2 py-1 ghost-border"
                              />
                            ) : (
                              <span className="text-foreground font-medium">{String(checklist.subject || "")}</span>
                            )}
                          </div>
                        </div>
                        <div className="border-t border-surface-container pt-4">
                          {isEditing ? (
                            <textarea
                              value={editedBody}
                              onChange={(e) => setEditedBody(e.target.value)}
                              className="w-full text-sm bg-white border rounded-lg p-3 ghost-border font-sans leading-relaxed min-h-[300px]"
                            />
                          ) : (
                            <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-sans">{String(checklist.body_text || "")}</pre>
                          )}
                        </div>
                        {!isEditing && (checklist.personalization_points as string[])?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-surface-container">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Personalization points</p>
                            <div className="flex flex-wrap gap-1">
                              {(checklist.personalization_points as string[]).map((p, i) => (
                                <span key={i} className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">{p}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {isAwaiting && task.action_token && (
                          <div className="mt-4 pt-4 border-t border-surface-container">
                            {isEditing ? (
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={async () => {
                                    // Save edits to the task checklist
                                    const supabase = createClient();
                                    await supabase.from("agent_tasks").update({
                                      checklist: { ...checklist, subject: editedSubject, body_text: editedBody },
                                    }).eq("id", task.id);
                                    // Update local state
                                    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, checklist: { ...checklist, subject: editedSubject, body_text: editedBody } } : t));
                                    setEditingDraft(null);
                                    toast.success("Draft updated");
                                  }}
                                  className="text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-full px-4 py-1.5 transition-colors"
                                >
                                  Save Changes
                                </button>
                                <button
                                  onClick={() => setEditingDraft(null)}
                                  className="text-xs font-medium text-muted-foreground hover:text-foreground rounded-full px-4 py-1.5 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => handleAction(task.id, task.action_token!, "approved")}
                                    disabled={actioning === task.id}
                                    className="text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-full px-4 py-1.5 transition-colors disabled:opacity-50"
                                  >
                                    {actioning === task.id ? "Sending..." : "Approve & Send"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingDraft(task.id);
                                      setEditedSubject(String(checklist.subject || ""));
                                      setEditedBody(String(checklist.body_text || ""));
                                    }}
                                    className="text-xs font-medium text-primary hover:text-primary/80 rounded-full px-4 py-1.5 transition-colors border border-primary/20"
                                  >
                                    Edit Draft
                                  </button>
                                  <button
                                    onClick={() => handleAction(task.id, task.action_token!, "rejected")}
                                    disabled={actioning === task.id}
                                    className="text-xs font-medium text-red-600 hover:text-red-700 rounded-full px-4 py-1.5 transition-colors"
                                  >
                                    Reject
                                  </button>
                                </div>
                                <p className="text-[10px] text-muted-foreground">Approving will send this email via info@rehab-atlas.com. Edit to modify before sending.</p>
                              </div>
                            )}
                          </div>
                        )}
                        {task.owner_decision && (
                          <div className="mt-4 pt-3 border-t border-surface-container">
                            <span className="text-xs text-muted-foreground capitalize">Decision: {task.owner_decision}</span>
                          </div>
                        )}
                      </div>
                      );
                    })()}
                  </td>
                  {!(isExpanded && isOutreachEmail) && (
                    <>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {checklist?.center_name ? (
                          <span className="text-foreground">{String(checklist.center_name)}</span>
                        ) : (
                          task.entity_type
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {task.ai_recommendation && (
                          <Badge variant="outline" className={
                            task.ai_recommendation === "approve" ? "text-emerald-700 bg-emerald-50" :
                            task.ai_recommendation === "reject" ? "text-red-700 bg-red-50" :
                            "text-amber-700 bg-amber-50"
                          }>
                            {task.ai_recommendation}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(task.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-4">
                        {isAwaiting && task.action_token && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAction(task.id, task.action_token!, "approved")}
                              disabled={actioning === task.id}
                              className="text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-full px-3 py-1 transition-colors disabled:opacity-50"
                            >
                              {actioning === task.id ? "..." : "Approve"}
                            </button>
                            <button
                              onClick={() => handleAction(task.id, task.action_token!, "rejected")}
                              disabled={actioning === task.id}
                              className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-full px-3 py-1 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {task.owner_decision && (
                          <span className="text-xs text-muted-foreground capitalize">{task.owner_decision}</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  {statusFilter === "awaiting_owner" ? "No tasks awaiting your approval." : "No agent activity yet. Enable an agent above to get started."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {taskTotal > TASKS_PER_PAGE && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-surface-container-low">
            <p className="text-xs text-muted-foreground">
              Showing {(taskPage - 1) * TASKS_PER_PAGE + 1}–{Math.min(taskPage * TASKS_PER_PAGE, taskTotal)} of {taskTotal}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={taskPage <= 1}
                onClick={() => { const p = taskPage - 1; setTaskPage(p); loadTasks(undefined, p); }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground rounded-full px-3 py-1 border border-surface-container disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={taskPage * TASKS_PER_PAGE >= taskTotal}
                onClick={() => { const p = taskPage + 1; setTaskPage(p); loadTasks(undefined, p); }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground rounded-full px-3 py-1 border border-surface-container disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
