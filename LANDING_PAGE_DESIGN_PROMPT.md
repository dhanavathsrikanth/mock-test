# Exam Prep — landing-page redesign prompt

Use this brief in Figma Make or another design-to-code tool. It describes the original design created for Exam Prep, informed by the spacious hierarchy, calm product storytelling and clear actions observed on Cashfree's website. Do not copy Cashfree's logo, illustrations, text or page composition.

Editable Figma design: https://www.figma.com/design/gi28CtcdEtlOriHWINeZlp?node-id=11-2

## Prompt to paste into Figma Make

Act as a senior product designer and frontend designer. Build a polished, responsive and genuinely interactive landing page for **Exam Prep**, an independent GATE practice and revision platform. Use the attached Exam Prep design as the visual reference. The result should feel spacious, confident and premium while remaining welcoming to engineering students. Keep the product free; do not introduce pricing, subscriptions, payment screens, locked answers or upsell messages.

### Product and conversion goal

Help a new visitor understand the complete study loop: **practise a question → understand the answer and concept → revisit it through focused revision**. The main conversion is “Start practising free”. The secondary action is “Try the demo”. An account is required for saved practice; the landing-page demo works without an account. Link real sign-in and sign-up actions to `https://mocktestcivil.vercel.app/auth/login` and `https://mocktestcivil.vercel.app/auth/sign-up`.

The platform currently offers GATE questions for 2021–2026 across CSE, CE, ME, EE and EC, with MCQ, MSQ and NAT response types, timed practice, worked text solutions, bookmarks, performance analytics, revision and syllabus-based concept feedback. Describe these plainly. Do not invent testimonials, student totals, success rates, rankings, institutional endorsements or official GATE affiliation. Label every illustrative question, queue and result as a demo. Do not claim that publicly downloadable papers are automatically public domain or commercially licensed.

### Visual direction and tokens

Use white as the dominant surface, with generous margins and restrained green accents. Avoid visual clutter, repeated floating cards, heavy gradients, dashboard clutter in the hero, excessive glass effects, endless decorative animation, and dense blocks of tiny text. Premium quality should come from proportion, typography, alignment and interaction quality.

| Role | Hex | Use |
| --- | --- | --- |
| Ink | `#152A22` | Headlines, strong text |
| Forest | `#175E45` | Primary actions, selected tabs |
| Forest hover | `#104A35` | Action hover state |
| Mint | `#EDF6F0` | Revision section, gentle selection fill |
| Lime | `#D8EF82` | One focused CTA accent; use dark text |
| White | `#FFFFFF` | Main canvas, cards |
| Subtle | `#F8FAF8` | Quiet panels and footer |
| Muted text | `#5E6E65` | Supporting copy |
| Border | `#DCE6DE` | Fine rules and card outlines |
| Error | `#A23C35` | Wrong-answer feedback with explanatory text |
| Error surface | `#FFF2EF` | Gentle wrong-answer background |

Use **Manrope SemiBold** for display and headings, **DM Sans** for body copy and controls, and **IBM Plex Mono Medium** sparingly for study-step numbers or compact data. Use a 64/72 desktop display and 40/48 mobile display, approximately 44/54 for desktop section headings, 28/36 for compact headings, 18/30 for introductions and 16/26 for body text. Keep paragraphs readable and avoid very light text weights.

At 1440 px, use a 1200 px content container with 120 px side margins. Use 80–104 px vertical section padding, smaller where content is compact. At 390 px, use 24 px side padding and 48–64 px vertical section spacing. Support 320, 390, 768, 1024 and 1440 px without horizontal overflow. Use 8 px rhythm, 12 px button radii, 16–24 px panel radii, 1 px borders, and a soft `0 12px 40px rgba(16,38,26,.08)` shadow only where elevation matters.

### Page structure and copy

1. **Sticky navigation:** original “ep / Exam Prep” wordmark, Practice, Smart revision, How it works, Sign in and Start free. On mobile, use a labelled Menu button with an accessible expanded menu. Anchor links must land below the sticky header.
2. **Hero:** a spacious two-column composition. Left: eyebrow “GATE preparation, with a clear next step”, headline **“Make every GATE question count.”**, supporting text “Practise 2021–2026 PYQs, understand your mistakes, and revisit the concepts that need another look.” Then the two actions and “Free to practise · No card needed”. Right: the working practice demo. Stack naturally on mobile.
3. **Collection facts:** show only “2021–2026 / GATE paper years”, “5 branches / CSE · CE · ME · EE · EC”, and “3 question types / MCQ · MSQ · NAT”. These are scope facts, not invented social proof.
4. **Branch explorer:** heading “Your branch. Your pace.” Provide five tabs. Switching must update the branch name, subject examples, active tab and CTA label together. CSE: Computer Science — Algorithms, Databases, Networks. CE: Civil Engineering — Structures, Geotechnical, Fluids. ME: Mechanical Engineering — Thermodynamics, Mechanics, Manufacturing. EE: Electrical Engineering — Machines, Power Systems, Control. EC: Electronics & Communication — Circuits, Signals, Communications. Use 2021–2026 and MCQ/MSQ/NAT consistently. The actual application asks the student to choose a stream during onboarding; do not pretend the landing selection has already saved a user preference.
5. **Three-step study loop:** “Practise. Understand. Return.” Explain “Start small”, “See the concept”, and “Return with purpose”. Use restrained rules and real sequential numbering rather than a wall of unrelated feature cards.
6. **Smart revision:** mint section, split layout, heading “Leave the guesswork out of revision.” Pair plain explanatory text with a clearly labelled illustrative queue showing Asymptotic complexity, Graph traversals and saved bookmarks. Explain that real recommendations come from completed practice and that small samples are early suggestions. Do not infer a student's mental mistake from a wrong answer.
7. **Practice formats:** “A short break or a full paper.” Present Sprints & topics, Timed papers, and Review & analytics. Explain mobile practice and longer desktop sessions accurately.
8. **FAQ:** five independently expandable rows: Is it free? Which branches/years? How does smart revision work? Can I use my phone? Is this official? State that the product is independent and not affiliated with GATE organisers. Keep the plus/minus indicator separate and aligned; reveal complete answers without logging in.
9. **Final invitation:** forest panel with “A small session. A clearer next step.” and one lime “Start practising free” action.
10. **Footer:** brand, “Built for the next question”, FAQ link and a brief independence statement. Avoid dead links or invented policies.

### Working demo — implement actual state, not decorative buttons

Use one original illustrative MSQ: **“Which functions grow slower than n²?”** Explain that this means `o(n²)` as n grows. Options: A `log₂ n`, B `n`, C `n log₂ n`, D `n³`. The accepted set is exactly **A, B, C**.

The Practice, Insights and Revision stages are connected:

- Options toggle independently with keyboard and pointer input. Show selection with a checkbox, text/state and `aria-pressed` or native checked state. Disable checking when no option is selected and show helpful instructions.
- Checking must evaluate the chosen set. A,B,C is correct. An accepted strict subset with no D is “Incomplete MSQ selection”. A,B,C,D is “Extra options in an MSQ”. D plus missing accepted options is “MSQ selection mismatch”. Explain the observed difference; never invent a psychological cause.
- Explain that the ratios of A, B and C to n² approach zero, whereas n³/n² = n increases without bound.
- The Insights stage shows the visitor's actual selection, the accepted set, helpful advice and “Asymptotic complexity” as the example syllabus concept. Editing the answer invalidates prior feedback until it is checked again.
- The Revision stage offers up to three questions and ten minutes as a product example. “Add to demo revision” updates the illustrative queue and shows a clear success state. Repeating the action must not duplicate the item. Make it explicit that this demo does not save to an account. Keep real sign-up separate.
- A Replay action resets choices, feedback, queue status, disabled states and stage navigation. Do not allow the visitor to open unearned feedback before checking an answer; explain the next required step.

### Interaction and accessibility quality

Use subtle 160–240 ms hover and state transitions. Move primary buttons by at most 1–2 px on hover. Give functional states visual hierarchy without constant looping animations or parallax. Respect `prefers-reduced-motion`.

Use semantic headings, landmark navigation, a skip link, 44–52 px touch targets, visible focus rings, readable contrast, labelled controls, arrow-key tab navigation, meaningful selected/expanded states and polite live feedback. Support Escape for the mobile menu and return focus to its trigger. Avoid hover-only functionality, inaccessible custom controls and colour-only correctness indicators. Keep the page fast and avoid heavy 3D assets or autoplay videos.

### Deliver and verify

Provide complete desktop and mobile views with reusable buttons, branch tabs, answer options, FAQ rows, the practice journey and a responsive branch explorer. Preserve editable text and native structure when creating a Design output; do not flatten a whole page into a screenshot. For a Code/Make output, produce the runnable responsive page.

Before finishing, verify: every branch tab; an incomplete MSQ answer; a correct answer; an extra-option answer; changing and replaying an answer; revision queue updates without duplicates; FAQ expansion; mobile menu open, close, Escape and anchor navigation; all real CTA destinations; keyboard focus; reduced motion; and no horizontal overflow at the specified widths. Do not connect the demo to a production database, send messages, charge payments, or publish the site as part of this design task.

## Current deliverables

- Editable desktop and mobile Design frames, original copy, brand tokens, typography, interactive components and native Figma prototype flows are in the linked file.
- Open the verified **Live landing · Interactive demo** Code layer at https://www.figma.com/design/gi28CtcdEtlOriHWINeZlp?node-id=35-138&autoplay-code-preview=35-138. Press **Play** if the preview is stopped. Its MSQ → concept → revision-queue flow and full replay/reset were verified inside Figma in Edge.
- The isolated runnable source is `output/landing-redesign/live/index.html`; it is a design prototype and does not replace the production Next.js landing page.
- The final live layer imports the isolated HTML prototype and is within the Design file. It is not a separately published Make website, and it does not change the production app.
- The local prototype passed Edge checks for incomplete and correct MSQ feedback, revision updates, branch switching, FAQ expansion and mobile navigation. Horizontal overflow was checked at 390 px and 320 px; the narrow-screen issue found at 320 px was corrected and rechecked. Main text/button contrast ratios were 7.71:1 for forest on white, 5.39:1 for muted text on white and 11.97:1 for ink on lime. JavaScript syntax passed.
