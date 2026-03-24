# RehabAtlas — Project Instructions

@AGENTS.md

## Project Overview

RehabAtlas is a global rehab center discovery and referral marketplace. Users browse centers, complete AI assessments, and submit inquiries — all routed through RehabAtlas admin (never directly to centers).

## Tech Stack

- **Framework:** Next.js 16.2 (App Router, TypeScript, Turbopack)
- **Database + Auth:** Supabase (PostgreSQL + Supabase Auth + Storage)
- **UI:** Tailwind CSS v4 + shadcn/ui v4 (uses @base-ui/react, NOT Radix)
- **Design System:** "The Quiet Authority" — Noto Serif + Inter, teal palette (#45636b), no hard borders, glassmorphism nav
- **AI:** Template-based matching by default; Claude API (`@anthropic-ai/sdk`, claude-sonnet-4-20250514) optional when ANTHROPIC_API_KEY is set
- **Email:** Resend (transactional notifications to chaipipat.mc@gmail.com)
- **Deployment:** Vercel

## Critical Business Rules

1. **ALL inquiries go to RehabAtlas admin only** — never directly to centers
2. **Admin controls lead routing** — must review before forwarding
3. **Commission tracking** — each center has commission_type (none/percentage/fixed), shown before forwarding leads
4. **Partner edits require admin approval** — partners cannot directly modify their listing (including staff changes)
5. **Blog has two sources** — RehabAtlas editorial + partner-submitted (with backlink to center profile)

## User Roles

| Role | Access | Avatar |
|------|--------|--------|
| `user` | Browse, assess, inquire, save favorites | Gray |
| `partner` | Manage own center (edit, photos, blog), all changes need approval | Green |
| `admin` | Full access: centers, leads, users, content, settings | Teal gradient |

## Key Architecture Decisions

- Server Components by default; Client Components only for interactive parts
- Service role for leads table (client never inserts directly)
- Admin center/content mutations go through API routes (`/api/admin/centers`, `/api/admin/content`), not direct browser Supabase
- URL-param filters on directory (shareable, bookmarkable)
- Middleware skips auth when Supabase URL is not configured
- Photos stored in Supabase Storage `center-photos` bucket
- Blog featured images embedded as `![featured](url)` in markdown content

## Security

- **Rate limiting:** In-memory rate limiter (`src/lib/rate-limit.ts`) on all public APIs — leads (10/hr), assessment (5/hr), contact (5/hr), partner-request (3/hr)
- **CSRF:** Origin/Referer header validation (`src/lib/csrf.ts`) on all state-changing POST routes
- **Security headers:** X-Frame-Options DENY, HSTS, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy (in `next.config.ts`)
- **Input validation:** Zod schemas with enum constraints, max lengths, phone format validation
- **Upload validation:** MIME type + file extension whitelist, UUID validation on center_id, 10MB size limit
- **Error handling:** Generic error messages returned to client; detailed errors logged server-side only
- **TypeScript:** Strict mode, no `ignoreBuildErrors` — all type errors must be resolved before deploy
- **Session signing:** Assessment session cookies are HMAC-signed to prevent forgery
- **AI optional:** Assessment matching works with templates by default; Claude API enhances explanations when configured

## AI Agent System

4 agents automate admin workflows. Each can be toggled on/off at `/admin/agents`. When OFF = manual mode (original behavior). When ON = agents process events → email owner for approval.

| Agent | Trigger | What It Does |
|-------|---------|-------------|
| **Center Admin** | DB webhook on `centers` + `center_edit_requests` | Checks completeness (15-point checklist), AI reviews quality |
| **Content Admin** | DB webhook on `pages` (draft) | Reviews word count, SEO, medical accuracy, promotion level |
| **Lead Verify** | DB webhook on `leads` (new) | Validates lead, checks commission agreement, AI match analysis |
| **Follow-up** | Daily cron (09:00 Bangkok) | Sends reminders for stale drafts/incomplete profiles |

Architecture: `src/lib/agents/` (logic) + `src/app/api/agents/` (routes) + `src/app/admin/agents/` (dashboard)

Key tables: `agent_tasks` (task queue), `agent_follow_ups` (sequences), `agent_log` (audit), `site_settings` (toggles)

Notifications: Email (Resend) + LINE Notify (urgent items). Owner approves/rejects via email action links (HMAC-signed, 24h TTL).

## Database Schema

Tables: `centers`, `center_photos`, `center_faqs`, `profiles`, `center_edit_requests`, `assessments`, `leads`, `lead_forwards`, `pages`, `site_faqs`

Key center fields: `commission_type`, `commission_rate`, `commission_fixed_amount`, `agreement_status`, `contract_start`, `contract_end`, `account_manager`

Blog author fields on `pages`: `author_type` (rehabatlas/partner), `author_name`, `author_center_id`, `submitted_by`

## Email Notifications

Sent to ADMIN_EMAIL (chaipipat.mc@gmail.com) on:
- New inquiry/lead submitted
- Partner verification request
- Partner blog submission
- Lead forwarded to center (sent to center's inquiry_email)

## File Structure Convention

- Public pages: `src/app/` (page.tsx = server component)
- Admin pages: `src/app/admin/` (protected by role check)
- Partner pages: `src/app/partner/` (protected by role + center_id check)
- User pages: `src/app/account/` (protected by auth)
- API routes: `src/app/api/`
- Components: `src/components/` (ui/, layout/, centers/, admin/, leads/, shared/)
- Lib: `src/lib/` (supabase/, matching/, email/, constants, validators, utils)

## Important: When making changes

1. Always update this CLAUDE.md if architecture or business rules change
2. Update PRD file if features are added/removed
3. Update README.md if setup steps change
4. Keep AGENTS.md as-is (Next.js version warning)
