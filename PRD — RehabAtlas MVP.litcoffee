# PRD — RehabAtlas MVP
## Product Requirements Document
**Version:** 1.1 (Revised – Controlled Lead Routing)
**Product Name:** RehabAtlas  
**Tagline:** The Global Rehab Center Database  
**Positioning:** Trusted treatment matching platform  

---

# 1. Executive Summary

RehabAtlas is a standalone global web platform for discovering, comparing, and inquiring about rehab centers.

The platform combines:
- global rehab directory
- AI-assisted matching (assessment)
- centralized lead intake and controlled referral system

RehabAtlas operates as an **information and referral marketplace**, not a medical provider and not a booking/payment system.

**Key difference from traditional platforms:**
All user inquiries are captured and controlled by RehabAtlas.  
No inquiry is sent directly to rehab centers without admin mediation.

---

# 2. Product Goals

## Primary Goals
1. Build global rehab marketplace
2. Generate referral-based revenue
3. Own demand funnel and lead flow

## Year-1 Success Metrics
- organic traffic
- completed assessments
- qualified leads

## MVP Objective
Deliver a premium, trustworthy platform where users can:
- browse rehab centers
- complete AI assessment
- receive matches
- submit inquiries to RehabAtlas
- be routed to appropriate centers via admin-controlled process

---

# 3. Product Principles

1. Independent marketplace (no visible tie to any center)
2. Information/referral only (no medical advice)
3. Calm + premium + trustworthy UX
4. Browse-first + AI-enhanced
5. Controlled lead ownership (CRITICAL)

---

# 4. Target Users

## Primary
- parents / family
- spouse / partner

## Secondary
- self-seeking users
- HR / employers
- therapists / referrers
- concierge / case managers

## Scope
- Global
- English only (MVP)

---

# 5. In-Scope MVP Features

- rehab directory
- search & filtering
- AI assessment + matching
- center profile pages
- inquiry submission (to platform only)
- admin dashboard
- CMS
- editorial ratings
- partner portal (basic)
- analytics
- legal pages

---

# 6. Out of Scope

- booking/payment
- telemedicine
- patient portal
- insurance workflow
- multilingual
- mobile app
- public user reviews
- adolescent flow
- revenue tracking (full)

---

# 7. User Experience Overview

## Homepage CTA
Primary: Browse rehab centers  
Secondary: Start assessment

## Assessment UX
- multi-step wizard
- 1–3 minutes

---

# 8. Core User Journeys

## A — Browse & Inquiry
1. browse centers
2. open profile
3. submit inquiry to RehabAtlas
4. admin reviews
5. admin forwards to eligible center

## B — AI Matching
1. complete assessment
2. get 3 matches + alternatives
3. view profile
4. submit inquiry
5. admin routing

## C — Partner Edit
1. login
2. edit profile
3. admin approval
4. publish

---

# 9. Functional Requirements

---

## 9.1 Homepage

- hero section
- browse CTA
- assessment CTA
- featured centers
- how-it-works
- trust messaging
- footer + legal

---

## 9.2 Listing / Search

### Filters
- country
- city
- treatment focus
- inpatient/outpatient
- detox
- budget
- language
- insurance

### Sorting
- relevance
- featured
- price
- rating
- most reviewed

### Card Info
- name
- location
- image
- short description
- pricing
- badges
- CTA

### Transparency
Sponsored/Preferred must be clearly labeled

---

## 9.3 Center Profile Page

### Sections
- overview
- photos
- treatment focus
- conditions
- therapies
- pricing
- program length
- accommodation
- staff
- accreditation
- editorial rating
- FAQs
- map
- inquiry form
- request assessment CTA

### Personalization
If assessment completed:
→ show "Why this center may fit you"

### Conversion Rule
User must submit inquiry to RehabAtlas (NOT direct to center)

---

## 9.4 AI Assessment

### Duration
1–3 minutes

### Questions
- who needs help
- age range
- primary issue (addiction + mental health)
- severity
- co-occurring issues
- prior treatment
- detox need
- budget
- location
- privacy
- insurance
- urgency

### Urgency Levels
- need help soon
- urgent / immediate

### High Risk Handling
- show warning
- advise immediate help
- allow browsing

### Output
- 3 best matches
- alternatives
- explanation
- next steps

### Logic
- rule-based matching
- LLM explanation layer

---

## 9.5 AI Chat

Allowed:
- explain options
- narrow choices
- guide to inquiry

Not allowed:
- diagnosis
- medical advice

---

## 9.6 Lead Flow (CRITICAL SYSTEM)

### Submission
User submits inquiry → goes ONLY to RehabAtlas

### No Direct Forwarding
System must NOT send leads automatically to centers

### Admin Workflow
Admin must:
- review inquiry
- check partner eligibility
- decide routing
- forward manually

### Lead Status
- New
- Under Review
- Awaiting Info
- Ready to Forward
- Forwarded
- Closed

---

## 9.7 Lead Form

Fields:
- name
- email
- phone / WhatsApp
- country
- who for
- age
- concern
- urgency
- preferred center
- budget
- message
- consent
- request call

### Success Page
- confirmation
- WhatsApp CTA
- message: "our team will review and connect you"

---

## 9.8 Reviews (MVP)

- editorial ratings only
- categories:
  - overall
  - staff
  - facility
  - program quality
  - privacy
  - value

---

## 9.9 Badges

- Verified Profile
- Trusted Partner

### Definitions
- Verified = verified identity
- Trusted Partner = signed agreement

---

## 9.10 CMS

Must manage:
- rehab profiles
- static pages
- blog
- FAQs
- legal pages
- badges
- editorial ratings

---

## 9.11 Admin Dashboard

Capabilities:
- manage centers
- manage questionnaire
- manage matching logic
- view leads
- assign leads
- update status
- manage content
- manage badges

### Metrics
- traffic
- assessments
- top matches
- lead volume
- leads by partner

---

## 9.12 Partner Portal

Can edit:
- basic info
- photos
- pricing
- contact
- inquiry email

Cannot edit:
- ratings
- badges

All changes require approval

---

# 10. Data Model

### Minimum fields
- name
- location
- contact
- description
- treatment focus

### Full model
- pricing
- program length
- detox
- therapies
- staff
- accreditation
- languages
- insurance
- badges
- inquiry email

### Commercial Fields
- verified_profile
- trusted_partner
- referral_eligible
- agreement_status

---

# 11. Legal & Compliance

### Platform Type
Information/referral only

### Required Pages
- Privacy Policy
- Terms of Use
- Disclaimer
- Contact

### Disclaimers
- not medical advice
- informational only

### Privacy
- PDPA compliant

### Do NOT collect
- medical history
- diagnosis details
- medication
- ID/passport
- insurance docs
- payment data

---

# 12. Non-Functional Requirements

### Performance
- fast load
- SEO optimized
- mobile responsive

### Security
- auth + roles
- secure data handling

### Scalability
- support global expansion
- support hybrid monetization

---

# 13. Tech Stack

- Next.js
- Node.js
- Supabase
- Vercel

---

# 14. Integrations

- WhatsApp
- Google Analytics
- Meta Pixel
- email automation
- Stripe (future-ready)

---

# 15. Monetization

### MVP
- commission per admission

### Future
- hybrid model (subscription + CPC + CPL)

---

# 16. SEO Strategy

### MVP
- center profile pages

### Phase 2
- country pages
- condition pages
- guides

---

# 17. UX Guidelines

Tone:
- calm
- premium
- trustworthy

Avoid:
- medical claims
- guarantees

Use:
- "may fit"
- "based on your responses"

---

# 18. Launch Plan

Timeline: 6 weeks  
Approach: MVP-first, scale-ready  

---

# 19. Acceptance Criteria

1. users can browse centers
2. users can complete assessment
3. system returns matches
4. users submit inquiry to platform only
5. admin controls referral
6. partner portal works
7. CMS works
8. legal pages exist
9. analytics tracked

---

# 20. Build Order

### Phase A
- architecture
- DB schema
- auth

### Phase B
- homepage
- listing
- profiles

### Phase C
- assessment + matching

### Phase D
- inquiry + email

### Phase E
- admin + partner portal

---

# 21. Future Roadmap

- user reviews
- admission tracking
- payment system
- multilingual
- mobile app
- CRM automation

---

# END OF PRD