/**
 * API Usage Logger
 * Tracks token usage and costs across all external API calls.
 */

import { createAdminClient } from "@/lib/supabase/admin";

// Claude Sonnet pricing (per million tokens)
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 0.80, output: 4.0 },
};

interface UsageLog {
  service: string;
  agent_type?: string;
  operation: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Log an API call's usage and estimated cost.
 */
export async function logApiUsage(log: UsageLog): Promise<void> {
  try {
    const admin = createAdminClient();
    const input = log.input_tokens || 0;
    const output = log.output_tokens || 0;
    const total = input + output;

    // Calculate cost
    let cost = 0;
    if (log.model && PRICING[log.model]) {
      const p = PRICING[log.model];
      cost = (input / 1_000_000) * p.input + (output / 1_000_000) * p.output;
    }

    await admin.from("api_usage").insert({
      service: log.service,
      agent_type: log.agent_type || null,
      operation: log.operation,
      model: log.model || null,
      input_tokens: input,
      output_tokens: output,
      total_tokens: total,
      cost_usd: cost,
      metadata: log.metadata || null,
    });
  } catch (err) {
    // Don't let logging failures break the actual operation
    console.error("API usage log failed:", err);
  }
}

/**
 * Log a Claude/Anthropic API response.
 * Extracts token counts from the response object.
 */
export async function logClaudeUsage(
  response: { usage: { input_tokens: number; output_tokens: number } },
  agentType: string,
  operation: string,
  model: string = "claude-sonnet-4-20250514",
  metadata?: Record<string, unknown>,
): Promise<void> {
  await logApiUsage({
    service: "anthropic",
    agent_type: agentType,
    operation,
    model,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    metadata,
  });
}
