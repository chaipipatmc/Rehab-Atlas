# RehabAtlas Content Strategy

> Single source of truth for what we publish, how we write it, and how every article connects to the rest of the site for SEO + AI search (AISO).
>
> This document is read by humans (editors, partners) **and** baked into the [Content Creator agent](src/lib/agents/content-creator.ts) prompt. When you change strategy, update this doc first, then the agent.

---

## 1. Mission

Every article must do one or more of:

1. **Rank** for a specific search intent (informational or commercial).
2. **Funnel** readers toward a money page: `/centers`, `/compare`, `/assessment`, `/inquiry`.
3. **Get cited** by AI search (ChatGPT, Claude, Perplexity) for recovery-related queries.

If an article doesn't do any of those, don't publish it.

---

## 2. Site Architecture (Hub & Spoke)

```
┌────────────────────────────────────────────────────────────────┐
│  HUBS (already built — these are the "money pages")            │
├────────────────────────────────────────────────────────────────┤
│  /rehab/[condition]       ← 10 PILLAR pages (treatment areas)  │
│  /rehab-in/[country]      ← Country landing pages              │
│  /rehab-in/[country]/[city]                                    │
│  /rehab-in/[country]/[city]/[condition]                        │
│  /compare/[a]-vs-[b]      ← Side-by-side comparison            │
│  /centers, /centers/[slug]                                     │
└────────────────────────────────────────────────────────────────┘
              ▲                ▲              ▲
              │   Every blog spoke MUST link  │
              │   back to its PILLAR + at     │
              │   least one country/city hub  │
┌─────────────┴────────────────┴──────────────┴──────────────────┐
│  SPOKES (blog articles, 1500–2000 words each)                  │
│  /blog/[slug]                                                  │
└────────────────────────────────────────────────────────────────┘
```

**The 10 Pillars** (each is a `/rehab/[condition]` page):

| Slug | Pillar Title | What it covers |
|------|--------------|----------------|
| `alcohol-addiction` | Alcohol Addiction Treatment | Alcohol use disorder, detox, behavioral therapy |
| `drug-addiction` | Drug Addiction Treatment | Illicit substances, withdrawal, counseling |
| `opioid-addiction` | Opioid Addiction Treatment | MAT, buprenorphine, methadone, fentanyl |
| `prescription-drug-abuse` | Prescription Drug Abuse | Benzos, painkillers, tapering |
| `dual-diagnosis` | Dual Diagnosis Treatment | Co-occurring substance + mental health |
| `mental-health` | Mental Health Treatment | Depression, anxiety, bipolar, psychiatric |
| `trauma-ptsd` | Trauma & PTSD Treatment | EMDR, somatic experiencing, complex trauma |
| `eating-disorders` | Eating Disorder Treatment | Anorexia, bulimia, binge eating |
| `gambling-addiction` | Gambling Addiction Treatment | Compulsive gambling, CBT |
| `behavioral-addiction` | Behavioral Addiction Treatment | Gaming, internet, sex, shopping |

---

## 3. Every Article Has a Pillar

When the content agent (or a human) drafts a new article, **the first decision is which pillar it belongs to.** The article must:

- Link back to its pillar page in the **first 250 words** with descriptive anchor text (not "click here").
- Use language that connects the topic to that pillar's scope (e.g., "alcohol detox" stays in the alcohol-addiction pillar, not the dual-diagnosis pillar).
- Be discoverable from the pillar — once published, the pillar should pick it up via the existing "Related Articles" query (tags-based).

**The pillar is resolved automatically** by `inferPillar(topic, category)` in [content-creator.ts](src/lib/agents/content-creator.ts). The rule is "most specific keyword match wins":

| Match Priority | Keywords | Pillar |
|---------------|----------|--------|
| 1 | opioid, heroin, fentanyl, MAT | `opioid-addiction` |
| 2 | prescription, benzo, painkiller, adderall | `prescription-drug-abuse` |
| 3 | alcohol, drinking, alcoholism | `alcohol-addiction` |
| 4 | trauma, PTSD, EMDR, ACEs | `trauma-ptsd` |
| 5 | eating disorder, anorexia, bulimia | `eating-disorders` |
| 6 | gambling, betting, casino | `gambling-addiction` |
| 7 | behavioral, gaming, porn, internet | `behavioral-addiction` |
| 8 | dual diagnosis, co-occurring | `dual-diagnosis` |
| 9 | mental health, depression, anxiety | `mental-health` |
| 10 | drug, cocaine, meth, kratom, ketamine | `drug-addiction` |
| Fallback | (none of the above) | `dual-diagnosis` (broadest medical scope) |

When a topic could plausibly map to multiple pillars, the order above picks the **most specific** one. "Methamphetamine addiction in teens" → `drug-addiction`, not `mental-health`, even though both apply.

---

## 4. Editorial Voice (CRITICAL)

### Primary audience: **family member**, not patient

~70% of rehab inquiries come from family members researching on behalf of a loved one. Default to writing for **the person doing the research**, not the person who needs treatment.

- Use "your loved one," "your son/daughter/spouse/parent."
- Address the reader as the capable adult who is trying to help.
- Never moralize, never blame the family.

Patient-direct topics (recovery guides, "first 30 days") can address the patient, but still acknowledge family stakes (boundaries, communication, relapse signals).

### Tone

- **Journalist, not AI.** A senior health reporter with 15+ years on the addiction beat. Third-person professional voice when stating facts; second-person ("you") when speaking to the family.
- **Quiet confidence.** Don't hedge everything. Don't over-explain.
- **Specific over generic.** Cite real research (WHO, NIDA, SAMHSA, Lancet, JAMA, NEJM). Reference real treatment approaches by name.
- **Varied rhythm.** Mix short punchy sentences with longer flowing ones. Single-sentence paragraphs are fine for impact.

### Hook (the first 1–2 sentences)

| ✅ Good hooks | ❌ Bad hooks |
|---------------|-------------|
| "By the time a family decides to look up rehab options, they've usually been worrying for eighteen months." | "Sarah stared at her phone, wondering if her son would ever come home." |
| "Most people don't recognize the early signs of meth use in someone they love." | "In today's world, addiction has become a growing problem." |
| "An estimated 14.5 million U.S. adults have alcohol use disorder, yet fewer than 10% receive treatment in any given year." | "This comprehensive guide will explore everything you need to know about..." |

### Banned phrases (auto-reject in review)

`In today's world` · `It's important to note` · `This comprehensive guide` · `Let's dive in` · `In this article we will explore` · `It's worth noting` · `journey` (overused) · `landscape` · `navigate` · `crucial` · `empower` · `game-changer` · `holistic approach`

### Forbidden patterns

- ❌ Opening with a fictional character (no "Sarah / John / Maria")
- ❌ Opening with a dictionary definition
- ❌ First-person ("I," "in my experience," "having worked with...")
- ❌ Vague reassurances ("you're not alone," "help is available") as conclusion
- ❌ Specific medical advice (always recommend consulting a professional)

---

## 5. Structure

### Required sections (in order)

```markdown
[Hook — 1-3 sentences, no heading]

[Body — 2-4 paragraphs introducing the topic + linking to the pillar
within the first 250 words]

## [H2 — first major section]

[Body...]

{{IMAGE_1}}

## [H2 — second section]

### [H3 — sub-point]

[Body...]

## [H2 — third section]

{{IMAGE_2}}

[...continue...]

## Frequently Asked Questions

### What is X?

[Answer — 2-4 sentences]

### How do I Y?

[Answer]

[...4-6 FAQs total — REQUIRED for FAQPage JSON-LD and auto-approval]
```

**Auto-approval gate (per [content-auto-approve](src/lib/agents/content-auto-approve.ts) — added in commit `6c28b85`):** requires `## Frequently Asked Questions` heading + at least 3 `### Question` items. Without this, the article won't auto-approve regardless of other quality.

### Length

| Article type | Target words |
|--------------|-------------|
| Standard spoke | 1,500–2,000 |
| Quick-answer / FAQ post | 800–1,200 (reserved for specific high-intent queries — rare) |

Pillar pages are NOT written as blog posts — they're the existing `/rehab/[condition]` routes. Don't draft new pillars.

### Images

- **3–4 inline images** + **1 featured image**, total 4–5.
- Placeholders `{{IMAGE_1}}` through `{{IMAGE_4}}` placed between H2 sections.
- Featured image: `![featured](url "alt text")` at top of content. The renderer strips the `featured` marker and uses the title attribute as the actual alt for accessibility + image SEO.
- Inline images embed the article-specific image query as alt text (`![the actual query Claude used](url)`).
- Images sourced from Unsplash (primary) → Pexels (fallback).
- Image queries must be **specific to the article**, not generic ("therapist guiding patient through EMDR session" not "wellness recovery").

---

## 6. Internal Linking Rules

Every article must include the links below. The [auto-linker](src/lib/agents/auto-linker.ts) handles condition + country/city links automatically; the prompt instructs Claude to handle the pillar link explicitly; if Claude misses it, `forcePillarLinkInFirstParagraph()` force-inserts one.

| Link type | When | Anchor text examples |
|-----------|------|----------------------|
| **Pillar back-link** | REQUIRED — first 250 words (Claude inserts; auto-linker enforces) | "alcohol addiction treatment programs," "centers specializing in dual diagnosis" |
| **Country hub** | If article mentions a country with published centers | "rehab centers in Thailand," "Bali rehabilitation facilities" |
| **City hub** | If article mentions a specific city with published centers | "treatment options in Chiang Mai" |
| **Assessment** | At least once, ideally as soft CTA mid-article | "take our confidential matching assessment" |
| **Directory** | Near end | "browse all verified centers" |

### Auto-linker caps

- Max **6 internal links per article** (auto-linker, excluding manual pillar/CTA links).
- First occurrence only — no anchor-text spam.
- Skip headings, code blocks, images, existing links.

---

## 7. SEO Metadata

### Title (`<title>` + H1)

- **Max 65 characters**
- Include primary keyword in the first 50 chars
- Title formulas that work:

| Formula | Example |
|---------|---------|
| `How to X: A Y Guide` | "How to Stage an Intervention: A Family Guide" |
| `[Condition] in [Audience]: Signs, Stages, and Recovery` | "Alcohol Addiction in Adults: Signs, Stages, and Recovery Options" |
| `How to Tell If Your [Relation] [Behavior]` | "How to Tell If Your Adult Child Is Using Meth" |
| `[Treatment Type]: What [Audience] Should Know` | "Inpatient vs. Outpatient Rehab: What Families Should Know" |
| `[Country/Region] Rehab: [Specific Angle]` | "Thailand as a Rehab Destination: What You Need to Know" |

Avoid: clickbait, all-caps, multiple exclamation marks, em-dash title openers.

### Meta description

- **Max 155 characters**
- Include keyword + soft CTA
- Don't paraphrase the title — promise specific value

### URL slug

- Short, keyword-first, lowercase, hyphenated, ≤ 80 chars
- No stop words if avoidable

---

## 8. AISO (AI Search Optimization)

### Why we care

ChatGPT, Claude, Perplexity, Google AI Overviews increasingly answer recovery questions directly. The "click" goes to the source they cite. We want to be that source.

### Signals we already emit

| Signal | Implemented? | Where |
|--------|-------------|-------|
| FAQPage JSON-LD (from `## Frequently Asked Questions` parsing) | ✅ | [blog/[slug]/page.tsx](src/app/blog/[slug]/page.tsx) `extractFaqs()` |
| Article JSON-LD with `reviewedBy` | ✅ | [json-ld.tsx](src/components/shared/json-ld.tsx) `ArticleJsonLd` |
| MedicalWebPage JSON-LD | ✅ | Blog renderer |
| HowTo JSON-LD (auto-detected for "How to" / "Step N:" articles) | ✅ | [json-ld.tsx](src/components/shared/json-ld.tsx) `HowToJsonLd` (added in `6c28b85`) |
| Heading anchor IDs for jump-nav + featured snippet | ✅ | Blog renderer (added in `6c28b85`) |
| Image alt text from article-specific queries | ✅ | Content creator (added in `6c28b85`) |
| Author/reviewer attribution | ✅ | `reviewedBy` on `ArticleJsonLd` |
| Direct, quotable sentences | Prompt-enforced | Content creator system prompt |

### What kills citation

- Hedging ("some studies suggest," "many experts believe")
- Fictional scenarios (AI cannot fact-check)
- Unsourced statistics

---

## 9. Cadence

| Phase | Cadence |
|-------|---------|
| **Now (post-launch)** | 3–5 articles/week (~15–20/month) |
| Pool target | 20 drafts in pool at all times |
| Pillar refresh | Every 6 months (manual calendar reminder) |
| Original research piece | 1/year ("State of Asia Rehab YYYY") |

Settings live in `site_settings` under `agent_content_creator_setting_*` — tunable from `/admin/agents`.

---

## 10. Topic Prioritization

When the pool is empty, prefer:

1. **High-volume keyword gaps** — topics competitors rank for but we don't.
2. **Family-first variants** — converts higher than patient-direct.
3. **Asian-substance niche** — yaba, ice/shabu, kratom, kava (first-hand local expertise = moat vs. Western competitors).
4. **Comparison content** — "Thailand vs. Bali for rehab," "Inpatient vs. outpatient for opioid recovery."
5. **City-specific guides** — "Choosing a rehab in Chiang Mai," "What to know about Bangkok detox programs."

Avoid: topics already covered (the agent dedupes by title), generic motivational content, listicles ranking specific centers (legal risk).

---

## 11. Pre-Publish Quality Gate (Checklist)

Before approving a draft in `/admin/agents`:

- [ ] Pillar link present in first 250 words with descriptive anchor (auto-linker ensures this; verify it's natural)
- [ ] Word count 1,500–2,000
- [ ] FAQ section parses cleanly (3+ `### Question` blocks under `## Frequently Asked Questions`) — required for auto-approve
- [ ] No banned phrases (search the body)
- [ ] No fictional character names ("Sarah," "John," "Maria")
- [ ] Hook is specific, not generic / not a definition
- [ ] At least 1 named research citation (WHO/NIDA/SAMHSA/etc.)
- [ ] Featured image relevant (not generic stock photo)
- [ ] Auto-linker added ≥ 2 internal links (check `agent_log.internal_links`)
- [ ] Title ≤ 65 chars
- [ ] Meta description ≤ 155 chars + includes CTA
- [ ] Family-first voice if topic could plausibly be either audience

---

## 12. When to Update This Document

- Adding a new pillar (would require new `/rehab/[condition]` route — rare)
- Changing the editorial voice
- Adding new banned phrases (we discover Claude's tells over time)
- Changing publishing cadence
- Adding new schema types we want to enforce

After updating, **also update the system prompt** in `src/lib/agents/content-creator.ts` if the change affects what Claude generates.

---

## Appendix A: Quick Reference for Reviewers

If a new editor or contractor is reviewing drafts, they only need to ask:

1. Does the article fit a pillar? Which one?
2. Does it link back to that pillar in the opening?
3. Does it sound like a journalist or like AI?
4. Does the FAQ section parse (3+ `### Question` blocks)?
5. Would I quote a sentence from this if I were ChatGPT?

If yes to all, approve.
