/**
 * Rehab-Atlas Agent System — Shared Foundation
 * Token generation, task CRUD, webhook verification, logging.
 */

import { createHmac, randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentType, AgentRecommendation, AgentTask } from "@/types/agent";

const HMAC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "agent-fallback-key";
const TOKEN_TTL_HOURS = 24;
const WEBHOOK_SECRET = process.env.AGENT_WEBHOOK_SECRET || "rehab-atlas-agent-secret";

// ── Token Management ──

export function generateActionToken(taskId: string): string {
  const payload = `${taskId}.${Date.now()}`;
  const sig = createHmac("sha256", HMAC_KEY).update(payload).digest("hex").slice(0, 32);
  return `${payload}.${sig}`;
}

export function validateActionToken(token: string): { taskId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [taskId, timestamp, sig] = parts;
  const payload = `${taskId}.${timestamp}`;
  const expectedSig = createHmac("sha256", HMAC_KEY).update(payload).digest("hex").slice(0, 32);

  if (sig !== expectedSig) return null;

  // Check expiry
  const created = parseInt(timestamp, 10);
  if (isNaN(created)) return null;
  const expiresAt = created + TOKEN_TTL_HOURS * 60 * 60 * 1000;
  if (Date.now() > expiresAt) return null;

  return { taskId };
}

// ── Task CRUD ──

export async function createAgentTask(params: {
  agent_type: AgentType;
  entity_type: string;
  entity_id: string;
  checklist?: Record<string, unknown>;
  ai_summary?: string;
  ai_recommendation?: AgentRecommendation;
  confidence?: number;
}): Promise<AgentTask | null> {
  const admin = createAdminClient();

  // Idempotency: skip if active task already exists for this entity
  const { data: existing } = await admin
    .from("agent_tasks")
    .select("id")
    .eq("entity_type", params.entity_type)
    .eq("entity_id", params.entity_id)
    .in("status", ["pending", "processing", "awaiting_owner"])
    .limit(1)
    .single();

  if (existing) return null;

  const taskId = randomUUID();
  const token = generateActionToken(taskId);
  const tokenExpires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("agent_tasks")
    .insert({
      id: taskId,
      agent_type: params.agent_type,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      status: "awaiting_owner",
      checklist: params.checklist || null,
      ai_summary: params.ai_summary || null,
      ai_recommendation: params.ai_recommendation || null,
      confidence: params.confidence || null,
      action_token: token,
      token_expires: tokenExpires,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create agent task:", error);
    return null;
  }

  return data as AgentTask;
}

export async function updateTaskStatus(
  taskId: string,
  status: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("agent_tasks")
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...(status === "approved" || status === "rejected" || status === "expired"
        ? { completed_at: new Date().toISOString() }
        : {}),
      ...extra,
    })
    .eq("id", taskId);
}

export async function markTaskError(taskId: string, errorMessage: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("agent_tasks")
    .select("retry_count")
    .eq("id", taskId)
    .single();

  const retryCount = (data?.retry_count || 0) + 1;
  const newStatus = retryCount >= 3 ? "error" : "pending";

  await admin
    .from("agent_tasks")
    .update({
      status: newStatus,
      retry_count: retryCount,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);
}

// ── Logging ──

export async function logAgentAction(params: {
  agent_type: AgentType;
  task_id?: string;
  action: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("agent_log").insert({
    agent_type: params.agent_type,
    task_id: params.task_id || null,
    action: params.action,
    details: params.details || null,
  });
}

// ── Webhook Verification ──

export function verifyWebhookSecret(request: Request): boolean {
  const secret = request.headers.get("x-webhook-secret");
  return secret === WEBHOOK_SECRET;
}

// ── Helpers ──

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
