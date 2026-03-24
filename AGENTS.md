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
