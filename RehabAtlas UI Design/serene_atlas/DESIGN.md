```markdown
# Design System Strategy: The Quiet Authority

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Sanctuary."** 

In the high-stakes environment of healthcare and recovery, users seek clarity, discretion, and a sense of calm. This system moves away from the "industrial" or "clinical" look of traditional medical portals. Instead, it adopts a **High-End Editorial** aesthetic—reminiscent of a premium wellness journal or an architectural monograph. 

We break the "template" look through:
*   **Intentional Asymmetry:** Off-center typography and staggered grid layouts that feel curated rather than generated.
*   **Atmospheric Whitespace:** Using the `spacing-20` and `spacing-24` tokens to allow content to "breathe," reducing cognitive load for users in stressful situations.
*   **Tonal Authority:** A reliance on sophisticated depth and material layering rather than loud colors or aggressive call-to-actions.

---

## 2. Colors & Materiality
The palette is rooted in a neutral, "lithic" base that feels grounded and permanent.

*   **Primary & Accents:** We utilize `primary` (#45636b) and `tertiary` (#4a6274) for moments of guidance. These deep teals and slates convey professional wisdom without the urgency of a brighter blue.
*   **The "No-Line" Rule:** To maintain a premium, seamless feel, **1px solid borders are strictly prohibited** for sectioning. Boundaries must be defined by background color shifts. For instance, a main content area using `surface` (#f8f9fa) should transition into a footer or sidebar using `surface-container-low` (#f1f4f6).
*   **Surface Hierarchy & Nesting:** Treat the UI as physical layers. An "Information Card" (`surface-container-lowest`) should sit atop a "Section Background" (`surface-container-low`), creating a natural sense of focus through subtle luminance changes rather than structural lines.
*   **Signature Textures:** For primary CTAs or hero sections, use subtle linear gradients transitioning from `primary` (#45636b) to `primary-dim` (#39575f) at a 135-degree angle. This adds "soul" and a tactile, satin-like finish to the interface.

---

## 3. Typography
The typographic pairing is a dialogue between tradition and modernity.

*   **The Serif (Noto Serif):** Used for all `display` and `headline` levels. This typeface provides the "Editorial" weight, signaling heritage and trustworthiness. Use `display-lg` (3.5rem) for hero statements to create a bold, confident entry point.
*   **The Sans (Inter):** Used for `title`, `body`, and `label` levels. Inter provides maximum legibility for complex healthcare data. 
*   **Hierarchy as Identity:** Create a dramatic scale contrast. Pair a `headline-lg` serif title with a `body-md` sans-serif description. The high contrast in scale—not just weight—is what defines the premium, custom feel of this design system.

---

## 4. Elevation & Depth
We eschew traditional "Drop Shadows" in favor of **Tonal Layering** and **Ambient Light.**

*   **The Layering Principle:** Depth is achieved by "stacking" the surface-container tiers. Place a `surface-container-lowest` card on a `surface-container-low` section to create a soft, natural lift.
*   **Ambient Shadows:** When an element must float (e.g., a modal or a floating action), use a shadow with a blur radius of 32px-64px and an opacity of 4%–8%. The shadow color must be a tinted version of `on-surface` (#2b3437) to mimic natural light.
*   **The "Ghost Border" Fallback:** If a container requires definition against a similar background (for accessibility), use a "Ghost Border": the `outline-variant` token at **15% opacity**. Never use 100% opaque borders.
*   **Glassmorphism:** For top navigation bars or floating filters, use `surface-bright` at 80% opacity with a `backdrop-blur` of 12px. This integrates the UI into the background, making the experience feel fluid and expensive.

---

## 5. Components

### Cards & Containers
*   **Styling:** Use `rounded-xl` (1.5rem/24px) for all primary cards to evoke a soft, approachable feel.
*   **Layout:** No dividers. Use `spacing-6` or `spacing-8` to separate internal card elements. Content should be grouped by proximity, not by lines.

### Buttons
*   **Primary:** Solid `primary` (#45636b) with `on-primary` text. Use `rounded-full` for a modern, pill-shaped aesthetic.
*   **Secondary:** `surface-container-highest` background with `on-surface` text. This feels integrated and low-friction.
*   **Interaction:** On hover, shift the background to `primary-dim`. Transitions should be slow (300ms) and easing (cubic-bezier).

### Input Fields
*   **Styling:** Use `surface-container-low` for the input background. No bottom line or full border. Use a `rounded-md` (0.75rem) corner.
*   **Focus State:** Transition the background to `surface-container-highest` and add a subtle "Ghost Border" using the `primary` color at 30% opacity.

### Selection Chips
*   **Styling:** For filter categories, use `surface-container-high` with `body-sm` typography. Selected states should use `primary-container` with `on-primary-container` text to provide a clear but calm "active" signal.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts. Place a hero image on the right while the serif headline sits 1/3rd from the left to create a high-end magazine feel.
*   **Do** lean into `surface-container` shifts. Use a slightly darker surface for a search bar to make it feel "recessed" into the page.
*   **Do** prioritize `spacing-12` and above for section gaps to maintain the "Calm" tone.

### Don’t:
*   **Don’t** use the `error` color (#9f403d) for anything other than critical system failures. Use `primary-dim` or `outline` for non-critical warnings to avoid alarming the user.
*   **Don’t** use "pure" black or "pure" white. Stick to the `surface` and `on-surface` tokens to maintain the soft, filtered aesthetic.
*   **Don’t** use iconography with sharp 90-degree corners. Ensure all icons follow the `rounded-md` logic of the system.
*   **Don't** use motion that is fast or bouncy. All animations should feel "weighted" and deliberate.```