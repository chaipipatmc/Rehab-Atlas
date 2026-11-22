import { describe, expect, it } from "vitest";
import { parseAgentActionRequest } from "@/lib/agents/action-request";

const URL_ = "https://rehab-atlas.test/api/agents/action";

describe("POST /api/agents/action body contract", () => {
  it("parses the dashboard JSON body (task_id + approve alias)", async () => {
    const r = new Request(URL_, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: "t-1", decision: "approve" }),
    });
    expect(await parseAgentActionRequest(r)).toEqual({
      token: "t-1",
      decision: "approved",
      centerId: null,
      note: "",
      isJson: true,
    });
  });

  it("maps reject + reason to rejected + note", async () => {
    const r = new Request(URL_, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "abc", decision: "reject", reason: "off-topic" }),
    });
    const p = await parseAgentActionRequest(r);
    expect(p.decision).toBe("rejected");
    expect(p.note).toBe("off-topic");
    expect(p.token).toBe("abc");
  });

  it("parses the email confirmation form POST", async () => {
    const form = new FormData();
    form.set("token", "short-code-12");
    form.set("decision", "approved");
    form.set("center_id", "c-9");
    const p = await parseAgentActionRequest(new Request(URL_, { method: "POST", body: form }));
    expect(p).toEqual({ token: "short-code-12", decision: "approved", centerId: "c-9", note: "", isJson: false });
  });
});
