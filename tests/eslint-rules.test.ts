/**
 * The project lint rules must keep firing: each case is a mistake that
 * happened before. Runs ESLint with the real eslint.config.mjs.
 */
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const cwd = fileURLToPath(new URL("..", import.meta.url));
const eslint = new ESLint({ cwd });

async function problems(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.severity === 2).map((m) => `${m.ruleId}: ${m.message}`);
}

// Built at runtime so this file holds no credential-looking literal.
const FAKE_JWT = ["eyJ", "hbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", ".e30.sig"].join("");

const cases: Array<[string, string, string, RegExp]> = [
  [
    "hard-coded secret fallback",
    "src/lib/x.ts",
    'export const s = process.env.AGENT_WEBHOOK_SECRET || "fallback-secret";',
    /No literal fallback for a secret env var/,
  ],
  ["hard-coded JWT in a script", "scripts/x.js", `const k = "${FAKE_JWT}";\nmodule.exports = k;`, /Hard-coded credential/],
  ["logging an env value", "src/lib/x.ts", "console.log(process.env.CRON_SECRET);", /Do not log process.env/],
  ["logging a token variable", "src/lib/x.ts", "export function f(refreshToken: string) { console.error(refreshToken); }", /looks like a secret/],
  [
    "logging a raw response body",
    "src/lib/x.ts",
    "export async function f(res: Response) { const body = await res.text(); console.error('failed', body); }",
    /raw HTTP response body/,
  ],
  [
    "untrimmed / non-constant-time secret compare",
    "src/app/api/x/route.ts",
    "export function ok(req: Request) { return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`; }",
    /Do not compare secrets/,
  ],
  [
    "signature compare with ===",
    "src/lib/x.ts",
    "export function ok(signature: string, expected: string) { return signature === expected; }",
    /Do not compare secrets/,
  ],
  ["persona name in outreach copy", "src/lib/agents/outreach/x.ts", 'export const sig = "Best,\\nSarah";', /No individual persona names/],
  ["persona name in admin UI", "src/app/admin/x/page.tsx", "export default function P() { return <p>From Sarah</p>; }", /persona name/],
  [
    "raw Gmail sender outside the policy module",
    "src/lib/agents/outreach/x.ts",
    'import { sendEmail } from "./gmail";\nexport const f = sendEmail;',
    /sendOutreachEmail\(\)/,
  ],
  [
    "direct Gmail REST call outside gmail.ts",
    "src/lib/x.ts",
    'export const u = "https://www.googleapis.com/gmail/v1/users/me/messages/send";',
    /Talk to Gmail only through/,
  ],
  ["new Resend outside the factory", "src/lib/x.ts", 'import { Resend } from "resend";\nexport const r = new Resend("k");', /createResendClient/],
  [
    "hand-rolled fetch to the action endpoint",
    "src/app/admin/x/page.tsx",
    'export async function f() { return fetch("/api/agents/action", { method: "POST" }); }',
    /postAgentAction/,
  ],
  [
    "edit-request payload straight into centers.update",
    "src/app/api/x/route.ts",
    'export async function f(admin: any, req: any) { await admin.from("centers").update(req.changes).eq("id", 1); }',
    /applyEditRequestChanges/,
  ],
  [
    "lead insert outside an API route",
    "src/components/x.tsx",
    'export async function f(db: any) { await db.from("leads").insert({}); }',
    /Leads are inserted only by server API routes/,
  ],
  [
    "service-role client in a client component",
    "src/components/x.tsx",
    '"use client";\nimport { createAdminClient } from "@/lib/supabase/admin";\nexport const c = createAdminClient;',
    /must not import the service-role client/,
  ],
  ["hard-coded domain in a page", "src/app/x/page.tsx", 'export const u = "https://rehab-atlas.com/centers";', /BASE_URL/],
];

describe("project lint rules", () => {
  it.each(cases)("flags: %s", async (_name, filePath, code, expected) => {
    const found = await problems(code, filePath);
    expect(found.some((p) => expected.test(p)), found.join("\n") || "no errors reported").toBe(true);
  });

  it("allows the sanctioned patterns", async () => {
    expect(await problems('console.error("Gmail send failed:", await summarizeHttpError(res));\ndeclare const res: Response;\ndeclare function summarizeHttpError(r: Response): Promise<string>;', "src/lib/x.ts")).toEqual([]);
    expect(await problems("export const ok = Boolean(process.env.CRON_SECRET);", "src/lib/x.ts")).toEqual([]);
    expect(await problems('export const n = process.env.GMAIL_CLIENT_SECRET || "";', "src/lib/x.ts")).toEqual([]);
    expect(await problems('import { sendEmail } from "./gmail";\nexport const f = sendEmail;', "src/lib/agents/outreach/policy.ts")).toEqual([]);
  });
});
