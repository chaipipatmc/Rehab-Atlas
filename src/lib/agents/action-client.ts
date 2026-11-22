import type { AgentActionJsonBody } from "./action-request";

/**
 * Browser helper for the admin dashboard: the only code that should call
 * POST /api/agents/action (lint enforces this). Always sends JSON so the route
 * replies with JSON errors (e.g. "Not sent: …") instead of an HTML page.
 */
export function postAgentAction(body: AgentActionJsonBody): Promise<Response> {
  return fetch("/api/agents/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
