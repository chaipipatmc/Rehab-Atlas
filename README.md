# RehabAtlas — A Digital Sanctuary for Recovery

A global rehab center discovery and referral marketplace built with Next.js, Supabase, and Tailwind CSS.

## Features

### Public
- Premium homepage with atmospheric imagery and search
- Browse 50+ verified rehab centers with photos, ratings, and filters
- AI-powered assessment matching (5-step wizard → 3 recommended centers)
- Confidential inquiry submission (all go through admin, never directly to centers)
- Education blog with SEO-optimized addiction/recovery articles
- About Us, Privacy Policy, Terms of Service, Medical Disclaimer, HIPAA, Contact pages

### User Roles
| Role | Capabilities |
|------|-------------|
| **Normal User** | Browse, take assessment, submit inquiries, save centers, view inquiry status |
| **Center Partner** | Manage center profile (edit, photos, blog), all changes require admin approval |
| **Admin** | Full access: centers, leads, users, content, settings, commission tracking |

### Admin Dashboard
- Lead management with status workflow (New → Under Review → Forwarded → Closed)
- Center management with CRUD, photo upload, editorial ratings, commission tracking
- User management — change roles, link partners to centers, approve partner requests
- Content management — blog/page editor with markdown, SEO fields, image upload
- Partner blog review — approve/reject partner-submitted education articles
- Email notifications for new inquiries, partner requests, blog submissions
- Settings page with notification toggles

### Center Partner Portal
- Dashboard with stats (photos, pending edits, total changes)
- Edit profile (description, contact, pricing) — submitted as edit request
- Photo management — upload/remove facility photos
- Write education blog articles — submitted for admin review, published with center backlink
- Change log — full history of submitted changes with status and admin notes

### Commercial System
- Commission tracking per center (percentage or fixed amount per client)
- Agreement status (none/pending/active/expired)
- Commission details shown to admin before forwarding leads
- Contract dates and account manager tracking

## Tech Stack

- **Next.js 16.2** (App Router, TypeScript, Turbopack)
- **Supabase** (PostgreSQL, Auth, Storage, RLS)
- **Tailwind CSS v4** + shadcn/ui v4 (@base-ui/react)
- **Claude API** (@anthropic-ai/sdk) for AI matching explanations
- **Resend** for transactional emails
- **Vercel** for deployment

## Design System

"The Quiet Authority" — a premium editorial aesthetic:
- Typography: Noto Serif (headings) + Inter (body)
- Colors: Deep teal (#45636b), lithic neutral surfaces
- No hard borders — ghost borders and surface layering
- Pill-shaped buttons with gradient CTAs
- Glassmorphism navigation
- Responsive: mobile-first with adaptive breakpoints

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project
- Resend account (optional, for emails)
- Anthropic API key (optional, for AI matching)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local` and fill in credentials:
   ```bash
   cp .env.example .env.local
   ```
4. Run SQL migrations in Supabase SQL Editor:
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_commission_fields.sql
   supabase/migrations/003_blog_author_fields.sql
   ```
5. Start dev server:
   ```bash
   npm run dev
   ```
6. Open http://localhost:3000

### Seed Data
```bash
node scripts/import-50.js      # Import 50 centers from Excel
node scripts/update-urls.js     # Fix center website URLs
node scripts/scrape-photos.js   # Scrape facility photos
node scripts/seed-articles.js   # Seed education blog articles
node scripts/seed-pages.js      # Seed legal & static pages
```

### Admin Login
Create admin user:
```bash
node -e "..." # See scripts section
```
Default: `admin@admin.com` / `Admin123`

## Project Structure

```
src/
├── app/
│   ├── page.tsx                     # Homepage
│   ├── about/                       # About Us
│   ├── centers/                     # Directory + [slug] profiles
│   ├── assessment/                  # Wizard + results
│   ├── inquiry/                     # Form + success
│   ├── blog/                        # Education + [slug] articles
│   ├── pages/[slug]/               # CMS pages (legal, contact)
│   ├── auth/                        # Login, signup
│   ├── account/                     # User profile, inquiries, saved
│   ├── admin/                       # Dashboard, leads, centers, users, content, settings
│   ├── partner/                     # Dashboard, edit, photos, blog, history
│   └── api/                         # leads, assessment, admin/centers, admin/content, partner-blog
├── components/
│   ├── ui/                          # shadcn/ui components
│   ├── layout/                      # Header (role-aware), Footer
│   ├── centers/                     # Card, filters, sort, ratings, badges
│   ├── admin/                       # Lead actions, image upload
│   ├── leads/                       # Inquiry form
│   └── shared/                      # Pagination, analytics, JSON-LD, contact form
├── lib/
│   ├── supabase/                    # client, server, admin
│   ├── matching/                    # scoring, weights, explain (Claude AI)
│   ├── email/send.ts               # Resend notifications
│   ├── rate-limit.ts               # In-memory API rate limiter
│   ├── csrf.ts                     # Origin validation for CSRF protection
│   ├── constants.ts
│   └── validators.ts
├── hooks/                           # use-assessment
├── types/                           # center, lead, assessment
└── middleware.ts                    # Auth guard (admin/partner routes)
```

## Database Schema

10 tables with RLS policies:
- `centers` — 80+ fields including commission tracking
- `center_photos` — facility images (Supabase Storage)
- `center_faqs` — per-center FAQ items
- `profiles` — user profiles with roles (user/partner/admin)
- `center_edit_requests` — partner edit submissions (JSONB diff)
- `assessments` — completed assessments with match results
- `leads` — inquiry submissions (admin-only access)
- `lead_forwards` — audit log of forwarded leads
- `pages` — CMS content (blog, static, legal) with author tracking
- `site_faqs` — global FAQ items

## Security

- **Rate limiting** on all public API routes (in-memory, configurable per-endpoint)
- **CSRF protection** via Origin/Referer header validation on all POST routes
- **Security headers** (HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy)
- **Input validation** with Zod schemas — enum-constrained arrays, max lengths, phone format
- **Upload security** — MIME + extension whitelist, UUID center_id validation, 10MB limit
- **RLS policies** on all Supabase tables — leads are admin-only, profiles limited to own
- **Service role isolation** — admin operations use server-side API routes, never browser Supabase
- **Generic error messages** — detailed errors logged server-side only

## License

Private — All rights reserved.
