import { describe, expect, it } from "vitest";
import { summarizeHttpError } from "@/lib/http-error";

const FAKE_TOKEN = "ya29.a0AfH6SMBfaketokenvalue1234567890abcdef";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("summarizeHttpError", () => {
  it("returns only status + OAuth error code (Gmail invalid_grant)", async () => {
    const s = await summarizeHttpError(
      json(400, { error: "invalid_grant", error_description: `Bad token ${FAKE_TOKEN}` })
    );
    expect(s).toBe("HTTP 400 invalid_grant");
  });

  it("uses Google API error status/reason", async () => {
    expect(await summarizeHttpError(json(403, { error: { status: "PERMISSION_DENIED", message: FAKE_TOKEN } }))).toBe(
      "HTTP 403 PERMISSION_DENIED"
    );
  });

  it("never echoes the raw body", async () => {
    const s = await summarizeHttpError(new Response(`token=${FAKE_TOKEN}`, { status: 500 }));
    expect(s).toBe("HTTP 500 unknown");
    const t = await summarizeHttpError(json(400, { detail: FAKE_TOKEN, type: "request_error" }));
    expect(t).toBe("HTTP 400 request_error");
    expect(t).not.toContain(FAKE_TOKEN);
  });
});
