<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# RehabAtlas Agent Guidelines

## shadcn/ui v4 Differences

This project uses shadcn/ui v4 which is built on `@base-ui/react` (NOT Radix). Key differences:
- Button uses `@radix-ui/react-slot` for `asChild` prop (custom implementation)
- Select wraps `onValueChange` to filter null values
- Dialog/Sheet use `@base-ui/react/dialog` with different prop names
- Accordion has no `type="single"` or `value` on items

## Design System: "The Quiet Authority"

- Primary color: `#45636b` (deep teal)
- Font: Noto Serif (headings) + Inter (body)
- No hard borders — use `ghost-border` (subtle box-shadow) or surface color shifts
- Buttons: `rounded-full` pill shape with `gradient-primary` for CTAs
- Cards: `rounded-2xl` with `shadow-ambient`
- Nav: `glass-nav` (glassmorphism backdrop-blur)
- Transitions: 300ms, never bouncy

## Critical Patterns

1. **Supabase clients:**
   - `src/lib/supabase/client.ts` — browser
   - `src/lib/supabase/server.ts` — server (with cookies)
   - `src/lib/supabase/admin.ts` — service role (bypasses RLS)

2. **Leads MUST use service role** — never insert leads from client-side

3. **Partner edits create `center_edit_requests`** — never update centers directly

4. **Blog author tracking** — `author_type` field: 'rehabatlas' or 'partner', with `author_center_id` for backlinks

5. **Commission fields** — check before forwarding leads: `commission_type`, `commission_rate`, `commission_fixed_amount`

6. **Commission tiers** — 12% base, 10% with 3 blogs/month, 8% with 5 blogs/month. Launch campaign: 0% for first 2 months with 3 blogs/month

7. **Outreach pipeline** — `outreach_pipeline` table tracks center recruitment stages (new → researching → outreach_drafted → outreach_sent → responded → terms_agreed → agreement_sent → active)

8. **Gmail API** — outreach emails sent via direct fetch calls to Gmail REST API (NOT googleapis SDK). Token refresh handled manually. All emails CC'd to info@rehab-atlas.com

9. **PandaDoc** — partnership agreements use template `Ctzua6xmeLzCVnMwsmYR9L` with tokens for center details

10. **Content Creator** — auto-generates blog articles via Claude AI with Unsplash images. 70+ predefined SEO topics. Runs weekdays only. Drafts require admin approval before publishing. Before saving, `auto-linker.ts` injects internal links to `/rehab/[condition]` and `/rehab-in/[country]` hubs (first occurrence only, capped at 6 per article, skips existing links/images/headings/code)

11. **Lead outcome tracking** — `lead_forwards.partner_status` (pending/admitted/not_admitted). Partners update at `/partner/leads`. Commission reports at `/partner/commission` and `/admin/commission`
