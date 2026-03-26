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
- **Email:** Resend (transactional) + Gmail API (outreach via info@rehab-atlas.com)
- **E-Signature:** PandaDoc (partnership agreements)
- **Images:** Unsplash API (blog featured + inline images)
- **Deployment:** Vercel (Pro plan)

## Critical Business Rules

1. **ALL inquiries go to RehabAtlas admin only** — never directly to centers
2. **Admin controls lead routing** — must review before forwarding
3. **Commission tracking** — tiered: 12% base, 10% with 3 blogs/month, 8% with 5 blogs/month. Launch campaign: 0% for first 2 months with 3 blogs/month for 3 months
4. **Commission basis** — calculated from treatment fee listed on platform. Price changes require agreement amendment
5. **Partner edits require admin approval** — partners cannot directly modify their listing (including staff changes)
6. **Blog has two sources** — RehabAtlas editorial (AI-generated) + partner-submitted (with backlink to center profile)
7. **Lead outcome tracking** — partners mark forwarded leads as admitted/not_admitted. Commission applies to admitted clients only

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

11 agents automate workflows. Each can be toggled on/off at `/admin/agents`. When OFF = manual mode. When ON = agents process events → email owner for approval.

### Internal Agents
| Agent | Trigger | What It Does |
|-------|---------|-------------|
| **Center Admin** | DB webhook on `centers` + `center_edit_requests` | Checks completeness (15-point checklist), AI reviews quality |
| **Content Admin** | DB webhook on `pages` (draft) | Reviews word count, SEO, medical accuracy, promotion level |
| **Lead Verify** | DB webhook on `leads` (new) | Validates lead, checks commission agreement, AI match analysis |
| **Follow-up** | Daily cron (09:00 Bangkok) | Sends reminders for stale drafts/incomplete profiles |

### Outreach Pipeline Agents (`src/lib/agents/outreach/`)
| Agent | Trigger | What It Does |
|-------|---------|-------------|
| **Research & Outreach** ("Sarah") | Orchestrator | Scrapes center websites, drafts personalized outreach emails via Claude AI |
| **Follow-up** | Daily cron | Auto-sends Day 3/7/14 follow-ups to unresponsive centers |
| **Response Handler** | Every 15 min cron | Detects Gmail replies, analyzes sentiment, auto-onboards positive responses |
| **Agreement** | Pipeline stage | Prepares PandaDoc agreements for admin approval before e-signature |
| **Activation** | PandaDoc webhook | Updates commission in DB after both parties sign |
| **Master Orchestrator** | Every 30 min cron | Coordinates all outreach agents, advances pipeline stages |

### Content Agent
| Agent | Trigger | What It Does |
|-------|---------|-------------|
| **Content Creator** | Daily cron (weekdays, 1 PM Bangkok) | Auto-researches rehab topics, writes 1500-2000 word SEO articles with Unsplash images, saves as draft for admin approval |

Architecture: `src/lib/agents/` (logic) + `src/app/api/agents/` (routes) + `src/app/admin/agents/` (dashboard)

Key tables: `agent_tasks` (task queue), `agent_follow_ups` (sequences), `agent_log` (audit), `site_settings` (toggles), `outreach_pipeline`, `outreach_emails`, `outreach_blog_counts`, `commission_reports`

Notifications: Email (Resend) + LINE Notify (urgent items) + Gmail API (outreach emails via info@rehab-atlas.com). Owner approves/rejects via dashboard or email action links (HMAC-signed, 24h TTL).

## Database Schema

Tables: `centers`, `center_photos`, `center_faqs`, `profiles`, `center_edit_requests`, `assessments`, `leads`, `lead_forwards`, `pages`, `site_faqs`, `center_staff`, `center_analytics`, `agent_tasks`, `agent_follow_ups`, `agent_log`, `site_settings`, `outreach_pipeline`, `outreach_emails`, `outreach_blog_counts`, `commission_reports`

Key center fields: `commission_type`, `commission_rate`, `commission_fixed_amount`, `agreement_status`, `contract_start`, `contract_end`, `account_manager`

Lead forward fields: `partner_status` (pending/admitted/not_admitted), `treatment_fee`, `commission_rate`, `commission_amount`

Blog author fields on `pages`: `author_type` (rehabatlas/partner), `author_name`, `author_center_id`, `submitted_by`

## Email Notifications

**Transactional (Resend):** Sent to ADMIN_EMAIL (chaipipat.mc@gmail.com) on:
- New inquiry/lead submitted
- Partner verification request
- Partner blog submission
- Lead forwarded to center (sent to center's inquiry_email)
- Agent task notifications (approval needed)
- Partner activation confirmation

**Outreach (Gmail API via info@rehab-atlas.com):**
- Personalized outreach emails to rehab centers (persona: "Sarah")
- Follow-up emails (Day 3, 7, 14)
- Win-back replies for negative responses
- Partner onboarding credentials
- Agreement notification emails
- All outreach CC'd to info@rehab-atlas.com

## File Structure Convention

- Public pages: `src/app/` (page.tsx = server component)
- Admin pages: `src/app/admin/` (protected by role check)
- Partner pages: `src/app/partner/` (protected by role + center_id check)
- User pages: `src/app/account/` (protected by auth)
- API routes: `src/app/api/`
- Components: `src/components/` (ui/, layout/, centers/, admin/, leads/, shared/)
- Lib: `src/lib/` (supabase/, matching/, email/, agents/, agents/outreach/, constants, validators, utils)
- Outreach agents: `src/lib/agents/outreach/` (gmail.ts, esign.ts, research.ts, followup.ts, response-handler.ts, agreement.ts, activation.ts, orchestrator.ts, templates/)
- Content agent: `src/lib/agents/content-creator.ts`

## Important: When making changes

1. Always update this CLAUDE.md if architecture or business rules change
2. Update PRD file if features are added/removed
3. Update README.md if setup steps change
4. Keep AGENTS.md as-is (Next.js version warning)
