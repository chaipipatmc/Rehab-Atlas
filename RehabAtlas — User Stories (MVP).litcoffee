# RehabAtlas — User Stories (MVP)

## 1. User Stories — End Users (Visitors)

### US-001 — Browse Rehab Centers
**As a user,**  
I want to browse rehab centers worldwide,  
So that I can explore available treatment options without needing prior knowledge.

**Acceptance Criteria**
- user can access listing page
- user sees list of rehab centers
- each center shows basic info (name, location, summary, image)
- user can click into profile page

---

### US-002 — Filter and Search
**As a user,**  
I want to filter rehab centers by relevant criteria,  
So that I can narrow down options that match my needs.

**Acceptance Criteria**
- filters available:
  - country
  - city
  - treatment focus
  - inpatient/outpatient
  - detox
  - budget
  - language
  - insurance
- filters update results dynamically
- filters can be combined

---

### US-003 — Sort Results
**As a user,**  
I want to sort rehab centers,  
So that I can prioritize results based on my preference.

**Acceptance Criteria**
- sort options:
  - relevance
  - featured
  - price
  - rating
  - most reviewed
- sorting updates instantly

---

### US-004 — View Rehab Profile
**As a user,**  
I want to view a detailed rehab center profile,  
So that I can understand if it is suitable for my situation.

**Acceptance Criteria**
- profile includes:
  - overview
  - photos
  - treatment focus
  - therapies
  - pricing
  - program length
  - accommodation
  - staff
  - accreditation
  - FAQs
- CTA visible: inquiry / request call

---

### US-005 — Start AI Assessment
**As a user,**  
I want to complete a short assessment,  
So that I can get recommended rehab centers based on my situation.

**Acceptance Criteria**
- multi-step wizard
- 1–3 minutes completion time
- all required questions present
- progress indicator shown

---

### US-006 — Receive AI Matches
**As a user,**  
I want to receive recommended rehab centers,  
So that I can quickly identify suitable options.

**Acceptance Criteria**
- show 3 best matches + alternatives
- show match explanation
- show CTA to view profile
- show next steps

---

### US-007 — See Personalized Fit
**As a user,**  
I want to see why a rehab center matches my needs,  
So that I feel confident in the recommendation.

**Acceptance Criteria**
- "Why this center may fit you" section appears
- explanation is readable and non-medical
- tied to user inputs

---

### US-008 — Submit Inquiry
**As a user,**  
I want to submit an inquiry,  
So that RehabAtlas can help connect me with a suitable center.

**Acceptance Criteria**
- form includes all required fields
- form validates inputs
- submission success page shown
- NO direct contact with center

---

### US-009 — Understand Next Steps
**As a user,**  
I want to understand what happens after submission,  
So that I feel reassured and know what to expect.

**Acceptance Criteria**
- success page explains process
- shows WhatsApp CTA
- messaging clearly says RehabAtlas will review and connect

---

### US-010 — Handle Urgent Cases
**As a user,**  
I want to see guidance when my situation is urgent,  
So that I know I should seek immediate help.

**Acceptance Criteria**
- warning shown for high-risk responses
- message advises local professional help
- no medical diagnosis given
- user can still continue browsing

---

## 2. User Stories — Admin / Concierge Team

### US-011 — View Incoming Leads
**As an admin,**  
I want to see all incoming inquiries,  
So that I can manage and route leads properly.

**Acceptance Criteria**
- list of all leads
- sortable by date/status
- view full lead details

---

### US-012 — Review Lead Details
**As an admin,**  
I want to review lead information and preferences,  
So that I can decide the best referral action.

**Acceptance Criteria**
- see:
  - user info
  - preferred center
  - assessment data (if exists)
  - urgency
- easy-to-read format

---

### US-013 — Control Referral Routing
**As an admin,**  
I want to control which rehab center receives the lead,  
So that I ensure only eligible partners get referrals.

**Acceptance Criteria**
- NO auto-forwarding
- admin manually selects center(s)
- admin confirms before sending
- system logs action

---

### US-014 — Check Partner Eligibility
**As an admin,**  
I want to verify if a rehab center is eligible,  
So that I only send leads to centers with agreements.

**Acceptance Criteria**
- visible fields:
  - trusted partner
  - referral eligible
- clear status indicator

---

### US-015 — Update Lead Status
**As an admin,**  
I want to update lead status,  
So that I can track progress.

**Acceptance Criteria**
- statuses:
  - New
  - Under Review
  - Awaiting Info
  - Ready to Forward
  - Forwarded
  - Closed

---

### US-016 — Forward Lead
**As an admin,**  
I want to forward a lead to a rehab center,  
So that the center can contact the user.

**Acceptance Criteria**
- send email manually or via system
- record:
  - center
  - timestamp
  - admin name
- mark as forwarded

---

### US-017 — Manage Centers
**As an admin,**  
I want to add and edit rehab centers,  
So that the platform stays updated.

**Acceptance Criteria**
- create/edit center profile
- save drafts
- publish/unpublish

---

### US-018 — Approve Partner Edits
**As an admin,**  
I want to approve or reject partner updates,  
So that data quality is controlled.

**Acceptance Criteria**
- see pending changes
- approve/reject
- audit trail

---

### US-019 — Manage Content
**As an admin,**  
I want to manage content pages,  
So that I can update the platform easily.

**Acceptance Criteria**
- edit pages
- publish content
- manage FAQs/legal

---

### US-020 — View Analytics
**As an admin,**  
I want to view performance metrics,  
So that I can monitor growth.

**Acceptance Criteria**
- traffic
- assessments
- leads
- leads by partner
- time filters

---

## 3. User Stories — Rehab Partners

### US-021 — Login to Portal
**As a rehab partner,**  
I want to log into the system,  
So that I can manage my center profile.

---

### US-022 — Edit Profile
**As a rehab partner,**  
I want to edit my center information,  
So that it stays accurate.

**Allowed fields**
- basic info
- photos
- pricing
- contact info

---

### US-023 — Submit Changes for Approval
**As a rehab partner,**  
I want to submit updates for review,  
So that they can be published.

**Acceptance Criteria**
- changes go to pending
- admin approval required

---

### US-024 — Cannot Modify Restricted Data
**As a rehab partner,**  
I should not be able to modify ratings or badges,  
So that platform integrity is preserved.

---

## 4. System-Level User Stories

### US-025 — Controlled Lead Intake
**As the system,**  
I must capture all inquiries internally,  
So that no leads bypass RehabAtlas.

---

### US-026 — No Direct Lead Forwarding
**As the system,**  
I must not automatically send inquiries to rehab centers,  
So that admin retains control.

---

### US-027 — Referral Logging
**As the system,**  
I must log all forwarded leads,  
So that tracking and accountability are maintained.

---

### US-028 — Matching Engine Execution
**As the system,**  
I must calculate match scores based on user input,  
So that recommendations are consistent.

---

### US-029 — LLM Explanation Layer
**As the system,**  
I must generate human-readable explanations,  
So that users understand recommendations.