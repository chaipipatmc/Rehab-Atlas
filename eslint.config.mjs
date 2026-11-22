import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import globals from "globals";
import rehab from "./eslint-rules/rehab.mjs";

/*
 * Project rules — every entry below replaces a prose rule that agents kept
 * breaking. The message is the fix. Keep comments here short; if a rule needs
 * an exception, give it a file-scoped override below, not an eslint-disable.
 * Tests for these rules: tests/eslint-rules.test.ts.
 */

const restrict = (selector, message) => ({ selector, message });

// Applies to src/ and scripts/.
const SECRET_LITERAL = [
  restrict(
    "Literal[value=/^(eyJ[A-Za-z0-9_-]{20,}\\.|sk-ant-|sk-proj-|sk_live_|GOCSPX-|xox[abp]-|ghp_|re_(?!placeholder)[A-Za-z0-9_]{16,})/]",
    "Hard-coded credential. Read it from env (src: process.env / readSecretEnv(); scripts: requireEnv() from scripts/lib/require-env.cjs). The repo is public — rotate any key that was committed."
  ),
  restrict(
    "TemplateElement[value.raw=/(eyJ[A-Za-z0-9_-]{20,}\\.|sk-ant-|sk-proj-|sk_live_|GOCSPX-)/]",
    "Hard-coded credential in a template string. Read it from env instead; rotate any key that was committed."
  ),
  restrict(
    "LogicalExpression[left.object.object.name='process'][left.object.property.name='env'][left.property.name=/(SECRET|TOKEN|PASSWORD|_KEY|KEY_|SERVICE_ROLE)/][right.type='Literal'][right.value=/./]",
    "No literal fallback for a secret env var (`process.env.X_SECRET || \"...\"`). A missing secret must fail closed: use readSecretEnv() from @/lib/secrets and reject when it returns null."
  ),
];

const SRC_NEW_RESEND = restrict(
  "NewExpression[callee.name='Resend']",
  "Create Resend clients only via createResendClient() from @/lib/email/resend (single place for key handling)."
);
const SRC_PERSONA = [
  restrict(
    "Literal[value=/\\bSarah\\b/]",
    "No individual persona names in outreach. Use resolvePersona()/DEFAULT_PERSONA_NAME (\"The Rehab-Atlas Team\") from @/lib/agents/outreach/persona."
  ),
  restrict(
    "TemplateElement[value.raw=/\\bSarah\\b/]",
    "No individual persona names in outreach. Use resolvePersona()/DEFAULT_PERSONA_NAME from @/lib/agents/outreach/persona."
  ),
  restrict(
    "JSXText[value=/\\bSarah\\b/]",
    "Do not hard-code a persona name in the UI — show the value from resolveFromAddress() (@/lib/agents/outreach/persona)."
  ),
];
const SRC_ACTION_FETCH = restrict(
  "Literal[value='/api/agents/action']",
  "Call the owner-action endpoint through postAgentAction() (@/lib/agents/action-client): it always sends the JSON body the route expects (form bodies get HTML errors)."
);
const SRC_GMAIL_API = [
  restrict(
    "Literal[value=/googleapis\\.com\\/gmail/]",
    "Talk to Gmail only through src/lib/agents/outreach/gmail.ts; outbound outreach goes through sendOutreachEmail() (@/lib/agents/outreach/policy) after admin approval."
  ),
  restrict(
    "TemplateElement[value.raw=/googleapis\\.com\\/gmail/]",
    "Talk to Gmail only through src/lib/agents/outreach/gmail.ts; outbound outreach goes through sendOutreachEmail() after admin approval."
  ),
];
const SRC_EDIT_REQUEST_APPLY = [
  restrict(
    "CallExpression[callee.property.name='update'][callee.object.callee.property.name='from'][callee.object.arguments.0.value='centers'][arguments.0.name=/changes$/i]",
    "Never pass an edit-request `changes` payload to centers.update() — it carries a `staff` array. Apply approvals with applyEditRequestChanges() from @/lib/edit-requests."
  ),
  restrict(
    "CallExpression[callee.property.name='update'][callee.object.callee.property.name='from'][callee.object.arguments.0.value='centers'][arguments.0.property.name='changes']",
    "Never pass an edit-request `changes` payload to centers.update() — it carries a `staff` array. Apply approvals with applyEditRequestChanges() from @/lib/edit-requests."
  ),
];
const SRC_LEADS_INSERT = restrict(
  "CallExpression[callee.property.name='insert'][callee.object.callee.property.name='from'][callee.object.arguments.0.value='leads']",
  "Leads are inserted only by server API routes (src/app/api/**) with the service-role client — never from pages, components or lib code."
);
const UI_HARDCODED_DOMAIN = [
  restrict(
    "Literal[value=/https?:\\/\\/(www\\.)?rehab-atlas\\.com/]",
    "Do not hard-code the site domain in pages/components. Use BASE_URL from @/lib/site."
  ),
  restrict(
    "TemplateElement[value.raw=/https?:\\/\\/(www\\.)?rehab-atlas\\.com/]",
    "Do not hard-code the site domain in pages/components. Use BASE_URL from @/lib/site."
  ),
];

const SRC_ALL = [
  ...SECRET_LITERAL,
  SRC_NEW_RESEND,
  ...SRC_PERSONA,
  SRC_ACTION_FETCH,
  ...SRC_GMAIL_API,
  ...SRC_EDIT_REQUEST_APPLY,
  SRC_LEADS_INSERT,
];
const without = (list, ...drop) => list.filter((r) => !drop.flat().includes(r));
const syntax = (list) => ({ "no-restricted-syntax": ["error", ...list] });

const RAW_SEND_IMPORT = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          group: ["**/outreach/gmail", "./gmail"],
          importNames: ["sendEmail"],
          message:
            "Do not call the raw Gmail sender. Use sendOutreachEmail() from @/lib/agents/outreach/policy, only from an admin-approval path: it enforces exclusions (The Hills), opt-outs, the unsubscribe footer and the daily cap (fail-closed).",
        },
      ],
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { rehab },
    rules: {
      "rehab/no-secret-in-logs": "error",
      "rehab/timing-safe-secret-compare": "error",
      "rehab/no-admin-client-in-client-component": "error",
    },
  },
  // ── src/ ────────────────────────────────────────────────────────────────
  { files: ["src/**/*.{ts,tsx}"], rules: { ...syntax(SRC_ALL), ...RAW_SEND_IMPORT } },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: syntax([...SRC_ALL, ...UI_HARDCODED_DOMAIN]),
  },
  { files: ["src/app/api/**/*.ts"], rules: syntax(without(SRC_ALL, SRC_LEADS_INSERT)) },
  // The one module allowed to do each thing:
  { files: ["src/lib/email/resend.ts"], rules: syntax(without(SRC_ALL, SRC_NEW_RESEND)) },
  { files: ["src/lib/agents/action-client.ts"], rules: syntax(without(SRC_ALL, SRC_ACTION_FETCH)) },
  { files: ["src/lib/agents/outreach/gmail.ts"], rules: syntax(without(SRC_ALL, SRC_GMAIL_API)) },
  { files: ["src/lib/edit-requests.ts"], rules: syntax(without(SRC_ALL, SRC_EDIT_REQUEST_APPLY)) },
  { files: ["src/lib/agents/outreach/policy.ts"], rules: { "no-restricted-imports": "off" } },
  // The article prompt names "Sarah" as an example of a banned opening, not as a persona.
  { files: ["src/lib/agents/content-creator.ts"], rules: syntax(without(SRC_ALL, SRC_PERSONA)) },
  // ── scripts/ (one-off maintenance, run locally) ─────────────────────────
  { files: ["scripts/**/*.{js,cjs,mjs,ts}"], rules: syntax(SECRET_LITERAL) },
  {
    files: ["scripts/**/*.{js,cjs}"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Its job is to print a new Gmail refresh token once, in the owner's own
  // Terminal (never inside a Claude session — output lands in the transcript).
  { files: ["scripts/gmail-auth.ts"], rules: { "rehab/no-secret-in-logs": "off" } },
  // ── React Compiler rules: documented exceptions (refactor, then delete) ──
  // use-assessment: restores in-progress answers from localStorage after
  //   hydration (reading during render would mismatch SSR) → move to
  //   useSyncExternalStore.
  // admin/outreach: fetch-on-mount through a useCallback loader that sets
  //   state progressively → split into a fetch function + one state update.
  {
    files: ["src/hooks/use-assessment.ts", "src/app/admin/outreach/page.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  // Async Server Components render once per request, so reading the clock is
  // the intended input, not an impure client render.
  {
    files: ["src/app/admin/page.tsx", "src/app/admin/analytics/page.tsx"],
    rules: { "react-hooks/purity": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone Lisa project — has its own tsconfig/deps (see lisa/README.md)
    "lisa/**",
  ]),
]);

export default eslintConfig;
