const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://jfpxyaajmarlfhcngszh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcHh5YWFqbWFybGZoY25nc3poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg5NDkyNCwiZXhwIjoyMDg5NDcwOTI0fQ.v0b7BQ8gv5SCmU23UHrEIg4-kJ8cicmKEoi7yirQgqI"
);

const PRIVACY_POLICY = `## Introduction

Rehab-Atlas ("we," "us," or "our") operates the website www.rehab-atlas.com. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you visit our platform or use our services.

We understand that seeking rehabilitation services is deeply personal. Protecting your privacy is not merely a legal obligation — it is central to our mission.

**Effective Date:** March 2026
**Last Updated:** March 2026

---

## Information We Collect

### Information You Provide Directly

- **Inquiry Forms:** Name, email address, phone number (optional), description of treatment needs, urgency level, and preferred contact method.
- **Assessment Tool:** Responses to our treatment-matching questionnaire, including substance use history, treatment preferences, budget range, and location preferences. No diagnosis is made.
- **Account Registration:** Email address, password (hashed and salted — never stored in plain text), and display name.
- **Partner Applications:** Center name, contact person, business email, website URL, and a brief description of services.
- **Contact Forms:** Name, email, and message content.

### Information Collected Automatically

- **Analytics Data:** When you consent to cookies, we may collect page views, session duration, and referral source via Google Analytics 4 and Meta Pixel. These tools use anonymised identifiers — we do not track you across other websites.
- **Device Information:** Browser type, operating system, screen resolution, and language preference — used solely to optimise the user experience.
- **IP Address:** Used for approximate geolocation (country-level only) to suggest relevant rehabilitation centers. We do not store your precise location.

### Information We Do NOT Collect

- Medical records, diagnoses, or clinical data.
- Government-issued identification numbers.
- Financial information (payment card details, bank accounts).
- Biometric data.

---

## How We Use Your Information

| Purpose | Legal Basis |
|---------|-------------|
| Match you with rehabilitation centers | Legitimate interest / Consent |
| Forward your inquiry to selected centers (admin-reviewed) | Consent |
| Send email confirmations and status updates | Contract performance |
| Improve our platform and user experience | Legitimate interest |
| Prevent fraud and ensure security | Legitimate interest |
| Comply with legal obligations | Legal obligation |

**We never sell your personal data.** We do not share your information with third parties for their marketing purposes.

---

## How We Share Your Information

Your information is shared only when necessary and always under strict controls:

- **Rehabilitation Centers:** When you submit an inquiry, our admin team reviews it before forwarding relevant details (name, email, phone, and concern) to the selected center. Centers receive only the information needed to contact you.
- **Service Providers:** We use Supabase (database hosting), Vercel (website hosting), and Resend (transactional email). These providers process data on our behalf under contractual obligations.
- **Legal Requirements:** We may disclose information if required by law, regulation, or valid legal process.

---

## Data Security

We implement industry-standard security measures:

- **Encryption in Transit:** All data transmitted between your browser and our servers is encrypted using TLS 1.3 (HTTPS).
- **Encryption at Rest:** Database records are encrypted using AES-256.
- **Access Control:** Administrative access requires multi-factor authentication. Service role credentials are stored as environment variables — never in source code.
- **Input Validation:** All user inputs are validated and sanitised to prevent injection attacks.
- **Rate Limiting:** API endpoints are rate-limited to prevent abuse.
- **Regular Audits:** We conduct periodic security reviews of our codebase and infrastructure.

---

## Data Retention

- **Inquiries and Leads:** Retained for 24 months, then anonymised or deleted.
- **Assessment Responses:** Retained for 12 months. Session data is cleared after 30 days.
- **Account Data:** Retained until you request deletion.
- **Analytics Data:** Anonymised and aggregated after 14 months (Google Analytics default).
- **Server Logs:** Retained for 30 days for security and debugging purposes.

You may request deletion of your data at any time by contacting us at info@rehab-atlas.com.

---

## Your Rights

Depending on your jurisdiction, you may have the right to:

- **Access** the personal data we hold about you.
- **Correct** inaccurate or incomplete data.
- **Delete** your personal data ("right to be forgotten").
- **Restrict** or **object to** certain processing activities.
- **Data Portability** — receive your data in a structured, machine-readable format.
- **Withdraw Consent** at any time, without affecting the lawfulness of prior processing.

To exercise any of these rights, email us at **info@rehab-atlas.com**. We will respond within 30 days.

---

## Cookies

We use cookies only when you provide explicit consent via our cookie banner:

- **Essential Cookies:** Authentication session management. These are necessary for the platform to function.
- **Analytics Cookies:** Google Analytics 4 and Meta Pixel — activated only after consent.
- **No Third-Party Advertising Cookies.**

You can withdraw cookie consent at any time by clearing your browser cookies.

---

## International Data Transfers

Our servers are located in the United States (Vercel) and Singapore (Supabase). If you access our platform from outside these regions, your data may be transferred internationally. We ensure adequate safeguards are in place through standard contractual clauses and provider certifications.

---

## Children's Privacy

Our services are not directed to individuals under 18 years of age. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal data, please contact us immediately at info@rehab-atlas.com.

---

## Changes to This Policy

We may update this Privacy Policy from time to time. Material changes will be communicated via a notice on our website. Your continued use of the platform after changes are posted constitutes acceptance of the revised policy.

---

## Contact Us

If you have questions or concerns about this Privacy Policy or our data practices:

**Email:** info@rehab-atlas.com
**Website:** www.rehab-atlas.com/contact

---

*Rehab-Atlas is committed to transparency. If anything in this policy is unclear, please do not hesitate to reach out.*`;

const TERMS_OF_SERVICE = `## Acceptance of Terms

By accessing or using the Rehab-Atlas website (www.rehab-atlas.com), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, please do not use our platform.

**Effective Date:** March 2026
**Last Updated:** March 2026

---

## About Rehab-Atlas

Rehab-Atlas is an online platform that connects individuals seeking rehabilitation and mental health treatment with verified rehabilitation centers worldwide. We provide:

- A curated directory of rehabilitation centers.
- An AI-assisted treatment matching assessment.
- A confidential inquiry system for contacting centers.
- Educational articles on addiction, recovery, and mental health.

**Rehab-Atlas is not a healthcare provider.** We do not provide medical advice, diagnoses, or treatment. We are an information and referral service.

---

## Eligibility

You must be at least 18 years of age to use our platform. By using Rehab-Atlas, you represent that you meet this requirement.

---

## User Accounts

### Registration

You may create an account to access features such as saved centers, inquiry history, and assessment results. You are responsible for:

- Providing accurate registration information.
- Maintaining the confidentiality of your login credentials.
- All activity that occurs under your account.

### Account Termination

We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent, abusive, or harmful activity.

---

## Use of the Platform

### Permitted Use

You may use Rehab-Atlas for its intended purposes: researching rehabilitation options, completing assessments, submitting inquiries, and reading educational content.

### Prohibited Conduct

You agree not to:

- Provide false or misleading information in inquiries or assessments.
- Use the platform for any unlawful purpose.
- Attempt to gain unauthorised access to our systems or data.
- Scrape, crawl, or extract data from the platform without written permission.
- Submit spam, unsolicited promotions, or irrelevant content.
- Interfere with the platform's functionality or other users' experience.
- Impersonate another person or entity.

---

## Inquiries and Referrals

### How It Works

1. You submit an inquiry through our platform.
2. Our administrative team reviews the inquiry for legitimacy and completeness.
3. If approved, we forward your inquiry to the selected rehabilitation center(s).
4. The center contacts you directly to discuss their services.

### Important Disclaimers

- **We do not guarantee admission** to any rehabilitation center.
- **We do not guarantee treatment outcomes.** Recovery is a personal journey that depends on many factors.
- **We do not endorse any specific center.** Our directory listings, editorial ratings, and AI matching are informational — not medical recommendations.
- **Your relationship with any center is between you and that center.** Rehab-Atlas is not a party to any agreement, contract, or treatment plan between you and a rehabilitation provider.

---

## AI-Assisted Matching

Our assessment tool uses algorithmic matching (with optional AI-generated explanations) to suggest rehabilitation centers based on your responses. These suggestions are:

- **Informational only** — not medical advice.
- **Based on self-reported data** — accuracy depends on the information you provide.
- **Not a substitute for professional evaluation** by a licensed clinician.

Always consult a qualified healthcare professional before making treatment decisions.

---

## Content and Intellectual Property

### Our Content

All content on Rehab-Atlas — including text, images, logos, design elements, and software — is the property of Rehab-Atlas or its licensors and is protected by copyright and intellectual property laws.

You may not reproduce, distribute, or create derivative works from our content without written permission.

### User-Submitted Content

If you submit content (e.g., partner blog articles), you grant Rehab-Atlas a non-exclusive, royalty-free, worldwide licence to publish, display, and distribute that content on our platform. You retain ownership of your original content.

---

## Partner Centers

Rehabilitation centers listed on Rehab-Atlas have been reviewed against our editorial standards. However:

- Listings do not constitute endorsement or certification.
- We are not responsible for the accuracy of information provided by centers.
- Centers are responsible for their own regulatory compliance, licensing, and clinical standards.

---

## Limitation of Liability

To the fullest extent permitted by applicable law:

- Rehab-Atlas is provided "as is" and "as available" without warranties of any kind.
- We are not liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the platform.
- We are not liable for any actions, omissions, or conduct of third-party rehabilitation centers.
- Our total liability to you shall not exceed the amount you paid to Rehab-Atlas in the 12 months preceding the claim (if any).

---

## Indemnification

You agree to indemnify and hold harmless Rehab-Atlas, its officers, directors, employees, and agents from any claims, damages, or expenses arising from:

- Your use of the platform.
- Your violation of these Terms.
- Your violation of any third-party rights.

---

## Governing Law

These Terms are governed by the laws of the Kingdom of Thailand, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved in the courts of Bangkok, Thailand.

---

## Changes to These Terms

We may update these Terms from time to time. Material changes will be communicated via a notice on our website. Your continued use of the platform after changes are posted constitutes acceptance of the revised Terms.

---

## Severability

If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.

---

## Contact

For questions about these Terms of Service:

**Email:** info@rehab-atlas.com
**Website:** www.rehab-atlas.com/contact`;

const MEDICAL_DISCLAIMER = `## Important Notice

**Rehab-Atlas is not a healthcare provider.** The information on this platform — including our directory listings, assessment tool, matching algorithm, editorial ratings, and educational articles — is provided for **informational purposes only** and does not constitute medical advice, diagnosis, or treatment.

**Effective Date:** March 2026

---

## Not Medical Advice

Nothing on this website should be interpreted as:

- A medical diagnosis or clinical assessment.
- A recommendation for a specific treatment, medication, or therapeutic approach.
- A substitute for professional medical evaluation by a licensed physician, psychiatrist, psychologist, or certified addiction counselor.
- An endorsement of any specific rehabilitation center, program, or practitioner.

**Always seek the advice of a qualified healthcare professional** with any questions you may have regarding a medical condition, mental health concern, or substance use disorder.

---

## Assessment Tool Limitations

Our AI-assisted treatment matching assessment is:

- **A screening tool, not a diagnostic instrument.** It does not diagnose any medical or psychological condition.
- **Based on self-reported information.** Results are only as accurate as the information you provide.
- **Algorithmic, not clinical.** Matching scores reflect data compatibility — they do not represent clinical suitability.
- **Not a substitute for a professional intake assessment** conducted by a licensed clinician.

Assessment results should be discussed with a healthcare professional before making treatment decisions.

---

## Editorial Ratings

Our editorial ratings are based on publicly available information, center-provided data, and editorial review. They reflect our editorial team's assessment of certain observable quality indicators and **do not represent**:

- Clinical accreditation or regulatory compliance status.
- Treatment efficacy or patient outcomes.
- A guarantee of the quality of care you will receive.

---

## Center Listings

Rehabilitation centers listed on Rehab-Atlas have been reviewed against our editorial standards. However:

- **We cannot independently verify all claims** made by listed centers.
- **Licensing, accreditation, and regulatory compliance** are the responsibility of each individual center.
- **Staff qualifications and credentials** should be independently verified before committing to treatment.
- **Treatment availability and pricing** may change without notice. Always confirm details directly with the center.

---

## Emergency Situations

**If you or someone you know is experiencing a medical emergency, call 911 (US), 1669 (Thailand), or your local emergency services immediately.**

Rehab-Atlas is not equipped to handle medical emergencies, crisis situations, or imminent safety concerns. For crisis support:

- **SAMHSA Helpline (US):** 1-800-662-4357 (free, confidential, 24/7)
- **Crisis Text Line:** Text HOME to 741741
- **Suicide Prevention Lifeline:** 988
- **International Association for Suicide Prevention:** https://www.iasp.info/resources/Crisis_Centres/

---

## No Guarantees

Rehab-Atlas does not guarantee:

- Admission to any rehabilitation center.
- The success or outcome of any treatment program.
- The accuracy, completeness, or timeliness of any information on this platform.
- That our services will meet your specific needs or expectations.

Recovery is a deeply personal process. Treatment outcomes depend on many factors, including individual circumstances, commitment, clinical appropriateness, and the quality of the therapeutic relationship.

---

## Third-Party Content

Our platform may contain links to third-party websites, resources, or services. We do not control and are not responsible for the content, privacy policies, or practices of these external sites.

Educational articles submitted by partner centers reflect the views of their respective authors and do not necessarily represent the views of Rehab-Atlas.

---

## Limitation of Liability

To the fullest extent permitted by applicable law, Rehab-Atlas, its officers, directors, employees, and agents shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from:

- Your reliance on any information provided on this platform.
- Your interactions with any rehabilitation center listed on this platform.
- Any decision you make based on information obtained through our services.

---

## Acknowledgement

By using Rehab-Atlas, you acknowledge that:

1. You have read and understood this Medical Disclaimer.
2. You understand that Rehab-Atlas is an information and referral platform, not a healthcare provider.
3. You will consult qualified healthcare professionals before making treatment decisions.
4. You assume responsibility for any decisions made based on information obtained through our platform.

---

## Contact

If you have questions about this disclaimer:

**Email:** info@rehab-atlas.com
**Website:** www.rehab-atlas.com/contact`;

const HIPAA_COMPLIANCE = `## Our Commitment to Privacy

Rehab-Atlas takes the protection of health-related information seriously. While Rehab-Atlas is an **information and referral platform** — not a covered entity under HIPAA (the Health Insurance Portability and Accountability Act) — we voluntarily align our data handling practices with HIPAA principles to provide the highest standard of privacy protection for our users.

**Effective Date:** March 2026

---

## HIPAA and Rehab-Atlas

### What Is HIPAA?

HIPAA is a United States federal law that establishes national standards for the protection of individually identifiable health information (Protected Health Information, or PHI). It applies primarily to healthcare providers, health plans, and healthcare clearinghouses ("covered entities") and their business associates.

### Our Status

Rehab-Atlas is **not a covered entity** under HIPAA because:

- We do not provide medical treatment or clinical services.
- We do not process health insurance claims.
- We do not have access to your medical records.

However, because our users share sensitive information about substance use, mental health, and treatment needs, we treat all such information with the same level of care and protection that HIPAA demands.

---

## How We Align with HIPAA Principles

### Privacy Safeguards

| HIPAA Principle | How Rehab-Atlas Aligns |
|-----------------|----------------------|
| **Minimum Necessary Standard** | We collect only the information needed to match you with appropriate centers. We share only what is necessary for referral purposes. |
| **Individual Rights** | You can access, correct, or delete your personal data at any time by contacting us. |
| **Notice of Privacy Practices** | This page and our Privacy Policy clearly explain how we handle your information. |
| **Consent** | We forward your inquiry to rehabilitation centers only after administrative review. You choose which centers to contact. |

### Technical Safeguards

| Measure | Implementation |
|---------|---------------|
| **Encryption in Transit** | TLS 1.3 (HTTPS) on all connections |
| **Encryption at Rest** | AES-256 encryption on database records |
| **Access Controls** | Role-based access (user, partner, admin) with session-based authentication |
| **Audit Logging** | Administrative actions are logged with timestamps |
| **Secure Authentication** | Passwords are hashed using bcrypt. Admin access requires elevated credentials. |
| **Rate Limiting** | API endpoints are rate-limited to prevent abuse |
| **Input Validation** | All user inputs are validated and sanitised |

### Administrative Safeguards

- **Staff Training:** Our team is trained on privacy best practices and the importance of confidentiality.
- **Access Limitation:** Only authorised administrators can view inquiry details. Partner centers see only the information necessary for their response.
- **Incident Response:** We have procedures in place to identify, contain, and remediate any data breach or security incident.
- **Vendor Due Diligence:** Our infrastructure providers (Supabase, Vercel, Resend) maintain SOC 2 compliance and enterprise-grade security.

### Physical Safeguards

- Our platform is hosted on cloud infrastructure (Vercel and Supabase) that maintains physical security certifications including SOC 2 Type II.
- We do not maintain physical servers or store data on local devices.

---

## What Information We Handle

When you use Rehab-Atlas, you may share:

- **Self-reported treatment preferences** (not medical records)
- **Contact information** (name, email, phone)
- **Assessment responses** (substance type, severity self-assessment, budget, location)

We do **not** collect, store, or process:

- Medical records or clinical documentation
- Insurance claims or billing information
- Prescription or medication details
- Diagnosis codes (ICD-10, DSM-5, etc.)
- Biometric or genetic data

---

## Data Handling Commitments

1. **Confidential by Default:** All inquiries and assessment data are treated as confidential. They are not publicly visible and are accessible only to authorised administrators.

2. **No Data Sales:** We never sell personal information to third parties.

3. **Purpose Limitation:** Your data is used solely for the purpose of connecting you with appropriate rehabilitation services and improving our platform.

4. **Retention Limits:** Inquiry data is retained for a maximum of 24 months. Assessment data is retained for 12 months. You may request earlier deletion at any time.

5. **Breach Notification:** In the unlikely event of a data breach affecting your information, we will notify you within 72 hours and take immediate steps to contain and remediate the incident.

---

## For Rehabilitation Centers (Partners)

If you are a rehabilitation center listed on Rehab-Atlas:

- You are responsible for your own HIPAA compliance as a covered entity (if applicable).
- Information we forward to you (lead referrals) should be handled in accordance with your own privacy policies and HIPAA obligations.
- You agree not to use referral information for purposes other than responding to the specific inquiry.

---

## Continuous Improvement

We regularly review and update our privacy and security practices. Our goal is to exceed — not merely meet — the expectations of individuals who trust us with sensitive information.

---

## Questions

If you have questions about our privacy practices or HIPAA alignment:

**Email:** info@rehab-atlas.com
**Website:** www.rehab-atlas.com/contact

---

*Rehab-Atlas is committed to earning and maintaining your trust. Privacy is not a feature — it is a foundational principle of everything we build.*`;

const pages = [
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    page_type: "legal",
    status: "published",
    published_at: new Date().toISOString(),
    meta_title: "Privacy Policy | Rehab-Atlas",
    meta_description: "How Rehab-Atlas collects, uses, and protects your personal information. Your privacy is our highest priority.",
    content: PRIVACY_POLICY,
  },
  {
    slug: "terms-of-use",
    title: "Terms of Service",
    page_type: "legal",
    status: "published",
    published_at: new Date().toISOString(),
    meta_title: "Terms of Service | Rehab-Atlas",
    meta_description: "Terms and conditions governing the use of the Rehab-Atlas platform.",
    content: TERMS_OF_SERVICE,
  },
  {
    slug: "disclaimer",
    title: "Medical Disclaimer",
    page_type: "legal",
    status: "published",
    published_at: new Date().toISOString(),
    meta_title: "Medical Disclaimer | Rehab-Atlas",
    meta_description: "Important medical disclaimer for Rehab-Atlas. We are an information platform, not a healthcare provider.",
    content: MEDICAL_DISCLAIMER,
  },
  {
    slug: "hipaa",
    title: "HIPAA Compliance",
    page_type: "legal",
    status: "published",
    published_at: new Date().toISOString(),
    meta_title: "HIPAA Compliance | Rehab-Atlas",
    meta_description: "How Rehab-Atlas aligns with HIPAA principles to protect your health-related information.",
    content: HIPAA_COMPLIANCE,
  },
];

async function seed() {
  for (const page of pages) {
    const { error } = await supabase.from("pages").upsert(page, { onConflict: "slug" });
    if (error) console.log("Error on", page.slug, ":", error.message);
    else console.log("Created:", page.title);
  }
  console.log("\nDone! All 4 legal pages created.");
  console.log("View them at:");
  console.log("  /pages/privacy-policy");
  console.log("  /pages/terms-of-use");
  console.log("  /pages/disclaimer");
  console.log("  /pages/hipaa");
}

seed();
