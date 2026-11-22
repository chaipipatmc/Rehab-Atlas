/**
 * Safe one-line summary of a failed HTTP response for server logs.
 *
 * Third-party error bodies can echo request data (tokens, emails, payloads),
 * so logs get only "HTTP <status> <code>" — never the raw body. Enforced by
 * lint (rehab/no-secret-in-logs): do not pass `await res.text()` /
 * `await res.json()` results to console.*; call summarizeHttpError(res).
 */

type ErrorBody = {
  error?: string | { status?: string; code?: number | string; errors?: Array<{ reason?: string }> };
  message?: unknown;
  type?: unknown;
  code?: unknown;
};

function sanitizeCode(raw: string): string {
  return raw.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 64) || "unknown";
}

/** Reads the body once (JSON), returns e.g. "HTTP 400 invalid_grant". */
export async function summarizeHttpError(response: Response): Promise<string> {
  let code = "unknown";
  try {
    const data = (await response.json()) as ErrorBody;
    if (typeof data?.error === "string") {
      code = data.error; // OAuth token endpoint, e.g. "invalid_grant"
    } else if (data?.error) {
      code = data.error.status || data.error.errors?.[0]?.reason || String(data.error.code ?? "unknown");
    } else if (typeof data?.type === "string") {
      code = data.type; // PandaDoc, e.g. "request_error"
    } else if (typeof data?.code === "string" || typeof data?.code === "number") {
      code = String(data.code);
    } else if (typeof data?.message === "string") {
      code = data.message; // LINE, e.g. "The request body has 1 error(s)"
    }
  } catch {
    // body not JSON — keep "unknown"
  }
  return `HTTP ${response.status} ${sanitizeCode(code)}`;
}
