  # RehabAtlas — User Stories (MVP)
**Last Updated:** March 2026

---

## 1. User Stories — End Users (Visitors)

### US-001 — Browse Rehab Centers [DONE]
**As a user,**
I want to browse rehab centers worldwide,
So that I can explore available treatment options without needing prior knowledge.

**Status:** Implemented
- Listing page at `/centers` with 50 published centers
- Each card shows name, location, photo, short description, pricing, badges
- Click into full profile page

---

### US-002 — Filter and Search [DONE]
**As a user,**
I want to filter rehab centers by relevant criteria,
So that I can narrow down options that match my needs.

**Status:** Implemented
- Filters: country, treatment focus, setting type, insurance, detox toggle
- Search by name
- Filters update URL params (shareable, bookmarkable)
- Filters can be combined

---

### US-003 — Sort Results [DONE]
**As a user,**
I want to sort rehab centers,
So that I can prioritize results based on my preference.

**Status:** Implemented
- Sort by: relevance, featured, price (asc/desc), rating

---

### US-004 — View Rehab Profile [DONE]
**As a user,**
I want to view a detailed rehab center profile,
So that I can understand if it is suitable for my situation.

**Status:** Implemented
- Profile includes: photo gallery, overview, treatment focus tags, conditions, services, living experience, editorial ratings, editorial quote, pricing, FAQs accordion, map, inquiry CTA
- Sticky sidebar with contact info, insurance, inquiry button
- AI match indicator if assessment completed

---

### US-005 — Start AI Assessment [DONE]
**As a user,**
I want to complete a short assessment,
So that I can get recommended rehab centers based on my situation.

**Status:** Implemented
- 5-step wizard: Who, Issue, Severity, Preferences, Urgency
- ~2 minutes completion
- Progress bar with step labels
- Card-based selection UI (Myself/Loved One)
- Crisis warning for urgent cases

---

### US-006 — Receive AI Matches [DONE]
**As a user,**
I want to receive recommended rehab centers,
So that I can quickly identify suitable options.

**Status:** Implemented
- 3 primary matches with photos, scores, Claude-powered explanations
- Alternative centers below
- Methodology explanation (Clinical Alignment, Resource Availability, Budget Fit)
- CTA to inquire or view profile

---

### US-007 — See Personalized Fit [DONE]
**As a user,**
I want to see why a rehab center matches my needs,
So that I feel confident in the recommendation.

**Status:** Implemented
- AI match indicator on center profile with explanation
- Claude API generates 2-3 sentence explanations per match
- Template fallback if API fails

---

### US-008 — Submit Inquiry [DONE]
**As a user,**
I want to submit an inquiry,
So that RehabAtlas can help connect me with a suitable center.

**Status:** Implemented
- Form: name, email, phone, country, who_for, age, concern, urgency, budget, message, consent, request_call
- Privacy messaging sidebar (HIPAA, encryption, advocacy)
- NO direct contact with center
- Email notification sent to admin

---

### US-009 — Understand Next Steps [DONE]
**As a user,**
I want to understand what happens after submission,
So that I feel reassured and know what to expect.

**Status:** Implemented
- Success page with confirmation
- Timeline: "2-4 hours" response expectation
- WhatsApp CTA
- Trust badges (HIPAA, Secure Data)

---

### US-010 — Handle Urgent Cases [DONE]
**As a user,**
I want to see guidance when my situation is urgent,
So that I know I should seek immediate help.

**Status:** Implemented
- Warning shown for urgent responses in assessment
- Crisis contacts: 988, SAMHSA (1-800-662-4357), Crisis Text Line
- "Find local resources" link
- User can still continue browsing

---

### US-030 — Create Account [DONE]
**As a user,**
I want to create an account,
So that I can save preferences and track my inquiries.

**Status:** Implemented
- Two-step signup: choose account type → fill form
- Account types: "I'm Seeking Help" (instant) or "I Represent a Center" (application)
- Email verification
- Auto-creates profile with 'user' role

---

### US-031 — View My Profile [DONE]
**As a user,**
I want to view and edit my profile,
So that I can manage my account information.

**Status:** Implemented
- Profile page at `/account` with avatar, name, email, role, member since
- Edit full name
- Quick links to role-specific dashboards
- Sign out

---

### US-032 — Read Education Content [DONE]
**As a user,**
I want to read educational articles about addiction and recovery,
So that I can make informed decisions.

**Status:** Implemented
- Blog at `/blog` with 6 SEO articles
- Featured article with hero image
- Article cards with photos, read time, dates
- Article page with editorial typography, author box, related articles, medical disclaimer
- CTA to assessment/inquiry at end of each article

---

### US-033 — View About & Legal Pages [DONE]
**As a user,**
I want to view information about RehabAtlas and legal terms,
So that I can trust the platform.

**Status:** Implemented
- About Us page with mission, vetting process, quality assurance
- Privacy Policy, Terms of Service, Medical Disclaimer, HIPAA Compliance, Contact pages
- All managed via CMS

---

## 2. User Stories — Admin / Concierge Team

### US-011 — View Incoming Leads [DONE]
**As an admin,**
I want to see all incoming inquiries,
So that I can manage and route leads properly.

**Status:** Implemented
- Recent leads table on dashboard with avatar initials, date, status, urgency, center
- Leads list page with full table

---

### US-012 — Review Lead Details [DONE]
**As an admin,**
I want to review lead information and preferences,
So that I can decide the best referral action.

**Status:** Implemented
- Lead detail: contact info, inquiry details, assessment data (JSON), forward history
- Status badges, urgency indicators

---

### US-013 — Control Referral Routing [DONE]
**As an admin,**
I want to control which rehab center receives the lead,
So that I ensure only eligible partners get referrals.

**Status:** Implemented
- NO auto-forwarding
- Admin selects center from dropdown (shows commission info inline)
- Commission details panel before forwarding
- Warnings for expired/missing agreements
- System logs forwarding action in `lead_forwards`

---

### US-014 — Check Partner Eligibility & Commission [DONE]
**As an admin,**
I want to verify center eligibility and commercial terms,
So that I know the commission scheme before forwarding.

**Status:** Implemented
- Commission type (percentage/fixed/none), rate, amount displayed
- Agreement status badge (Active/Pending/Expired/None)
- Account manager, contract dates, commission notes
- Default to client's preferred center in dropdown

---

### US-015 — Update Lead Status [DONE]
**As an admin,**
I want to update lead status,
So that I can track progress.

**Status:** Implemented
- Statuses: New, Under Review, Awaiting Info, Ready to Forward, Forwarded, Closed
- Admin notes field

---

### US-016 — Forward Lead [DONE]
**As an admin,**
I want to forward a lead to a rehab center,
So that the center can contact the user.

**Status:** Implemented
- Email sent to center's inquiry_email via Resend
- Records: center, timestamp, forwarded_by, method
- Status auto-updated to "forwarded"

---

### US-017 — Manage Centers [DONE]
**As an admin,**
I want to add and edit rehab centers,
So that the platform stays updated.

**Status:** Implemented
- Create center: `/admin/centers/new` with all fields, photo upload, commission, editorial ratings
- Edit center: `/admin/centers/[id]` with same fields
- Photo management: multi-image upload (drag & drop), reorder, delete
- Status: draft/published/archived

---

### US-018 — Approve Partner Edits [DONE]
**As an admin,**
I want to approve or reject partner updates,
So that data quality is controlled.

**Status:** Implemented
- Edit requests list at `/admin/edit-requests`
- Show JSONB diff (current vs. proposed)
- Approve/reject with note
- Audit trail maintained

---

### US-019 — Manage Content [DONE]
**As an admin,**
I want to manage content pages and blog articles,
So that I can update the platform easily.

**Status:** Implemented
- Content list split: Blog/Articles + Static/Legal pages
- Author column shows "RehabAtlas" or partner center name
- Create/edit with markdown editor, SEO fields, image upload
- Inline image insert button for markdown
- Save draft / Publish workflow
- Delete content

---

### US-020 — View Dashboard Metrics [DONE]
**As an admin,**
I want to view performance metrics,
So that I can monitor growth.

**Status:** Implemented (basic)
- Metric cards: Total Traffic, Assessments, New Leads (with trend indicators)
- Recent leads table

---

### US-034 — Manage Users & Roles [DONE]
**As an admin,**
I want to manage user accounts and roles,
So that I can approve partner requests and control access.

**Status:** Implemented
- User list at `/admin/users` with search, role badges, linked centers
- Change role: User → Partner → Admin
- Link partner to specific center via dropdown
- Role counts summary

---

### US-035 — Review Partner Blog Submissions [DONE]
**As an admin,**
I want to review and publish blog articles submitted by center partners,
So that quality education content can be published with center backlinks.

**Status:** Implemented
- Partner submissions appear as drafts in Content Management
- Author column shows partner center name
- Admin can edit, then publish
- Published with author box + center backlink

---

### US-036 — Receive Email Notifications [DONE]
**As an admin,**
I want to receive email notifications for important events,
So that I can respond promptly.

**Status:** Implemented
- New inquiry/lead → email to admin
- Partner verification request → email to admin
- Partner blog submission → email to admin
- Lead forwarded → email to center
- Branded HTML templates

---

### US-037 — Platform Settings [DONE]
**As an admin,**
I want to configure platform settings,
So that I can manage notifications and preferences.

**Status:** Implemented
- Settings page at `/admin/settings`
- General: site name, currency, WhatsApp number
- Notification toggles: new lead, partner request, edit request
- Admin email configuration
- Security: email verification toggle

---

## 3. User Stories — Rehab Partners

### US-021 — Login to Portal [DONE]
**As a rehab partner,**
I want to log into the system,
So that I can manage my center profile.

**Status:** Implemented
- Login at `/auth/login`
- Role-based redirect to partner portal
- Partner sidebar navigation

---

### US-022 — Edit Profile [DONE]
**As a rehab partner,**
I want to edit my center information,
So that it stays accurate.

**Status:** Implemented
- Allowed fields: short description, description, phone, email, website, pricing
- Changes submitted as edit request (not direct update)

---

### US-023 — Submit Changes for Approval [DONE]
**As a rehab partner,**
I want to submit updates for review,
So that they can be published.

**Status:** Implemented
- Changes create `center_edit_requests` record
- Admin reviews and approves/rejects
- Change log visible to partner

---

### US-024 — Cannot Modify Restricted Data [DONE]
**As a rehab partner,**
I should not be able to modify ratings or badges,
So that platform integrity is preserved.

**Status:** Implemented
- Partner form only shows allowed fields
- Ratings, badges, commission — admin only

---

### US-038 — Manage Photos [DONE]
**As a rehab partner,**
I want to add and remove photos of my facility,
So that my listing looks attractive and up to date.

**Status:** Implemented
- Photo gallery at `/partner/photos`
- Add photos (submit for admin review)
- Request photo removal
- Primary photo badge

---

### US-039 — Write Blog Articles [DONE]
**As a rehab partner,**
I want to write educational articles,
So that they can be published on RehabAtlas with a backlink to my center.

**Status:** Implemented
- Blog editor at `/partner/blog` with title, summary, featured image, markdown content
- Submitted as draft (admin must approve)
- Published with "Written by [Center Name]" author box + backlink to center profile
- Submission history with status tracking

---

### US-040 — View Change History [DONE]
**As a rehab partner,**
I want to see a log of all my submitted changes,
So that I can track what was approved or rejected.

**Status:** Implemented
- Change log at `/partner/history`
- Shows all edit requests with status (Pending/Approved/Rejected)
- Admin review notes visible
- Change details (what was modified)

---

### US-041 — Apply as Center Partner [DONE]
**As a center representative,**
I want to apply for a partner account,
So that I can manage my center's listing on RehabAtlas.

**Status:** Implemented
- Signup flow with "I Represent a Center" option
- Application form: center name, website, role, message
- Email notification to admin
- Admin approves via Users page (changes role + links to center)

---

## 4. System-Level User Stories

### US-025 — Controlled Lead Intake [DONE]
**As the system,**
I must capture all inquiries internally,
So that no leads bypass RehabAtlas.

**Status:** Implemented
- Leads inserted via service role API (client never accesses leads table)
- RLS policy: admin-only access to leads

---

### US-026 — No Direct Lead Forwarding [DONE]
**As the system,**
I must not automatically send inquiries to rehab centers,
So that admin retains control.

**Status:** Implemented
- No automated forwarding logic
- Admin must manually select center and confirm

---

### US-027 — Referral Logging [DONE]
**As the system,**
I must log all forwarded leads,
So that tracking and accountability are maintained.

**Status:** Implemented
- `lead_forwards` table records: lead_id, center_id, forwarded_by, method, timestamp
- Forward history visible on lead detail page

---

### US-028 — Matching Engine Execution [DONE]
**As the system,**
I must calculate match scores based on user input,
So that recommendations are consistent.

**Status:** Implemented
- Rule-based scoring (0-103 points across 9 dimensions)
- Pre-filter for hard mismatches (e.g., needs detox but center has none)
- Weights: treatment focus (25), conditions (15), services (15), budget (15), location (10), insurance (10), program (5), quality (5), partner (3)

---

### US-029 — LLM Explanation Layer [DONE]
**As the system,**
I must generate human-readable explanations,
So that users understand recommendations.

**Status:** Implemented
- Claude API (claude-sonnet-4-20250514) generates explanations for top 3 matches
- Prompt includes assessment answers + center data
- Template-based fallback if API fails
- Rules: no diagnosis, no guarantees, use "may be suitable"

---

### US-042 — Role-Based Access Control [DONE]
**As the system,**
I must enforce different access levels based on user role,
So that data security and platform integrity are maintained.

**Status:** Implemented
- Middleware protects /admin (admin only) and /partner (partner + admin)
- RLS policies on all tables
- Role-based navigation (different menus per role)
- Role-based avatar colors and badges

---

### US-043 — Email Notification System [DONE]
**As the system,**
I must send email notifications for critical events,
So that the admin team can respond promptly.

**Status:** Implemented
- Resend integration with branded HTML templates
- Triggers: new lead, partner request, blog submission, lead forward

---

### US-044 — Commission Tracking [DONE]
**As the system,**
I must track commercial agreements per center,
So that the admin team can make informed referral decisions.

**Status:** Implemented
- Commission type (none/percentage/fixed), rate, amount, currency
- Agreement status with contract dates
- Account manager assignment
- Visible in lead forwarding UI with warnings

---

---

## 5. Post-MVP User Stories — Outreach & Commission

### US-045 — Outreach Pipeline [DONE]
**As an admin,**
I want an automated outreach pipeline that researches centers, drafts personalized emails, and manages follow-ups,
So that I can recruit partner centers at scale without manual effort.

**Status:** Implemented
- 6-agent pipeline: Research → Follow-up → Response Handler → Agreement → Activation → Orchestrator
- Gmail API sends emails as "Sarah" from info@rehab-atlas.com
- Pipeline dashboard at `/admin/outreach` with funnel metrics
- Email preview + edit before approval at `/admin/agents`

---

### US-046 — Commission Tracking [DONE]
**As an admin,**
I want to track commission owed by each partner center based on admitted referrals,
So that I can invoice partners and manage revenue.

**Status:** Implemented
- Tiered commission: 12% base, 10% with 3 blogs/month, 8% with 5 blogs/month
- Launch campaign: 0% for first 2 months with 3 blogs/month
- Admin commission overview at `/admin/commission`
- Monthly reports with payment status tracking

---

### US-047 — Partner Lead Tracking [DONE]
**As a partner,**
I want to see referrals sent to my center and update their admission status,
So that I can track outcomes and understand my commission obligations.

**Status:** Implemented
- Partner referrals page at `/partner/leads`
- Simple admitted/not_admitted status update
- Commission report at `/partner/commission` with monthly summary

---

### US-048 — Partner Commission Visibility [DONE]
**As a partner,**
I want to see my current commission rate and blog progress,
So that I know how publishing more articles reduces my costs.

**Status:** Implemented
- Commission & blog tier card on partner dashboard
- Shows current rate, blog count this month, tier progress, blogs needed for next tier

---

### US-049 — Agreement E-Signature [DONE]
**As an admin,**
I want partnership agreements to be sent via e-signature service,
So that centers can sign digitally and we have a legal record.

**Status:** Implemented
- PandaDoc integration with template tokens
- Admin approves agreement before sending
- Center signs first, admin counter-signs
- Pipeline auto-advances after signing

---

### US-050 — Auto-Onboarding [DONE]
**As an admin,**
I want centers that agree to partner to be automatically onboarded,
So that no manual account creation is needed.

**Status:** Implemented
- Response Handler detects positive replies
- Auto-creates Supabase auth user + partner profile
- Sends login credentials via email
- Pipeline advances to terms_agreed

---

### US-051 — Content Creator Agent [DONE]
**As an admin,**
I want an AI agent that automatically writes SEO blog articles about rehab and addiction,
So that I can build organic traffic without manual content creation.

**Status:** Implemented
- Claude AI writes 1500-2000 word articles from 70+ SEO topics
- Unsplash API for featured + 3-4 inline images
- Saves as draft for admin review at `/admin/content`
- Runs weekdays at 1 PM Bangkok time

---

### US-052 — Forgot Password [DONE]
**As a user,**
I want to reset my password from the login page,
So that I can recover access to my account.

**Status:** Implemented
- "Forgot password?" link on login page
- Sends Supabase password reset email
- Green confirmation message shown

---

## Summary

| Category | Total | Done |
|----------|-------|------|
| End Users | 14 | 14 |
| Admin | 12 | 12 |
| Partners | 10 | 10 |
| System | 16 | 16 |
| **Total** | **52** | **52** |

All 52 user stories are implemented.

---

# END OF USER STORIES
