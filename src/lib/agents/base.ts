/**
 * Rehab-Atlas Agent System — Shared Foundation
 * Token generation, task CRUD, webhook verification, logging.
 */

import { createHmac, randomUUID, randomBytes, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentType, AgentRecommendation, AgentTask } from "@/types/agent";

// No hard-coded fallbacks: when a secret is missing, token signing/validation
// and webhook verification fail closed (nothing is accepted).
const HMAC_KEY: string | null = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
const TOKEN_TTL_HOURS = 24;

/**
 * Read a shared secret from env, trimmed of surrounding whitespace/newlines
 * (values pasted via `pbcopy` etc. often carry a trailing "\n").
 * Empty after trim = not configured = null (callers fail closed).
 */
export function readSecretEnv(name: string): string | null {
  const v = (process.env[name] ?? "").trim();
  return v.length > 0 ? v : null;
}

const WEBHOOK_SECRET: string | null = readSecretEnv("AGENT_WEBHOOK_SECRET");

/** Constant-time string comparison (false on length mismatch). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// ── Token Management ──

/** Generate a short, URL-safe action code (12 chars) for email links */
export function generateShortCode(): string {
  return randomBytes(9).toString("base64url").slice(0, 12);
}

export function generateActionToken(taskId: string): string {
  if (!HMAC_KEY) throw new Error("Action token signing key is not configured");
  const payload = `${taskId}.${Date.now()}`;
  const sig = createHmac("sha256", HMAC_KEY).update(payload).digest("hex").slice(0, 32);
  return `${payload}.${sig}`;
}

export function validateActionToken(token: string): { taskId: string } | null {
  // Support short codes — look up in DB
  if (!token.includes(".")) {
    // This is a short code, not an HMAC token — handled by the action route
    return null;
  }

  if (!HMAC_KEY) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [taskId, timestamp, sig] = parts;
  const payload = `${taskId}.${timestamp}`;
  const expectedSig = createHmac("sha256", HMAC_KEY).update(payload).digest("hex").slice(0, 32);

  if (!safeEqual(sig, expectedSig)) return null;

  // Check expiry
  const created = parseInt(timestamp, 10);
  if (isNaN(created)) return null;
  const expiresAt = created + TOKEN_TTL_HOURS * 60 * 60 * 1000;
  if (Date.now() > expiresAt) return null;

  return { taskId };
}

/** Look up a task by its short action code */
export async function findTaskByShortCode(code: string): Promise<AgentTask | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("agent_tasks")
    .select("*")
    .eq("action_token", code)
    .single();
  return (data as AgentTask) || null;
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
  const token = generateShortCode(); // Short 12-char code for clean email URLs
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
  if (!WEBHOOK_SECRET) return false;
  const secret = (request.headers.get("x-webhook-secret") ?? "").trim();
  if (!secret) return false;
  return safeEqual(secret, WEBHOOK_SECRET);
}

/**
 * Verify `Authorization: Bearer <CRON_SECRET>` (Vercel cron / maintenance
 * scripts). Both sides trimmed, constant-time compare, fails closed when
 * CRON_SECRET is unset or empty.
 */
export function verifyCronSecret(request: Request): boolean {
  const cronSecret = readSecretEnv("CRON_SECRET");
  if (!cronSecret) return false;
  const header = (request.headers.get("authorization") ?? "").trim();
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return false;
  const token = m[1].trim();
  if (!token) return false;
  return safeEqual(token, cronSecret);
}

// ── Helpers ──

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
