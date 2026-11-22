# scripts/archive — deprecated, do not run

These one-off scripts are kept for history only (archived 2026-11-22 by board decision):

- `send-partner-replies.mjs`
- `onboard-3.mjs`
- `onboard-partners.ts`
- `resend-credentials.ts`

Why they must not be run:

- They send email to partner centers directly through the Gmail API, bypassing
  `sendOutreachEmail()` in `src/lib/agents/outreach/policy.ts` — no admin
  approval queue (board decision D6), no exclusion list (The Hills), no opt-out
  check, no unsubscribe footer and no daily send cap.
- They sign as an individual persona ("Sarah"); outreach is signed as
  "The Rehab-Atlas Team".

Outbound partner email goes only through the approval queue in the app
(`/admin/agents`). If a bulk action is ever needed again, build it on
`sendOutreachEmail()` instead of reviving these files.
