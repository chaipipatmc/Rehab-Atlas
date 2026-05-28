# RehabAtlas — Project Instructions

@AGENTS.md
@CONTENT_STRATEGY.md

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
3. **No commission / pricing in partner-facing comms (current policy, as of 2026-05-17)** — do **not** mention commission, referral fees, pricing tiers, or launch-campaign discounts in any outreach, follow-up, onboarding, or agreement messaging to centers. Platform is pre-traffic; partnership is positioned as free listing + admin-vetted leads + author backlinks only. Commission structure will be re-introduced later in writing once real referral volume exists; any future fees are forward-only, never retroactive.
4. **Commission DB schema retained but dormant** — `centers.commission_*`, `lead_forwards.commission_*`, and the `commission_reports` table stay in place for future use. Do not drop these columns or populate them in new flows for now.
5. **Partner edits require admin approval** — partners cannot directly modify their listing (including staff changes)
6. **Blog has two sources** — RehabAtlas editorial (AI-generated) + partner-submitted (with backlink to center profile)
7. **Lead outcome tracking** — partners mark forwarded leads as admitted/not_admitted (operational signal only; no commission attached at this stage)

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
- **Comparison pages:** SEO-friendly slug routing at `/compare/[a]-vs-[b]` (separator `-vs-`, supports 2-3 centers). Top 100 pairs pre-rendered via `generateStaticParams`, rest served via ISR (24h revalidate). Legacy `/compare?ids=` retained for saved-list flow. Each page emits FAQPage + ItemList JSON-LD for AI search citation.
- **Family-first content default:** Content Creator agent writes for the family member doing the research by default (~70% of rehab inquiries come from families, not patients themselves). Categories `family-recognition`, `family-decision`, `family-during-after` are explicit family-perspective queues.
- **Programmatic City × Condition pages:** `/rehab-in/[country]/[city]` (city hub) and `/rehab-in/[country]/[city]/[condition]` (e.g., "Alcohol Rehab in Chiang Mai"). Both pre-rendered via `generateStaticParams` from published centers, ISR 24h. URLs only emitted when ≥1 center matches. Sitemap mirrors the same logic.
- **AISO (AI Search Optimization) on blog posts:** Blog posts auto-extract FAQ sections (parsing `## Frequently Asked Questions` + `### Question` blocks) and emit FAQPage JSON-LD. Editorial articles also include `reviewedBy` schema (Rehab-Atlas Clinical Review Team) to boost E-E-A-T for YMYL content and increase quoting by ChatGPT/Claude/Perplexity.
- **Conversion attribution:** Visitors' UTM params + referrer + landing path are captured client-side on first hit via `TrafficSourceCapture` in the root layout (logic in `src/lib/traffic-source.ts`, sessionStorage, first-capture-wins). The assessment payload attaches the captured `_source` and persists it inside `assessments.answers->'_source'`. The classifier maps known AI domains (ChatGPT, Claude, Perplexity, Gemini, Copilot, You.com, Phind) to `channel="ai_referral"` so blog/Google/AI conversion can be split in SQL. Blog post CTAs are pillar-aware (`src/lib/pillars.ts`) and tag the assessment URL with `utm_source=blog&utm_medium=article_cta&utm_campaign=<pillar-slug>`.

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

12 agents automate workflows. Each can be toggled on/off at `/admin/agents`. When OFF = manual mode. When ON = agents process events → email owner for approval.

### Internal Agents
| Agent | Trigger | What It Does |
|-------|---------|-------------|
| **Center Admin** | DB webhook on `centers` + `center_edit_requests` | Checks completeness (15-point checklist), AI reviews quality |
| **Data Verifier** | Daily cron (02:30 UTC / 09:30 Bangkok) | Cross-checks each center's facts (name, address, phone, services) against its official website via Claude, and verifies each photo two ways (site URL/hash match + Claude Vision plausibility). Flags `suspicious` photos and field mismatches for one-click admin review — never auto-deletes. |
| **Content Admin** | DB webhook on `pages` (draft) | Reviews word count, SEO, medical accuracy, promotion level |
| **Lead Verify** | DB webhook on `leads` (new) | Validates lead, AI match analysis (commission check disabled while pricing is deferred) |
| **Follow-up** | Daily cron (09:00 Bangkok) | Sends reminders for stale drafts/incomplete profiles |

### Outreach Pipeline Agents (`src/lib/agents/outreach/`)
| Agent | Trigger | What It Does |
|-------|---------|-------------|
| **Research & Outreach** ("Sarah") | Orchestrator | Scrapes center websites, drafts personalized outreach emails via Claude AI |
| **Follow-up** | Daily cron | Auto-sends Day 3/7/14 follow-ups to unresponsive centers |
| **Response Handler** | Every 15 min cron | Detects Gmail replies, analyzes sentiment, auto-onboards positive responses |
| **Agreement** | Pipeline stage | Prepares PandaDoc agreements for admin approval before e-signature |
| **Activation** | PandaDoc webhook | Activates partner in DB after both parties sign (commission fields not written under current pricing-deferred policy) |
| **Master Orchestrator** | Every 30 min cron | Coordinates all outreach agents, advances pipeline stages |

### Content Agent
| Agent | Trigger | What It Does |
|-------|---------|-------------|
| **Content Creator** | Daily cron (weekdays, 1 PM Bangkok) | Auto-researches rehab topics, writes 1500-2000 word SEO articles with Unsplash images, auto-links to condition + country hubs, **runs dedup auto-rewrite loop (up to 2 retries) before saving**, saves as draft for admin approval |
| **Content Dedup** | Inline (creator + auto-approve + planner) | Two-tier duplicate detection on `pages.title`: Postgres `pg_trgm` similarity ≥ 0.6 → hard flag without Claude; ≥ 0.35 → Claude Haiku semantic judge against top-5 candidates; < 0.35 → clear. Verdict persisted on `pages.dedup_status/closest_slug/reasoning/retry_count/checked_at`. Admin override resets to `overridden` and exempts the draft from re-checking |

Architecture: `src/lib/agents/` (logic) + `src/app/api/agents/` (routes) + `src/app/admin/agents/` (dashboard)

Key tables: `agent_tasks` (task queue), `agent_follow_ups` (sequences), `agent_log` (audit), `site_settings` (toggles), `outreach_pipeline`, `outreach_emails`, `outreach_blog_counts`, `commission_reports`

Notifications: Email (Resend) + LINE Notify (urgent items) + Gmail API (outreach emails via info@rehab-atlas.com). Owner approves/rejects via dashboard or email action links (HMAC-signed, 24h TTL).

## Database Schema

Tables: `centers`, `center_photos`, `center_faqs`, `profiles`, `center_edit_requests`, `assessments`, `leads`, `lead_forwards`, `pages`, `site_faqs`, `center_staff`, `center_analytics`, `agent_tasks`, `agent_follow_ups`, `agent_log`, `site_settings`, `outreach_pipeline`, `outreach_emails`, `outreach_blog_counts`, `commission_reports`

**Data Verifier columns** (migration 025): `centers.data_verification_status` (`unverified` | `verified` | `issues_found` | `no_website`), `centers.data_verification_issues` (jsonb cache of last run's field checks + photo summary), reuses `centers.last_verified`. `center_photos.verification_status` (`unverified` | `verified` | `suspicious`), `center_photos.source_url` (URL on official site that matched, if any), `center_photos.last_verified_at`, `center_photos.verification_notes`.

Key center fields: `commission_type`, `commission_rate`, `commission_fixed_amount` *(dormant — see business rule 3)*, `agreement_status`, `contract_start`, `contract_end`, `account_manager`

Lead forward fields: `partner_status` (pending/admitted/not_admitted), `treatment_fee`, `commission_rate`, `commission_amount` *(commission_* fields dormant — see business rule 3)*

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
