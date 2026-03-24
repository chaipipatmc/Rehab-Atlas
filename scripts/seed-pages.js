const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jfpxyaajmarlfhcngszh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcHh5YWFqbWFybGZoY25nc3poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg5NDkyNCwiZXhwIjoyMDg5NDcwOTI0fQ.v0b7BQ8gv5SCmU23UHrEIg4-kJ8cicmKEoi7yirQgqI'
);

const pages = [
  {
    title: "Privacy Policy",
    slug: "privacy-policy",
    page_type: "legal",
    status: "published",
    meta_title: "Privacy Policy | Rehab-Atlas",
    meta_description: "How Rehab-Atlas collects, uses, and protects your personal information. Our commitment to your privacy and data security.",
    published_at: new Date().toISOString(),
    content: `# Privacy Policy

*Last updated: March 2026*

Rehab-Atlas ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.

## Information We Collect

### Information You Provide
- **Account information:** Name, email address, and password when you create an account
- **Inquiry information:** Contact details, health concerns, preferences, and any information you provide in inquiry forms
- **Assessment responses:** Answers to our treatment matching assessment
- **Communications:** Messages you send to our team

### Information Collected Automatically
- **Usage data:** Pages visited, features used, and interactions with our platform
- **Device information:** Browser type, operating system, and device identifiers
- **Location data:** General geographic location based on IP address

## How We Use Your Information

We use your information to:
- **Match you with treatment centers** based on your needs and preferences
- **Process and respond to inquiries** you submit through our platform
- **Communicate with you** about your inquiry status and relevant resources
- **Improve our services** through analytics and feedback
- **Ensure security** of our platform and protect against fraud

## Information Sharing

We share your information only in the following circumstances:

### With Treatment Centers
- **Only with your consent:** We will never share your inquiry details with a treatment center without your explicit approval
- **Controlled disclosure:** When forwarding your inquiry, we share only the information necessary for the center to assess fit

### Service Providers
We use trusted third-party services for:
- Email delivery (Resend)
- Database hosting (Supabase)
- Website hosting (Vercel)
- Analytics

### Legal Requirements
We may disclose information when required by law, court order, or to protect the rights, property, or safety of Rehab-Atlas, our users, or the public.

## Data Security

We implement industry-standard security measures:
- **Encryption:** All data is encrypted in transit (TLS/SSL) and at rest
- **Access controls:** Strict role-based access to personal data
- **Regular audits:** Periodic security assessments and vulnerability testing
- **Minimal retention:** We retain data only as long as necessary for the stated purposes

## Your Rights

You have the right to:
- **Access** the personal data we hold about you
- **Correct** inaccurate personal data
- **Delete** your account and associated data
- **Withdraw consent** for data processing at any time
- **Export** your data in a portable format

To exercise these rights, contact us at privacy@rehabatlas.com.

## Cookies

We use essential cookies to maintain your session and preferences. We do not use tracking cookies for advertising purposes.

## Children's Privacy

Rehab-Atlas is not intended for individuals under 18 years of age. We do not knowingly collect personal information from minors.

## Changes to This Policy

We may update this Privacy Policy periodically. We will notify you of material changes by posting the updated policy on this page.

## Contact Us

For questions about this Privacy Policy:
- **Email:** privacy@rehabatlas.com
- **Contact form:** [Contact Us](/pages/contact)

---

*Rehab-Atlas — A Digital Sanctuary for Recovery*`
  },
  {
    title: "Terms of Service",
    slug: "terms-of-use",
    page_type: "legal",
    status: "published",
    meta_title: "Terms of Service | Rehab-Atlas",
    meta_description: "Terms and conditions governing the use of Rehab-Atlas platform. Please review these terms before using our services.",
    published_at: new Date().toISOString(),
    content: `# Terms of Service

*Last updated: March 2026*

Welcome to Rehab-Atlas. By accessing or using our platform, you agree to be bound by these Terms of Service.

## 1. Platform Description

Rehab-Atlas is an information and referral platform that helps individuals find rehabilitation and treatment centers. We provide:
- A curated directory of treatment centers
- An AI-assisted matching assessment
- Inquiry facilitation between users and centers
- Educational content about addiction and recovery

**Rehab-Atlas is NOT a healthcare provider.** We do not provide medical advice, diagnosis, or treatment.

## 2. User Accounts

### Account Creation
- You must provide accurate, complete information when creating an account
- You are responsible for maintaining the security of your account credentials
- You must be at least 18 years old to create an account

### Account Types
- **Individual users:** Can browse centers, take assessments, and submit inquiries
- **Center partners:** Can manage their center listing (subject to verification)
- **Administrators:** Rehab-Atlas staff with full platform access

## 3. Acceptable Use

You agree not to:
- Provide false or misleading information
- Use the platform for any illegal purpose
- Attempt to access accounts or data belonging to others
- Interfere with the operation of the platform
- Scrape, copy, or redistribute platform content without permission
- Impersonate any person or organization

## 4. Treatment Center Listings

### Accuracy
We strive to maintain accurate information about treatment centers. However:
- Center information may change without notice
- We rely on centers and public sources for listing data
- We do not guarantee the accuracy of any center's claims

### Reviews and Ratings
Our editorial ratings are based on our internal evaluation methodology and represent our professional assessment. They are not endorsements or guarantees of outcomes.

## 5. Inquiry Process

### How Inquiries Work
- You submit an inquiry through our platform
- Our team reviews your needs and matches you with suitable centers
- With your consent, we introduce you to recommended centers
- We never share your information with centers without your explicit approval

### No Guarantee
We do not guarantee:
- That any center will accept you as a patient
- Specific treatment outcomes
- The availability, pricing, or insurance coverage at any center

## 6. Content and Intellectual Property

### Our Content
All content on Rehab-Atlas — including text, graphics, design, and software — is our intellectual property or used under license. You may not reproduce, distribute, or create derivative works without our written permission.

### User-Submitted Content
By submitting content (such as partner blog articles), you grant Rehab-Atlas a non-exclusive, worldwide license to use, display, and distribute that content on our platform.

## 7. Limitation of Liability

Rehab-Atlas is provided "as is" without warranties of any kind. We are not liable for:
- Decisions made based on information on our platform
- Actions or quality of any treatment center
- Interruptions or errors in platform availability
- Loss of data or unauthorized access to your account

Our total liability is limited to the amount you paid to Rehab-Atlas (if any) in the 12 months preceding the claim.

## 8. Indemnification

You agree to indemnify and hold harmless Rehab-Atlas from any claims, damages, or expenses arising from your use of the platform or violation of these terms.

## 9. Termination

We may suspend or terminate your account at any time for violation of these terms. You may delete your account at any time through your account settings.

## 10. Changes to Terms

We may update these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms.

## 11. Governing Law

These terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles.

## 12. Contact

For questions about these Terms of Service:
- **Email:** legal@rehabatlas.com
- **Contact form:** [Contact Us](/pages/contact)

---

*Rehab-Atlas — A Digital Sanctuary for Recovery*`
  },
  {
    title: "Medical Disclaimer",
    slug: "disclaimer",
    page_type: "legal",
    status: "published",
    meta_title: "Medical Disclaimer | Rehab-Atlas",
    meta_description: "Important medical disclaimer regarding the information provided on Rehab-Atlas. This platform does not provide medical advice.",
    published_at: new Date().toISOString(),
    content: `# Medical Disclaimer

*Last updated: March 2026*

## Important Notice

**Rehab-Atlas does not provide medical advice, diagnosis, or treatment.** The information on this platform is for informational and educational purposes only and is not a substitute for professional medical advice.

## Not a Healthcare Provider

Rehab-Atlas is a technology platform that facilitates connections between individuals seeking treatment and rehabilitation centers. We are:

- **NOT** a medical facility or healthcare provider
- **NOT** licensed to diagnose or treat any medical condition
- **NOT** qualified to recommend specific medical treatments
- **NOT** responsible for the care provided by any listed center

## Seek Professional Help

Always consult a qualified healthcare professional before making decisions about:
- Substance use disorder treatment
- Mental health treatment
- Medication changes
- Detoxification
- Any medical or psychological concern

## Emergency Situations

**If you or someone you know is experiencing a medical emergency, call 911 (or your local emergency number) immediately.**

For immediate crisis support:
- **National Suicide Prevention Lifeline:** 988
- **SAMHSA National Helpline:** 1-800-662-4357
- **Crisis Text Line:** Text HOME to 741741

## Information Accuracy

While we strive to provide accurate and up-to-date information:
- Treatment center details may change without notice
- Insurance coverage varies and should be verified directly
- Treatment outcomes vary by individual
- Our AI matching recommendations are algorithmic suggestions, not medical advice
- Editorial ratings represent our assessment methodology and are not clinical evaluations

## No Doctor-Patient Relationship

Using Rehab-Atlas does not create a doctor-patient, therapist-client, or any other healthcare relationship between you and Rehab-Atlas or any of our staff.

## Third-Party Content

Rehab-Atlas may feature content contributed by treatment centers and other third parties. We review this content for quality but do not independently verify all medical claims made by contributing authors.

## Limitation

By using Rehab-Atlas, you acknowledge that:
1. You have read and understood this medical disclaimer
2. You will seek appropriate professional advice before making treatment decisions
3. Rehab-Atlas is not liable for any actions taken based on information provided on this platform

## Contact

For questions about this disclaimer:
- **Email:** info@rehabatlas.com
- **Contact form:** [Contact Us](/pages/contact)

---

*Rehab-Atlas — A Digital Sanctuary for Recovery*`
  },
  {
    title: "Contact a Specialist",
    slug: "contact",
    page_type: "static",
    status: "published",
    meta_title: "Contact Rehab-Atlas — Speak with a Recovery Specialist",
    meta_description: "Get in touch with the Rehab-Atlas team. Our specialists are available to help you find the right treatment center with complete confidentiality.",
    published_at: new Date().toISOString(),
    content: `# Contact a Specialist

We're here to help you navigate the path to recovery with discretion and care.

## How to Reach Us

### Submit an Inquiry
The fastest way to connect with our team is through our [confidential inquiry form](/inquiry). A specialist will review your needs and respond within 2-4 hours.

[Submit an Inquiry →](/inquiry)

### Email
For general inquiries: **info@rehabatlas.com**
For privacy concerns: **privacy@rehabatlas.com**
For center partnerships: **partners@rehabatlas.com**

### WhatsApp
Message us on WhatsApp for a discreet conversation: **[Contact via WhatsApp](https://wa.me/your_whatsapp_number)**

## For Treatment Centers

### Join Our Network
If you represent a rehabilitation center and would like to be listed on Rehab-Atlas, [create a center partner account](/auth/signup) to begin the verification process.

### Existing Partners
Log in to your [partner dashboard](/partner) to manage your listing, upload photos, and submit educational content.

## What to Expect

When you contact us:

1. **Confidentiality** — Every conversation is strictly private
2. **No pressure** — We provide information and guidance, never sales pressure
3. **Expert guidance** — Our team understands the treatment landscape
4. **Your pace** — You decide when and how to move forward

> "The first step doesn't have to be a leap. Sometimes it's just a quiet conversation."

## Office Hours

Our specialist team is available:
- **Monday – Friday:** 8:00 AM – 8:00 PM (EST)
- **Saturday:** 9:00 AM – 5:00 PM (EST)
- **Sunday:** Emergency inquiries only

*All inquiries submitted outside office hours will be addressed the next business day.*

---

*Rehab-Atlas — A Digital Sanctuary for Recovery*`
  },
  {
    title: "HIPAA Compliance",
    slug: "hipaa",
    page_type: "legal",
    status: "published",
    meta_title: "HIPAA Compliance | Rehab-Atlas",
    meta_description: "Rehab-Atlas commitment to HIPAA compliance and healthcare data protection standards.",
    published_at: new Date().toISOString(),
    content: `# HIPAA Compliance

*Last updated: March 2026*

## Our Commitment to Data Protection

Rehab-Atlas takes the protection of health information seriously. While we are primarily an information and referral platform (not a covered entity under HIPAA), we voluntarily adopt HIPAA-aligned practices to protect the sensitive nature of the information shared with us.

## What We Protect

When you share health-related information through our platform — such as substance use concerns, mental health conditions, or treatment preferences — we handle this data with the same care as Protected Health Information (PHI).

## Security Measures

### Technical Safeguards
- **Encryption at rest and in transit** using AES-256 and TLS 1.3
- **Access controls** with role-based permissions
- **Audit logging** of all access to sensitive data
- **Secure infrastructure** hosted on enterprise-grade cloud providers

### Administrative Safeguards
- **Employee training** on data privacy and security
- **Background checks** for team members with data access
- **Incident response plan** for potential data breaches
- **Regular risk assessments** and compliance reviews

### Physical Safeguards
- **Cloud-hosted infrastructure** with SOC 2 compliance
- **No local storage** of sensitive health information
- **Geographic redundancy** for data protection

## When We Forward Your Information

When you consent to having your inquiry forwarded to a treatment center:
- Only the minimum necessary information is shared
- Centers are expected to handle your information in compliance with HIPAA
- A record of all disclosures is maintained
- You can request details of what was shared at any time

## Your Rights

You have the right to:
- Know what health information we hold about you
- Request corrections to your information
- Request restrictions on how we use your information
- Request deletion of your information
- File a complaint if you believe your privacy has been violated

## Contact Our Privacy Officer

For HIPAA-related inquiries:
- **Email:** privacy@rehabatlas.com
- **Subject line:** HIPAA Inquiry

---

*Rehab-Atlas — A Digital Sanctuary for Recovery*`
  },
];

async function seed() {
  let count = 0;
  for (const page of pages) {
    // Check if already exists
    const { data: existing } = await supabase.from('pages').select('id').eq('slug', page.slug).single();
    if (existing) {
      // Update
      const { error } = await supabase.from('pages').update(page).eq('slug', page.slug);
      if (error) console.log('UPDATE ERR:', page.slug, error.message);
      else { count++; console.log('UPDATED:', page.title); }
    } else {
      const { error } = await supabase.from('pages').insert(page);
      if (error) console.log('INSERT ERR:', page.slug, error.message);
      else { count++; console.log('CREATED:', page.title); }
    }
  }
  console.log(`\nDone: ${count} pages`);
}

seed();
