"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2, FileText, UserSearch, Clock,
  CheckCircle, XCircle, AlertCircle, Loader2,
  Bot, Zap,
} from "lucide-react";

interface AgentConfig {
  center_admin: boolean;
  content_admin: boolean;
  follow_up: boolean;
  lead_verify: boolean;
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

  useEffect(() => {
    async function load() {
      // Load agent config
      const configRes = await fetch("/api/agents/config");
      if (configRes.ok) setConfig(await configRes.json());

      // Load recent tasks
      const supabase = createClient();
      const { data } = await supabase
        .from("agent_tasks")
        .select("id, agent_type, entity_type, status, ai_recommendation, ai_summary, created_at, owner_decision, action_token, checklist")
        .order("created_at", { ascending: false })
        .limit(20);
      setTasks((data || []) as AgentTaskRow[]);

      setLoading(false);
    }
    load();
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
        // Refresh tasks
        const supabase = createClient();
        const { data } = await supabase
          .from("agent_tasks")
          .select("id, agent_type, entity_type, status, ai_recommendation, ai_summary, created_at, owner_decision, action_token, checklist")
          .order("created_at", { ascending: false })
          .limit(20);
        setTasks((data || []) as AgentTaskRow[]);
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

      {/* Agent Toggle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {(Object.entries(AGENT_INFO) as [keyof typeof AGENT_INFO, typeof AGENT_INFO[keyof typeof AGENT_INFO]][]).map(([key, info]) => {
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

      {/* Recent Tasks */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Agent Activity</h2>
          <p className="text-xs text-muted-foreground mt-1">Tasks processed by agents</p>
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

              return (
                <tr key={task.id} className="border-t border-surface-container-low hover:bg-surface-container-low/50 transition-colors duration-200 align-top">
                  <td className="px-6 py-4">
                    <button onClick={() => setExpandedTask(isExpanded ? null : task.id)} className="text-left">
                      <p className="text-sm font-medium text-foreground">{agentInfo?.label || task.agent_type}</p>
                      {isExpanded && task.ai_summary && (
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-xs">{task.ai_summary}</p>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {task.entity_type}
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
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No agent activity yet. Enable an agent above to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
