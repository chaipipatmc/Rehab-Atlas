# PRD — RehabAtlas MVP
## Product Requirements Document
**Version:** 2.0 (Current Implementation)
**Product Name:** RehabAtlas
**Tagline:** A Digital Sanctuary for Recovery
**Positioning:** Premium global rehab center discovery and referral marketplace
**Last Updated:** March 2026

---

# 1. Executive Summary

RehabAtlas is a standalone global web platform for discovering, comparing, and inquiring about rehab centers.

The platform combines:
- global rehab directory (50 centers live, 14,000+ in database)
- AI-assisted matching (5-step assessment → Claude-powered explanations)
- centralized lead intake and controlled referral system
- education blog with addiction/recovery content (SEO)
- partner portal for center self-management

RehabAtlas operates as an **information and referral marketplace**, not a medical provider and not a booking/payment system.

**Key difference from traditional platforms:**
All user inquiries are captured and controlled by RehabAtlas.
No inquiry is sent directly to rehab centers without admin mediation.

---

# 2. Product Goals

## Primary Goals
1. Build global rehab marketplace
2. Generate referral-based revenue (commission per admission)
3. Own demand funnel and lead flow
4. Build SEO authority via education content

## Year-1 Success Metrics
- organic traffic
- completed assessments
- qualified leads
- center partner sign-ups

## MVP Status: BUILT
All MVP features are implemented and functional.

---

# 3. Product Principles

1. Independent marketplace (no visible tie to any center)
2. Information/referral only (no medical advice)
3. Calm + premium + trustworthy UX ("The Quiet Authority" design system)
4. Browse-first + AI-enhanced
5. Controlled lead ownership (CRITICAL)
6. Role-based access (user / partner / admin)
7. Education-driven SEO strategy

---

# 4. Target Users

## Primary
- parents / family seeking treatment for loved ones
- individuals seeking help for themselves

## Secondary
- HR / employers
- therapists / referrers
- concierge / case managers

## Center Partners
- rehab center owners/managers seeking to manage their listing

## Scope
- Global (MVP: primarily US centers)
- English only (MVP)

---

# 5. Implemented Features (Current State)

## Public Pages
- [x] Homepage with atmospheric hero, featured centers, search bar, trust messaging
- [x] Browse Centers directory with filters (country, treatment, setting, insurance, detox)
- [x] Center Profile pages with photos, editorial ratings, FAQs, map, inquiry CTA
- [x] AI Assessment wizard (5 steps, ~2 minutes)
- [x] Match Results page with Claude-powered explanations
- [x] Confidential Inquiry form with privacy messaging
- [x] Inquiry Success confirmation with WhatsApp CTA
- [x] Education Blog with 6 SEO articles (featured images, read time, related articles)
- [x] About Us page (mission, vetting process, quality assurance, how it works)
- [x] Privacy Policy, Terms of Service, Medical Disclaimer, HIPAA Compliance, Contact pages
- [x] Mobile responsive across all pages

## Authentication & Roles
- [x] Sign Up with account type selection (Seeking Help vs. Center Representative)
- [x] Sign In with session management
- [x] Role-based navigation (different nav bars per role)
- [x] Role-based dropdown menu with avatar
- [x] Three roles: user (gray), partner (green), admin (teal)
- [x] Partner application flow with email notification to admin

## Normal User (role: user)
- [x] Profile management (/account)
- [x] My Inquiries page (/account/inquiries)
- [x] Saved Centers page (/account/saved) — placeholder

## Center Partner (role: partner)
- [x] Dashboard with stats (/partner)
- [x] Edit center profile with admin approval flow (/partner/edit)
- [x] Photo management — view, add (via URL), request removal (/partner/photos)
- [x] Write education blog articles for review (/partner/blog)
- [x] Change log with status tracking (/partner/history)
- [x] Sidebar navigation layout

## Admin Dashboard
- [x] System overview with metric cards (/admin)
- [x] Lead management with table, status, urgency, forward (/admin/leads)
- [x] Lead detail with contact info, inquiry details, assessment data, forward history (/admin/leads/[id])
- [x] Lead forwarding with commission scheme display + warnings
- [x] Center management — list, create, edit (/admin/centers)
- [x] Center form: all fields + photos upload + commission + editorial ratings
- [x] User management — change roles, link partners to centers (/admin/users)
- [x] Content management — blog/page CRUD with markdown editor (/admin/content)
- [x] Content editor with image upload + inline insert
- [x] Author tracking (RehabAtlas vs. partner) in content list
- [x] Edit request review (/admin/edit-requests)
- [x] Settings page with notification toggles (/admin/settings)
- [x] Sidebar navigation layout with search bar

## Commission & Commercial System
- [x] Commission type per center: none / percentage / fixed amount
- [x] Commission rate (%) and fixed amount ($) fields
- [x] Agreement status: none / pending / active / expired
- [x] Contract start/end dates
- [x] Account manager field
- [x] Commission notes (internal)
- [x] Commission details shown in lead forwarding UI
- [x] Warnings for expired/missing agreements

## Blog & Education System
- [x] Two content sources: RehabAtlas editorial + partner-contributed
- [x] Partner submissions go to draft (require admin publish)
- [x] Author box at end of articles with center backlink
- [x] Featured images (embedded in markdown content)
- [x] Related articles
- [x] Read time estimation
- [x] SEO metadata (meta title, meta description, OG image)
- [x] Medical disclaimer on every article

## Image Management
- [x] Supabase Storage upload (drag & drop, click to browse)
- [x] Multi-image upload for centers (grid, reorder, primary badge)
- [x] Single image upload for blog content
- [x] Inline image insert in markdown editor
- [x] External URL support as fallback
- [x] Web-scraped photos from 42 center websites (162 photos)

## Email Notifications (via Resend)
- [x] New inquiry → admin email
- [x] Partner verification request → admin email
- [x] Blog submission by partner → admin email
- [x] Lead forwarded → center's inquiry email
- [x] Branded HTML email templates

## Design System ("The Quiet Authority")
- [x] Noto Serif (headings) + Inter (body) typography
- [x] Deep teal palette (#45636b) with lithic neutral surfaces
- [x] No hard borders — ghost-border shadows + surface color layering
- [x] Pill-shaped buttons with gradient primary CTAs
- [x] Glassmorphism header (backdrop-blur)
- [x] Ambient shadows, 300ms transitions
- [x] Responsive: all pages adapt to mobile

---

# 6. Out of Scope (Not Built)

- booking/payment system
- telemedicine
- patient portal (medical records)
- insurance verification workflow
- multilingual support
- mobile app
- public user reviews/comments
- adolescent-specific flow
- revenue tracking dashboard
- AI chat assistant
- real-time notifications (WebSocket)

---

# 7. Data

## Database
- 10 tables with Row Level Security
- 50 published centers (from 14,000+ in Excel database)
- 162 scraped facility photos
- 6 education articles
- 5 legal/static pages
- Commission tracking fields on centers
- Author tracking fields on pages

## Migrations
1. `001_initial_schema.sql` — all tables, RLS, triggers, storage
2. `002_commission_fields.sql` — commission_type, rate, amount, contract dates
3. `003_blog_author_fields.sql` — author_type, author_name, author_center_id

---

# 8. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2 (App Router, TypeScript, Turbopack) |
| Database | Supabase (PostgreSQL + Auth + Storage + RLS) |
| UI | Tailwind CSS v4 + shadcn/ui v4 (@base-ui/react) |
| AI | Claude API (claude-sonnet-4-20250514) |
| Email | Resend |
| Hosting | Vercel |
| CLI | GitHub CLI, Vercel CLI, Supabase CLI |

---

# 9. Lead Flow (CRITICAL SYSTEM)

### Submission
User submits inquiry → goes ONLY to RehabAtlas (via service role API)

### No Direct Forwarding
System does NOT send leads automatically to centers

### Admin Workflow
Admin must:
1. Review inquiry in dashboard
2. View commission scheme for target center
3. Check agreement status (active/expired/none)
4. Decide routing
5. Forward manually with full audit trail

### Lead Status Workflow
New → Under Review → Awaiting Info → Ready to Forward → Forwarded → Closed

---

# 10. User Journeys

## A — Browse & Inquiry
1. Browse centers (filter by country, treatment, setting, etc.)
2. View center profile (photos, ratings, description, FAQs)
3. Submit inquiry to RehabAtlas (never to center directly)
4. Admin reviews → forwards to eligible center

## B — AI Matching
1. Complete 5-step assessment (~2 minutes)
2. Get 3 primary matches + alternatives with AI explanations
3. View matched center profiles
4. Submit inquiry → admin routing

## C — Education
1. Browse education articles on /blog
2. Read article (SEO-optimized, with related articles)
3. CTA at end → assessment or inquiry

## D — Partner Self-Service
1. Sign up as "I Represent a Center" → application submitted
2. Admin approves → changes role to partner, links to center
3. Partner edits profile → submitted as edit request → admin approves
4. Partner writes blog article → submitted as draft → admin publishes with center backlink

## E — Admin Operations
1. Dashboard overview (traffic, assessments, leads)
2. Manage leads (review, forward with commission check)
3. Manage centers (CRUD, photos, commission, badges)
4. Manage users (promote to partner/admin, link to centers)
5. Manage content (blog, static, legal pages)
6. Review partner edit requests

---

# 11. Legal & Compliance

### Implemented Pages
- Privacy Policy
- Terms of Service
- Medical Disclaimer
- HIPAA Compliance
- Contact Specialist

### Disclaimers
- Not medical advice (on all pages)
- Informational only
- Medical disclaimer on every blog article

### Privacy
- HIPAA-aligned practices
- Encryption at rest and in transit
- Controlled data sharing (only with consent)
- Medical emergency contacts shown (988, SAMHSA)

---

# 12. Non-Functional Requirements

### Performance
- [x] Turbopack for fast dev builds (~7-9s production build)
- [x] Server-side rendering for SEO pages
- [x] Image optimization via external URLs

### Security
- [x] Supabase Auth + Role-based access
- [x] Row Level Security on all tables
- [x] Service role for sensitive operations
- [x] Middleware route protection (/admin, /partner)

### Responsive
- [x] Mobile-first design with adaptive breakpoints
- [x] All pages tested for mobile viewports

---

# 13. Monetization

### Current
- Commission per admission (percentage or fixed amount)
- Commission tracking in admin dashboard
- Agreement status + contract dates

### Future
- Subscription model for premium listings
- CPC/CPL advertising
- Featured placement fees

---

# 14. SEO Strategy

### Implemented
- [x] Center profile pages with metadata
- [x] Education blog with 6 articles (addiction, treatment, dual diagnosis, family, opioids, choosing rehab)
- [x] Meta titles + descriptions on all pages
- [x] OG images for blog articles
- [x] Semantic HTML with editorial typography
- [x] Structured internal linking (blog → assessment → inquiry)

### Future
- Country landing pages
- Condition-specific landing pages
- Comprehensive treatment guides

---

# 15. Acceptance Criteria (All Met)

1. [x] Users can browse centers with filters
2. [x] Users can complete AI assessment
3. [x] System returns matches with explanations
4. [x] Users submit inquiry to platform only (not centers)
5. [x] Admin controls referral with commission visibility
6. [x] Partner portal works (edit, photos, blog, history)
7. [x] CMS works (blog + static + legal pages)
8. [x] Legal pages exist and are published
9. [x] Role-based access control works
10. [x] Email notifications working
11. [x] Mobile responsive
12. [x] Photos on centers and blog articles

---

# 16. Future Roadmap

- [ ] User reviews/ratings
- [ ] Admission tracking
- [ ] Payment/invoicing system
- [ ] Multilingual support
- [ ] Mobile app
- [ ] CRM automation
- [ ] AI chat assistant
- [ ] Real-time notifications
- [ ] Country/condition landing pages (SEO)
- [ ] Advanced analytics dashboard
- [ ] Stripe integration
- [ ] Saved centers functionality (full implementation)

---

# END OF PRD
