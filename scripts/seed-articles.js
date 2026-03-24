const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jfpxyaajmarlfhcngszh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcHh5YWFqbWFybGZoY25nc3poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg5NDkyNCwiZXhwIjoyMDg5NDcwOTI0fQ.v0b7BQ8gv5SCmU23UHrEIg4-kJ8cicmKEoi7yirQgqI'
);

const articles = [
  {
    title: "Understanding Alcohol Addiction: Signs, Stages, and Treatment Options",
    slug: "understanding-alcohol-addiction",
    meta_title: "Understanding Alcohol Addiction: Complete Guide | Rehab-Atlas",
    meta_description: "Learn about the stages of alcohol addiction, warning signs, and evidence-based treatment options. Expert guidance from Rehab-Atlas clinical specialists.",
    content: `Alcohol use disorder (AUD) is a medical condition characterized by an inability to stop or control alcohol use despite adverse consequences. It affects millions worldwide and ranges from mild to severe.

## Recognizing the Signs

Early identification is crucial for effective treatment. Common signs include:

- **Increased tolerance** — needing more alcohol to achieve the same effect
- **Withdrawal symptoms** — anxiety, tremors, or nausea when not drinking
- **Loss of control** — drinking more or longer than intended
- **Neglecting responsibilities** — work, family, or social obligations suffer
- **Continued use despite harm** — physical, psychological, or relationship damage

## The Stages of Alcohol Addiction

### Stage 1: Occasional Abuse and Binge Drinking
Social drinking gradually shifts to using alcohol as a coping mechanism. Binge drinking episodes become more frequent.

### Stage 2: Increased Drinking
Alcohol becomes a regular part of daily life. Emotional attachment to drinking develops. Hangovers and withdrawal begin.

### Stage 3: Problem Drinking
Social and professional consequences emerge. Relationships strain. The person may recognize the problem but feels unable to stop.

### Stage 4: Physical Dependence
The body has adapted to alcohol. Withdrawal becomes dangerous. Medical detox is often necessary at this stage.

### Stage 5: Addiction (AUD)
Drinking is compulsive. Physical and mental health deteriorate significantly. Professional treatment is essential.

## Evidence-Based Treatment Approaches

### Medical Detoxification
For moderate to severe AUD, medically supervised detox is the safest first step. Withdrawal can be life-threatening and should never be attempted alone.

### Inpatient Rehabilitation
Residential programs provide 24/7 support, structured therapy, and a substance-free environment. Typical stays range from 30 to 90 days.

### Outpatient Programs
Suitable for mild to moderate AUD, outpatient programs allow patients to maintain daily responsibilities while attending regular therapy sessions.

### Behavioral Therapies
- **Cognitive Behavioral Therapy (CBT)** — identifies and changes thought patterns that lead to drinking
- **Motivational Enhancement Therapy (MET)** — builds internal motivation to change
- **Dialectical Behavior Therapy (DBT)** — teaches emotional regulation skills

### Medication-Assisted Treatment (MAT)
FDA-approved medications such as naltrexone, acamprosate, and disulfiram can reduce cravings and support long-term recovery.

## Finding the Right Treatment Center

The best treatment program depends on individual factors: severity of addiction, co-occurring mental health conditions, personal preferences, and budget. A comprehensive assessment can help match you with the right facility.

> Recovery is not a destination — it is a lifelong journey. The first step is asking for help.

If you or a loved one is struggling with alcohol addiction, our specialists can help you find the right treatment center. Take our [free assessment](/assessment) or [contact us](/inquiry) for confidential guidance.`,
    page_type: "blog",
    status: "published",
    published_at: new Date("2026-03-15").toISOString(),
  },
  {
    title: "What to Expect During Drug Rehabilitation: A Complete Guide",
    slug: "what-to-expect-drug-rehabilitation",
    meta_title: "What to Expect During Drug Rehab | Rehab-Atlas Guide",
    meta_description: "Nervous about entering rehab? Learn exactly what happens during drug rehabilitation — from intake to aftercare. Comprehensive guide by Rehab-Atlas.",
    content: `Entering a rehabilitation program can feel overwhelming. Understanding what to expect can ease anxiety and help you or your loved one prepare for the journey ahead.

## Before Admission

### Pre-Assessment
Most facilities conduct a phone or in-person assessment to understand your needs, substance use history, and any co-occurring conditions. This helps them create a personalized treatment plan.

### What to Bring
- Comfortable clothing for 30-90 days
- Personal hygiene items (facilities often have restrictions)
- Insurance information and identification
- A list of current medications
- Emergency contact information

### What Not to Bring
Most programs prohibit electronics, outside food, weapons, and any substances. Check with your specific facility for their policy.

## Phase 1: Intake and Detox (Days 1-7)

### Medical Evaluation
A thorough physical and psychological assessment is conducted. Medical history, drug use patterns, and mental health screenings help clinicians develop your treatment plan.

### Detoxification
If needed, medical detox manages withdrawal symptoms safely. This phase is closely monitored by medical professionals. Medications may be used to ease discomfort.

> Detox is not treatment — it is the foundation upon which treatment is built.

## Phase 2: Active Treatment (Weeks 2-8)

### Individual Therapy
One-on-one sessions with a licensed therapist address the underlying causes of addiction — trauma, mental health conditions, behavioral patterns.

### Group Therapy
Group sessions build community, reduce isolation, and allow shared learning. Common formats include process groups, psychoeducation, and skills training.

### Holistic Therapies
Many modern programs incorporate:
- Yoga and meditation
- Art and music therapy
- Equine therapy
- Mindfulness training
- Nutrition counseling

### Family Programming
Addiction affects the entire family. Many facilities offer family therapy sessions, education programs, and communication workshops.

## Phase 3: Transition and Aftercare (Final Weeks)

### Relapse Prevention Planning
You will work with your treatment team to identify triggers, develop coping strategies, and create a concrete plan for maintaining sobriety.

### Step-Down Options
- **Partial Hospitalization (PHP)** — structured daytime programming
- **Intensive Outpatient (IOP)** — several hours per week of therapy
- **Sober Living** — structured housing during early recovery

### Continuing Care
Long-term recovery requires ongoing support. Most programs connect you with:
- 12-step or alternative support groups
- Outpatient therapists
- Alumni networks
- Telehealth check-ins

## Choosing the Right Program

Not all rehabilitation programs are equal. Consider these factors:
- **Accreditation** — CARF or Joint Commission accredited facilities meet higher standards
- **Staff credentials** — licensed therapists, board-certified psychiatrists
- **Treatment modalities** — evidence-based approaches
- **Aftercare planning** — programs that plan for life after rehab have better outcomes

Our [matching assessment](/assessment) can help identify the best program for your specific needs.`,
    page_type: "blog",
    status: "published",
    published_at: new Date("2026-03-12").toISOString(),
  },
  {
    title: "Dual Diagnosis: When Addiction Meets Mental Health",
    slug: "dual-diagnosis-addiction-mental-health",
    meta_title: "Dual Diagnosis Treatment: Addiction & Mental Health | Rehab-Atlas",
    meta_description: "Understanding dual diagnosis — when substance use disorder co-occurs with mental health conditions. Learn about integrated treatment approaches.",
    content: `Approximately 50% of individuals with a substance use disorder also have a co-occurring mental health condition. This is known as dual diagnosis, and it requires specialized, integrated treatment.

## What is Dual Diagnosis?

Dual diagnosis (also called co-occurring disorders) refers to the simultaneous presence of a substance use disorder and a mental health condition. Common combinations include:

- **Depression and alcohol use disorder**
- **Anxiety disorders and benzodiazepine dependence**
- **PTSD and opioid addiction**
- **Bipolar disorder and stimulant abuse**
- **ADHD and substance misuse**

## The Chicken-or-Egg Question

The relationship between mental health and addiction is bidirectional:

### Self-Medication
Many people use substances to manage untreated mental health symptoms — anxiety, depression, trauma. While substances may provide temporary relief, they ultimately worsen the underlying condition.

### Substance-Induced Disorders
Chronic substance use can trigger or exacerbate mental health symptoms. Alcohol is a depressant that worsens depression over time. Stimulants can trigger psychosis or severe anxiety.

### Shared Risk Factors
Genetics, childhood trauma, chronic stress, and brain chemistry contribute to both conditions. Having one increases vulnerability to the other.

## Why Integrated Treatment Matters

Treating only the addiction without addressing the mental health condition — or vice versa — leads to poor outcomes and higher relapse rates.

**Integrated treatment** addresses both conditions simultaneously with a coordinated team of addiction specialists and mental health professionals.

### Components of Effective Dual Diagnosis Treatment

1. **Comprehensive Assessment** — thorough evaluation of both conditions
2. **Coordinated Care Team** — psychiatrists, therapists, and addiction counselors working together
3. **Medication Management** — psychiatric medications alongside addiction treatment
4. **Trauma-Informed Care** — recognizing the role of trauma in both conditions
5. **Long-Term Planning** — ongoing mental health treatment after rehab

## Finding a Dual Diagnosis Program

Not all rehab facilities are equipped to treat co-occurring disorders. When evaluating programs, ask:

- Do you have licensed psychiatrists on staff?
- Is mental health treatment integrated into the addiction program?
- Do you offer medication management for psychiatric conditions?
- What is your approach to trauma treatment?
- How do you coordinate care after discharge?

> The most effective recovery addresses the whole person — mind, body, and spirit.

If you suspect a dual diagnosis, our [assessment tool](/assessment) screens for co-occurring conditions and matches you with specialized programs.`,
    page_type: "blog",
    status: "published",
    published_at: new Date("2026-03-10").toISOString(),
  },
  {
    title: "The Role of Family in Addiction Recovery",
    slug: "family-role-addiction-recovery",
    meta_title: "Family's Role in Addiction Recovery | Rehab-Atlas",
    meta_description: "How families can support a loved one through addiction recovery while maintaining their own wellbeing. Practical guidance from Rehab-Atlas.",
    content: `Addiction is often called a "family disease" because its effects ripple through every relationship. Family involvement in recovery can significantly improve outcomes — but it must be done thoughtfully.

## Understanding the Family Dynamic

### Common Family Roles in Addiction
- **The Enabler** — protects the addicted person from consequences
- **The Hero** — overachieves to compensate for family dysfunction
- **The Scapegoat** — acts out, drawing attention away from the addiction
- **The Lost Child** — withdraws and becomes invisible
- **The Mascot** — uses humor to deflect from painful realities

Recognizing these patterns is the first step toward healthier dynamics.

## How Families Can Help

### Educate Yourself
Understanding addiction as a medical condition — not a moral failing — changes everything. Learn about:
- The neuroscience of addiction
- Common treatment approaches
- Realistic expectations for recovery
- The nature of relapse

### Set Boundaries with Love
Boundaries are not punishment — they are protection. Healthy boundaries might include:
- Refusing to provide money that may fund substance use
- Not covering up or making excuses for addictive behavior
- Maintaining your own health and responsibilities
- Communicating consequences clearly and following through

### Participate in Family Therapy
Many treatment programs offer family programming. This may include:
- **Multi-family groups** — learning from other families' experiences
- **Couples counseling** — rebuilding trust and communication
- **Family education sessions** — understanding the treatment process
- **Intervention planning** — structured conversations when needed

### Take Care of Yourself
You cannot pour from an empty cup. Prioritize:
- Support groups like Al-Anon or Nar-Anon
- Individual therapy for yourself
- Physical health and self-care
- Maintaining social connections outside the addiction

## What NOT to Do

- **Don't enable** — helping that prevents natural consequences delays recovery
- **Don't control** — you cannot force someone into lasting recovery
- **Don't shame** — guilt and shame fuel the addiction cycle
- **Don't give up** — recovery is possible, even after multiple attempts

## After Treatment

Recovery continues long after formal treatment ends. Family support during this transition is critical:

- Attend family sessions during aftercare
- Learn to recognize warning signs of relapse
- Create a home environment that supports sobriety
- Celebrate milestones while remaining realistic

> You didn't cause it. You can't cure it. You can't control it. But you can contribute to an environment where recovery thrives.

Need guidance on supporting a loved one? [Contact our specialists](/inquiry) for confidential family support.`,
    page_type: "blog",
    status: "published",
    published_at: new Date("2026-03-08").toISOString(),
  },
  {
    title: "Opioid Addiction: Understanding the Crisis and Finding Help",
    slug: "opioid-addiction-crisis-treatment",
    meta_title: "Opioid Addiction Treatment Guide | Rehab-Atlas",
    meta_description: "Comprehensive guide to opioid addiction — from prescription painkillers to heroin. Learn about medication-assisted treatment and recovery options.",
    content: `The opioid epidemic has claimed hundreds of thousands of lives worldwide. Understanding the nature of opioid addiction and available treatments is essential for anyone affected by this crisis.

## How Opioid Addiction Develops

Opioids include prescription painkillers (oxycodone, hydrocodone, fentanyl) and illegal drugs (heroin). They bind to receptors in the brain, producing pain relief and euphoria.

### The Progression
1. **Legitimate use** — prescribed for pain after surgery or injury
2. **Tolerance** — higher doses needed for the same effect
3. **Dependence** — the body requires opioids to function normally
4. **Addiction** — compulsive use despite harmful consequences
5. **Escalation** — transitioning to stronger opioids or heroin for cost/availability

## The Dangers

- **Overdose risk** — opioids suppress breathing; overdose can be fatal within minutes
- **Fentanyl contamination** — illicit drugs increasingly contain fentanyl, dramatically increasing overdose risk
- **Withdrawal** — intensely uncomfortable but rarely life-threatening; medical support is recommended

## Treatment Approaches

### Medication-Assisted Treatment (MAT)
MAT is considered the gold standard for opioid addiction treatment:

- **Buprenorphine (Suboxone)** — reduces cravings and withdrawal; can be prescribed by certified physicians
- **Methadone** — long-acting opioid administered in specialized clinics; stabilizes patients
- **Naltrexone (Vivitrol)** — blocks opioid effects; monthly injection option available

### Medical Detox
Supervised withdrawal management using medications to ease symptoms. Duration is typically 5-7 days.

### Residential Treatment
Immersive 30-90 day programs combining MAT, behavioral therapy, and holistic approaches.

### Behavioral Therapies
- Cognitive Behavioral Therapy (CBT)
- Contingency Management
- Motivational Interviewing
- Group therapy and peer support

## Harm Reduction

For those not yet ready for treatment:
- **Naloxone (Narcan)** — reverses opioid overdose; available without prescription in many states
- **Needle exchange programs** — reduce disease transmission
- **Fentanyl test strips** — detect fentanyl in drug supply

## Recovery is Possible

Opioid addiction is treatable. With the right combination of medication, therapy, and support, people recover every day.

Our [assessment tool](/assessment) can help identify specialized opioid treatment programs in our network. For immediate help, [submit a confidential inquiry](/inquiry).`,
    page_type: "blog",
    status: "published",
    published_at: new Date("2026-03-05").toISOString(),
  },
  {
    title: "How to Choose the Right Rehab Center: 10 Questions to Ask",
    slug: "how-to-choose-right-rehab-center",
    meta_title: "How to Choose the Right Rehab Center | Rehab-Atlas",
    meta_description: "10 essential questions to ask when choosing a rehabilitation center. Expert guidance to help you find the best treatment program for your needs.",
    content: `Choosing a rehabilitation center is one of the most important decisions you will make. With thousands of options available, knowing what to look for can mean the difference between effective treatment and wasted time.

## The 10 Essential Questions

### 1. Is the facility accredited?
Look for accreditation from CARF (Commission on Accreditation of Rehabilitation Facilities) or the Joint Commission. These ensure quality standards.

### 2. What are the staff credentials?
Ask about:
- Licensed therapists (LCSW, LPC, LMFT)
- Board-certified psychiatrists
- Certified addiction counselors (CADC)
- Nursing staff ratios

### 3. What treatment modalities do they use?
Evidence-based approaches include CBT, DBT, EMDR, motivational interviewing, and medication-assisted treatment. Be cautious of programs relying solely on unproven methods.

### 4. Do they treat co-occurring disorders?
If you have both addiction and mental health conditions, you need integrated dual diagnosis treatment — not sequential treatment.

### 5. What does a typical day look like?
A quality program includes individual therapy, group sessions, educational workshops, physical activity, and free time. Ask for the daily schedule.

### 6. What is the staff-to-patient ratio?
Lower ratios mean more individualized attention. Look for ratios of 1:6 or better for clinical staff.

### 7. What happens after treatment?
Strong programs include aftercare planning, alumni support, step-down options, and continuing care coordination.

### 8. What are the true costs?
Understand what is and isn't covered. Ask about:
- Insurance acceptance and verification
- Out-of-pocket costs
- Payment plans
- Scholarships or financial assistance

### 9. What is their success rate and how do they measure it?
Be skeptical of programs claiming very high success rates. Look for honest discussions about outcomes and how they track long-term recovery.

### 10. Can you visit or speak with alumni?
Reputable programs welcome visits and can connect you with alumni willing to share their experience.

## Red Flags to Watch For

- **High-pressure sales tactics** — legitimate programs don't push for immediate commitment
- **Unrealistic promises** — "guaranteed" recovery or "cure" claims
- **Lack of licensed staff** — unlicensed counselors or no psychiatric oversight
- **No aftercare planning** — treatment without transition planning has lower success rates
- **Patient brokering** — kickbacks for referrals are illegal and unethical

## Let Us Help

Evaluating treatment centers is overwhelming, especially during a crisis. Our team has vetted hundreds of facilities and can match you based on your specific needs, preferences, and budget.

[Take our assessment](/assessment) for personalized recommendations, or [contact a specialist](/inquiry) for guidance.`,
    page_type: "blog",
    status: "published",
    published_at: new Date("2026-03-01").toISOString(),
  },
];

async function seed() {
  let count = 0;
  for (const article of articles) {
    const { error } = await supabase.from('pages').insert(article);
    if (error) {
      console.log('SKIP:', article.title, '-', error.message);
    } else {
      count++;
      console.log('OK:', article.title);
    }
  }
  console.log(`\nSeeded ${count} articles`);
}

seed();
