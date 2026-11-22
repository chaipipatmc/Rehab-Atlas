/**
 * Body contract for POST /api/agents/action.
 *
 * Two callers, two encodings — both handled here so they cannot drift:
 *  - Admin dashboard (via postAgentAction in ./action-client): JSON
 *    `{ task_id | token, decision: "approve" | "reject" | ..., reason? }`.
 *    The route answers JSON errors, so the UI can show the real reason.
 *  - Email confirmation page: an HTML form POST
 *    (`token`, `decision`, `center_id`, `note`); the route answers HTML.
 */

export type AgentActionDecision = "approved" | "rejected" | "needs_info";

/** What the dashboard sends. `approve`/`reject` are accepted aliases. */
export interface AgentActionJsonBody {
  task_id?: string;
  token?: string;
  decision: AgentActionDecision | "approve" | "reject";
  center_id?: string | null;
  note?: string;
  reason?: string | null;
}

export interface ParsedAgentAction {
  token: string | null;
  decision: string | null;
  centerId: string | null;
  note: string;
  /** JSON callers get JSON errors; form callers get the branded HTML page. */
  isJson: boolean;
}

export async function parseAgentActionRequest(request: Request): Promise<ParsedAgentAction> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await request.json();
    return {
      token: json.task_id || json.token,
      decision: json.decision === "approve" ? "approved" : json.decision === "reject" ? "rejected" : json.decision,
      centerId: json.center_id || null,
      note: json.note || json.reason || "",
      isJson: true,
    };
  }
  const formData = await request.formData();
  return {
    token: formData.get("token") as string,
    decision: formData.get("decision") as string,
    centerId: (formData.get("center_id") as string) || null,
    note: (formData.get("note") as string) || "",
    isJson: false,
  };
}
