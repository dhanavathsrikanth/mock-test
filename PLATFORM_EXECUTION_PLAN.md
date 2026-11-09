# Our Free Platform Enhancement Execution Plan

*Prepared on 4 November 2026 · Planning only · No application changes authorised by this document*

## 1. Our current objective and scope

We will improve the complete free platform before introducing paid plans. Our immediate goal is a reliable, useful, mobile-first GATE practice and revision experience with desktop support.

This plan reconciles the four contributions in `PLATFORM_ENHANCEMENT_STRATEGY.md` with the current working-tree implementation. It supersedes their suggested order wherever they prioritise monetisation.

**We will not build premium tiers, entitlements, paywalls, paid trials, subscription records, checkout, payment gateways, coupons, or promotional upgrade messages in this phase.** Existing study features remain free. We will not add placeholder restrictions or a hidden premium architecture in anticipation of later decisions.

We will preserve existing accounts, completed tests, answers, bookmarks, revision records, XP, and streak history while making improvements. Any necessary data corrections must be explicit, reviewed, and recoverable.

Payments and plan-based upgrades are a separate future project, to be scoped after the free experience is validated. Our earlier question about grandfathering paid access is therefore no longer relevant to this phase.

## 2. What our review establishes

### Evidence and limits

We inspected the current source code, local content manifests and documentation, migrations, and selected existing tests. The working tree already contains application changes from other work; those changes are part of the inspected baseline and must not be reset or overwritten.

We ran six existing test files covering authentication callbacks, exam context, onboarding streams, test selection, grading, and notification access: **32 tests passed, 0 failed**. This is useful baseline evidence, not proof of production readiness or complete browser coverage.

We have not reconciled the live database with the local catalogue, inspected live database policies, verified production OAuth settings, or measured the site on real mobile devices in this review. Those checks appear below as tasks rather than completed claims.

### Implemented capabilities and actual gaps

| Area | What exists in the inspected implementation | What we need to improve or verify |
| --- | --- | --- |
| Accounts | Supabase Auth, Google sign-in, email/password sign-in | Deployed provider configuration; complete return journey through login and onboarding |
| Exam context | Saved exam and stream selection; scoped test queries | Real data coverage and switching across all relevant screens |
| Test selection | Full paper, subject, topic, custom, timed and untimed modes | Five-question sessions, optional duration choices, recovery and resume entry points |
| Question engine | MCQ, MSQ, NAT, mathematical text, diagrams, matching presentation | Consistent support across every study surface, not only tests |
| Grading | Server-side submission, accepted answer alternatives, NAT ranges and precision, marks-to-all | Database write restrictions, repeated/concurrent submissions, deadline consistency |
| Saving and timers | Backend answer saves, saved-answer restoration, wall-clock timer recalculation | Durable local drafts, explicit retry behaviour, interrupted-session recovery |
| Diagram viewing | Expandable native dialog, zoom buttons, fit-to-screen and scrolling | Option-image expansion, actual touch/pinch behaviour, focus restoration and device QA |
| Revision | Scheduling, due queue, self-rating, automatic wrong-answer queue request | Due retrieval currently filters to MCQ; full presentation metadata is missing; reliable completion effects and error states |
| Daily practice | Daily MCQ selection, answering, history, streak/XP interactions | Reliable branch/day assignments and documented MCQ scope; consistent day boundaries |
| Analytics | Score trends, subject summaries, time charts, focus suggestions | Definitions and source data: MSQ/NAT attempted counts, time recording, topic-level accuracy, pagination |
| Engagement | Streaks, XP, badges, notification preferences, push and cron routes | First-day/date correctness, idempotency, delivery consistency and scheduler authentication |
| Administration | Content imports, reports, user management and other operating screens | Repeatable release checks and accurate coverage reporting |
| Calculator/scratchpad | No dedicated implementation found in the inspected app/component paths | Calculator is planned work; scratchpad requires user validation before building |
| Offline experience | A push-notification service worker exists | This does not establish offline test support; do not advertise an offline mode |

### Local content inventory

We found **41 paper manifests** under the five target branches for 2021–2026:

| Branch | Manifest folders found | Local evidence |
| --- | --- | --- |
| Civil (CE) | 12 | CE1 and CE2 folders for 2021–2026 |
| Computer Science (CS/CSE) | 10 | Multiple-session folders where applicable, spanning 2021–2026 |
| Mechanical (ME) | 8 | ME1/ME2 in 2021–2022, single ME folders in 2023–2026 |
| Electrical (EE) | 6 | One EE folder for each year 2021–2026 |
| Electronics and Communication (EC) | 5 | Folders for 2021–2025; no EC 2026 paper folder found locally |

Manifest field names differ, so counting folders alone does not establish question totals or live completeness. Our first content milestone is a normalised inventory checked against the database. We should not yet advertise complete five-branch coverage through 2026.

## 3. How we reconcile the four strategy parts

| Conflicting or repeated proposal | Our decision for this phase |
| --- | --- |
| Expand to 2015–2026 versus launch with 2021–2026 | Verify and polish the recent-paper catalogue first; defer older-year expansion |
| One or two flagship branches versus five branches | Support verified existing coverage across all five; concentrate pilot support on the strongest branches if capacity is limited |
| Desktop-first full papers versus mobile-first platform | Make short practice and revision prominent on mobile; retain full-paper access on both devices |
| Build a diagram lightbox | Improve and test the one already implemented |
| Switch to MathJax or add Firestore for persistence | Retain KaTeX and Supabase; add only the missing recovery behaviour |
| Free years versus paid years; several prices and paywalls | No year restrictions, paid tiers, or pricing implementation now |
| Make SRS our main promise | Complete MSQ/NAT support and reliable scheduling before making a broad claim |
| Promote advanced time/topic analytics | Correct measurement and labels before relying on them in marketing |
| Offer premium rewards for shares or streaks | Defer; sharing can be voluntary and educational without upgrade rewards |
| Complete all enhancements immediately | Deliver the core in dependency order; validate optional scratchpad and reward ideas before building them |

## 4. Development order at a glance

| Phase | Deliverable | Dependency | Importance |
| --- | --- | --- | --- |
| 0 | Reproducible baseline and safe verification environment | None | P0 |
| 1 | Accurate content catalogue and question contract | Phase 0 | P0 |
| 2 | Reliable test saving, recovery, timing, and submission | Phases 0–1 | P0 |
| 3 | Complete revision for supported question types | Phases 1–2 | P0 |
| 4 | Trustworthy analytics, daily activity, and streaks | Phases 1–3 | P0 |
| 5 | Clear dashboard and short-practice journey | Phases 2–4 | P1 |
| 6 | Mobile presentation, performance, and calculator | Stable question/session contracts; phases 2–5 | P1 |
| 7 | Shareable practice and complete authentication return flow | Phases 1–2 and 5 | P1 |
| 8 | Reliable study reminders and operating tools | Phase 4; correct destinations from phase 7 | P1 |
| 9 | Free beta, release verification, and measured iteration | Core acceptance checks from phases 0–8 | P0 release gate |

P0 tasks protect correctness and student work. P1 tasks make the experience easier to use and operate. Optional enhancements are listed separately. These are relative priorities, not delivery-date promises.

## 5. Our ordered to-do backlog

All boxes below describe work still to be done. Existing code is credited in the baseline table, not treated as proof that these acceptance checks already pass.

### Phase 0 — Establish our baseline

**Purpose:** make development and verification repeatable before changing data or behaviour.

**Execution record, 4 November 2026:** see [Phase 0 Baseline Report](PHASE_0_BASELINE_REPORT.md), [Behaviour Contract](PLATFORM_BEHAVIOUR_CONTRACT.md), and [Baseline Runbook](BASELINE_RUNBOOK.md). B03 and B04 remain open because isolated database/browser integration and restore verification are not complete. Read-only findings also move the critical permission checks in T01/T02 ahead of other implementation work once isolation is ready.

- [x] **B01 — Record the starting state.** Identify current local changes, deployed revision, environment ownership, and the migrations applied in each environment. Keep unrelated work intact.
- [x] **B02 — Reconcile schema sources.** Inspect the actual schema and policies read-only. The local `supabase_schema.sql` contains older Clerk-era assumptions, so it must not be treated as an authoritative fresh-production setup. Document missing migrations, including the recent marks-to-all changes.
- [ ] **B03 — Prepare verification data and recovery.** Use an isolated development/staging environment with non-production student accounts. Confirm backups and a restore procedure for any future migration; preserve content manifests and original assets, which are currently under ignored directories.
- [ ] **B04 — Establish the check baseline.** Run the relevant complete local test set, TypeScript validation, lint, and production build in the proper environment. Separate pre-existing failures from new ones. Add browser checks for critical journeys that mocks do not cover.
- [x] **B05 — Define common behaviour.** Document the platform study-day timezone, attempt semantics, timer/deadline policy, data/error states, and what counts as meaningful study activity. Use Asia/Kolkata for the initial India-focused study-day policy unless product requirements change; store timestamps consistently.

**Done when:** we can reproduce the current app in staging, know which schema is authoritative, and have a recorded baseline of failures and passing checks.

### Phase 1 — Verify content and standardise question presentation

**Purpose:** ensure every later feature uses the same accurate question data.

**Execution record, 4 November 2026:** see [Phase 1 Content Report](PHASE_1_CONTENT_REPORT.md), [Paper Inventory](CONTENT_COVERAGE.md), [Question Contract](QUESTION_DATA_CONTRACT.md), and [Content Release Checklist](CONTENT_RELEASE_CHECKLIST.md). The current catalogue has 42 papers/2,730 questions and includes EC 2026. Software/inventory checks pass; C03 remains open for editorial-policy/documentation reconciliation. Reuse permission is unconfirmed, and Phase 0 isolation/restore work remains open.

- [x] **C01 — Build the paper-level coverage inventory.** For each branch/year/paper, compare manifest batches, actual questions, official source numbering, expected marks, source keys, diagrams, classifications, and explanations against the database. Check every session, not merely one paper per year.
- [x] **C02 — Resolve the EC 2026 gap.** Determine whether it exists elsewhere or in the live database; reconcile records and assets if present, or keep it visibly unavailable. Do not silently substitute another paper.
- [ ] **C03 — Review explanation and source quality.** Sample all question types and inspect flagged/source-discrepancy cases. Confirm complete worked explanations and distinguish editorial corrections from official keys. Investigate the older CSV before using it in the advertised catalogue.
- [x] **C04 — Record content-use status.** Maintain source and reuse records for text, diagrams, and explanations. Free access does not by itself settle reuse permissions; pursue clarification separately without blocking independent software improvements.
- [x] **C05 — Define a shared question contract.** Include MCQ/MSQ/NAT responses, accepted alternatives, NAT precision/ranges, marks-to-all, matching layouts, prompt images, option images, explanations, and source labels. Separate presentation data from answer-key data used by trusted grading and post-answer review.
- [x] **C06 — Publish accurate availability.** Make onboarding and test selection show available years/papers and distinguish unavailable content from loading failure. Add a content release checklist so a paper becomes advertised only after its records and assets pass verification.

**Done when:** a verified catalogue exists, gaps are visible, and tests, review, bookmarks, daily questions, and revision have an agreed data/presentation contract.

### Phase 2 — Protect test sessions and student work

**Purpose:** fix reliability before adding more ways to start tests.

> **Not covered by the analytics trust pass.** `ANALYTICS_TRUST_PASS.md` fixes how results are
> *presented*; T03/T04/T08 (save state, drafts, recovery verification) are the work that actually
> prevents a lost answer, and they remain open.

- [ ] **T01 — Audit ownership and grading boundaries.** Verify live database policies and write permissions for sessions, answers, profiles, and grading results. Users must not read another student's records, change their role, set their own correctness, alter authoritative timing, or modify completed answers through direct database requests.
- [ ] **T02 — Close review-before-submission paths.** The inspected review page checks ownership but has no explicit completed-state guard. Define when keys and explanations are visible in timed versus untimed sessions, then enforce that rule in server routes and the database/API access model. Preserve the active-test client payload's existing omission of keys.
- [ ] **T03 — Make save state accurate.** Track pending and failed saves across all questions; one successful request must not conceal a different failed save. Provide bounded retries and an understandable retry action.
- [ ] **T04 — Add recoverable drafts and reconciliation.** Persist answer changes and current position under account/session-specific keys. Restore safely after refresh or background eviction, reconcile with newer server records, isolate account changes, and handle unavailable storage. Do not cache private work indiscriminately in the service worker.
- [ ] **T05 — Make timing and question-count rules consistent.** Review the server/client grace-period differences and expiry handling. Investigate the test page's question-count adjustment, which can shorten a timed session if question retrieval is incomplete. A query failure or missing record must not silently turn a 180-minute paper into a shorter one.
- [ ] **T06 — Make completion reliable and repeatable.** Handle double submission, retries, and concurrent tabs. Move essential completion effects such as revision insertion and activity recording away from reliance on browser requests that can disappear during a redirect. Ensure retries do not award duplicate XP or create duplicate revision entries.
- [ ] **T07 — Add a clear resume journey.** Surface legitimate in-progress sessions on the dashboard/recent activity. Define explicit leave, accidental interruption, resume, expiry, and submit behaviour; do not pause an authoritative timed paper simply because the app is hidden.
- [ ] **T08 — Verify recovery end to end.** Test slow/offline saves, reload, backgrounding, session expiry, late return, two tabs, duplicate submission, and account switching across MCQ/MSQ/NAT. Keep recovery claims limited to behaviour we actually verify.

**Done when:** students can resume supported sessions without silent answer loss; scores and deadlines stay correct; completion effects occur once; keys are not exposed prematurely through the intended access paths.

### Phase 3 — Finish the revision system

**Purpose:** make our proposed main differentiator work for the complete question bank.

> **Not covered by the analytics trust pass.** R01's marks-to-all question is fixed on the
> *result* and *review* screens (MTA is shown separately, never as an ordinary mistake), but the
> revision queue itself is unchanged and R01–R06 remain open.

- [ ] **R01 — Extend revision beyond MCQ.** Replace the current MCQ-only retrieval and display assumptions with the shared contract for MSQ, NAT, matching questions, images, and accepted-answer alternatives. Define deliberate treatment of marks-to-all questions, rather than showing them as ordinary mistakes.
- [ ] **R02 — Clarify self-rating versus graded answering.** The existing revision page is a reveal-and-self-rate workflow. Preserve that distinction unless we explicitly add interactive answering; reuse the trusted grader wherever we do add graded responses. Never count self-rated recall as an exam score.
- [ ] **R03 — Make queue population deterministic.** Queue eligible wrong answers as part of the reliable completion workflow. Define bookmark-to-revision behaviour explicitly; bookmarking currently also requests SRS insertion. Verify retry and duplicate handling.
- [ ] **R04 — Use one due-date policy.** Align insertion, rescheduling, due counts, overdue counts, and date boundaries with the study-day policy. Test first review, correct, wrong, skipped, overdue, and repeated requests. Return the next review date clearly.
- [ ] **R05 — Distinguish error, empty, and complete.** A failed summary currently can appear as “All caught up.” Add proper loading/error/retry states, and make failed rating updates retryable instead of advancing as if saved.
- [ ] **R06 — Make progress useful.** Show due count, progress within the current batch, remaining questions beyond any batch limit, and a next action when finished. Preserve scheduling history across sessions and stream switching.

**Done when:** all advertised question types render correctly in revision, queue counts match retrieval, errors cannot masquerade as completion, and scheduling survives interrupted requests.

### Phase 4 — Correct analytics, daily activity, and streaks

**Purpose:** ensure students can trust the feedback before we promote advanced analysis.

- [x] **A01 — Define metrics precisely.** Separate marks, correct rate across all questions, accuracy among attempted questions, and activity. Decide whether aggregates are weighted by question or averaged per test; label them consistently. Exclude or explain marks-to-all cases where they distort accuracy. *(Done: `lib/test-metrics.ts` is the single definition source; aggregates are question-weighted; marks-to-all is excluded from both accuracy rates and shown separately in the marks ledger. See `ANALYTICS_TRUST_PASS.md`.)*
- [x] **A02 — Count every response type.** Analytics currently selects `selected_option` without the MSQ/NAT response fields and uses it to identify attempted answers. Align counts with the shared response semantics across results, dashboard, and analytics. *(Done: results, dashboard, recent-tests, review, analytics and both admin views read `selected_option`/`selected_options`/`numeric_answer` via the shared layer.)*
- [ ] **A03 — Validate timing measurements.** Locate or introduce the actual per-question time-recording path before using `time_spent_seconds` for claims. Distinguish elapsed session time from active study time. Do not fabricate historical per-question timings; label missing data and show appropriate fallbacks. *(Partial: elapsed vs active are now distinguished, missing timing is labelled unavailable, and no pacing charts render without real data — but **no code path writes `time_spent_seconds` yet**, so the recording path remains open.)*
- [ ] **A04 — Correct topic recommendations and query completeness.** The current “Weak Topics” list is derived from subject summaries. Either rename it or calculate actual topic-level data. Make practice links retain the chosen subject/topic and valid paper scope. Page or aggregate historical data so large histories do not silently truncate; sort weekly trends by actual dates. *(Partial: real topic-level aggregation, subject+topic-retaining practice links, chunked paginated fetches with explicit “Showing X of Y”, and timestamp sorting are done; verify behaviour on very large histories and confirm paper-scope retention.)*
- [ ] **A05 — Fix streak and day-boundary consistency.** Test the inspected first-activity path, which starts from zero, freeze-token semantics, missed days, daily answers, completed tests, and revision activity. Align dashboard/analytics with the authoritative streak model rather than computing incompatible versions. *(Partial: dashboard/analytics now read the `streaks` table and show “unavailable” on read failure; first-activity, freeze-token and day-boundary paths remain untested.)*
- [ ] **A06 — Verify daily practice and rewards.** Keep the initial daily feature explicitly MCQ-only unless we deliberately extend it. Verify one assignment per branch/day, no silent gaps or duplicates, owner-scoped answer retrieval, correct answer reveal, retry-safe XP, and consistent scheduled dates. Make all screens distinguish unavailable data from an empty history.

**Done when:** mixed MCQ/MSQ/NAT fixtures produce consistent metrics, timing labels match available data, daily activity follows one calendar policy, and reported streaks agree across screens.

### Phase 5 — Build the clear daily study journey

**Purpose:** make existing capabilities easy to use without adding a large new feature surface.

- [ ] **U01 — Prioritise dashboard actions.** Offer resume when relevant, due revision, and quick practice in a clear order. Keep summary stats available without giving every widget equal visual weight. Explain unavailable recommendations honestly.
- [ ] **U02 — Add five-question quick practice.** Offer five and ten questions with a clear count and adjustable timed/untimed choices. Update both client selection and server validation/duration handling; do not assume a UI change alone defines a valid session.
- [ ] **U03 — Preserve paper scope initially.** Current GATE subject/topic practice stays within one selected year and paper. Keep that rule explicit for the first enhancement release. Cross-year topic practice is a separate later choice requiring clear source labels, selection rules, and duration design.
- [ ] **U04 — Improve next actions.** After a test, link to incorrect-answer review, revision, bookmarked questions, and a valid focused practice selection. Avoid generic links that lose the chosen subject/topic.
- [ ] **U05 — Keep bookmarks and question reports dependable.** Verify all question formats, diagrams, explanation viewing, repeated clicks, failed writes, removal, and bookmarked-question practice. Preserve saved work when a question is corrected or temporarily withdrawn.

**Done when:** a new student can choose a valid practice session, finish it, understand the result, and return to a useful next activity without guessing where to go.

### Phase 6 — Complete mobile presentation and performance

**Purpose:** improve measured usability on phones while retaining desktop workflows.

- [ ] **M01 — Test representative layouts.** Cover approximately 360–430 px phone widths, landscape, desktop, larger text, and slow connections. Include long equations, matching tables, image choices, signed NAT answers, and the custom keypad. Resolve obstructed controls and full-page overflow.
- [ ] **M02 — Improve the existing diagram viewer.** Verify touch zoom expectations, scrolling/panning, close controls, focus restoration, and current-answer preservation. Give graphical choices a way to expand without accidentally selecting or deselecting an answer. Retain working zoom controls as an accessible fallback.
- [ ] **M03 — Profile before optimising.** Measure representative question, review, and analytics screens. Address oversized image transfers, unnecessary chart/client work, equation rendering cost, and layout shifts. Keep visible essential diagrams prompt; defer nonessential/off-screen content. Retain KaTeX unless evidence establishes a reason to change it.
- [ ] **M04 — Add and verify a scientific calculator.** Design functions against the required examination workflow, check licensing/branding before reuse, and test numerical behaviour and mobile panel placement. Keep the question and answer controls usable. Do not claim it is official or equivalent without verification.
- [ ] **M05 — Verify navigation and accessibility.** Cover keyboard use, visible focus, dialog behaviour, meaningful control names, touch targets, dark/light themes, and screen-reader status messages. Ensure the existing exit guard and image dialogs cooperate.

**Done when:** representative sessions are readable and usable on target devices, measured performance has no unresolved critical regressions, and calculator behaviour is checked. Set numerical performance targets after the baseline; do not invent passing scores.

### Phase 7 — Complete sharing and authentication return paths

**Purpose:** help new students reach the actual study content that brought them to the app.

- [ ] **S01 — Define stable question links.** Add a deliberate public preview or signed-in question destination. A session ID is private student work and must not become a public sharing identifier. Support missing, withdrawn, and corrected questions cleanly.
- [ ] **S02 — Preserve context across the full auth chain.** The callback already validates a local `next` destination, but login defaults to the dashboard and onboarding always redirects there. Carry a validated destination through both Google and email flows, callback errors/retries, and exam/stream selection. Never silently change a student's selected branch because they open a link.
- [ ] **S03 — Build minimal share previews.** Start with native sharing/copy-link and truthful question metadata. Add graphics only after ordinary links work. Keep private answers, emails, and student session data out of previews. Use content only within its reviewed reuse basis.
- [ ] **S04 — Verify incoming links.** Test signed-out, signed-in, newly onboarded, different-branch, and embedded-browser cases. Provide a supported-browser fallback where needed and verify that return URLs cannot leave the intended app.

**Done when:** a shared question link reliably reaches that question or a clear recovery path, with no leakage of another student's work and no lost onboarding context.

### Phase 8 — Make engagement and operations reliable

**Purpose:** support consistent practice without adding promotional monetisation machinery.

- [ ] **N01 — Reconcile notification delivery paths.** Existing modules use different subscription shapes and reminder paths. Establish one supported contract, verify current device registrations, and ensure preferences and quiet hours apply consistently.
- [ ] **N02 — Verify scheduled jobs in the real environment.** Check that the auth proxy does not redirect legitimate cron requests to login, and that cron endpoints require valid scheduler authentication rather than becoming open when a secret is missing. Test assignments and reminders without sending bulk messages to real users.
- [ ] **N03 — Add useful study reminders selectively.** Link to actual due revision or valid practice. Deduplicate retries, respect study-day boundaries and opt-outs, and distinguish successful delivery from attempted delivery. Defer discounts, sales messages, and premium rewards entirely.
- [ ] **N04 — Strengthen operating visibility.** Give administrators usable visibility into content gaps, broken assets, reports needing attention, failed scheduled jobs, and failed delivery. Define a repeatable correction and release process.
- [ ] **N05 — Measure a small free-use funnel.** Define question opened, meaningful answer saved, test completed, revision completed, shared-link opened, and return usage. Existing Vercel Analytics does not establish that these product events are recorded. Avoid storing answer content or unnecessary personal data in analytics; prefer server-confirmed events for saved/completed actions.

**Done when:** reminders follow preferences and useful destinations, scheduled work is authenticated and observable, and we can measure whether the free app is being used successfully.

### Phase 9 — Run a free beta and release carefully

**Purpose:** validate the complete experience with real students before expanding scope.

- [ ] **L01 — Run the release matrix below.** Combine behavioural browser tests with database/API permission checks; source-level tests and mocked clients alone cannot prove those boundaries.
- [ ] **L02 — Rehearse rollout and rollback.** Apply additive migrations in staging, verify compatibility with the current app, and record recovery steps. Release behind small feature flags where useful; these are operational rollout controls, not paid access controls. Never delete student history as a rollback shortcut.
- [ ] **L03 — Recruit a manageable free pilot.** Include users from the intended branches, both new and existing accounts, and varied device types. Start with a small group we can support closely, then expand based on results.
- [ ] **L04 — Observe actual study tasks.** Watch students start quick practice, recover an interruption, review a mistake, complete due revision, use a diagram/calculator, and open a shared link. Gather difficulty reports alongside completion/return metrics.
- [ ] **L05 — Fix critical failures before adding scope.** Prioritise lost answers, wrong grading, inaccessible questions, broken explanations, misleading metrics, and failed revision. Review support burden and operating costs as well as engagement.
- [ ] **L06 — Publish accurate product copy.** Describe verified coverage and functioning features. Avoid guaranteed outcomes, unsupported difficulty statistics, full-syllabus claims, or an offline claim. Explain data handling and provide a visible support/reporting route.

**Done when:** the free platform passes its critical journeys, pilot students can use it reliably, release operations are repeatable, and no known critical correctness or privacy issue remains unresolved.

## 6. Our release verification matrix

| Area | Required cases |
| --- | --- |
| Identity | Google/email sign-in, failed callback, expired auth, sign-out, account switching, safe return destinations |
| Scope | Correct exam/branch; no selection; empty branch; unavailable paper; stream switch; existing history |
| Questions | MCQ, MSQ, NAT, accepted alternatives, precision boundaries, marks-to-all, matching layouts, diagrams and image choices |
| Sessions | Timed/untimed; short/full paper; save failure; reload; background/return; concurrent tabs; expiry; duplicate submit; resume |
| Answer visibility | Active timed test versus submitted review; no direct read of another student's work; no editable correctness or session authority |
| Revision | All advertised types; due/overdue; self-rating semantics; failed update; retry; duplicates; batch limits; branch switch |
| Metrics | Mixed response types; skipped answers; missing time data; corrected questions; large history; timezone boundary; first-day streak |
| Sharing | Public/required-auth behaviour; new/existing user; wrong branch; missing question; embedded browser; no private session link |
| Notifications | Permission denied; opt-out; quiet hours; expired subscription; repeated cron request; missing scheduler secret |
| Devices | Phone portrait/landscape, desktop, touch and keyboard, larger text, light/dark themes, slow/intermittent network |
| Release | Migration compatibility, protected backup, asset availability, rollback and production smoke checks |

## 7. What we intentionally defer

- Premium/free access distinctions, paid-year restrictions, plans, payment gateways, subscriptions, checkout, coupons, and conversion campaigns.
- Premium rewards for sharing or streaks.
- Expansion to 2015–2020 before recent-paper verification is complete.
- A full video-solution library, native mobile apps, or a backend rewrite.
- Full offline tests and a broad PWA programme; local draft recovery is a narrower reliability feature.
- An advanced drawing scratchpad until student observation establishes its value; a small prototype may be evaluated after core mobile work.
- Bookmark folders, cross-year topic sessions, and advanced personalisation until the core free workflow is stable and pilot feedback establishes priority.
- Rank prediction or claims that practice statistics prove improved exam results.

## 8. How we will manage execution

We will complete one phase's acceptance checks before relying on it in later features. Content verification and source-rights clarification can continue alongside software work. After shared contracts are stable, diagram QA, auth-return work, and operating documentation can progress independently; they should not force a large rewrite of the test engine.

We will not assign fixed calendar dates until Phase 0 establishes the environment and Phase 1 establishes the catalogue gaps. Each implementation batch should identify its task IDs, files/data affected, meaningful tests, acceptance evidence, and recovery path.

Our first implementation batch should be **B01–B05**, followed by **C01–C06** and the highest-risk session tasks **T01–T06**. We should not start with a dashboard redesign, marketing graphics, or a calculator while answer recovery and revision correctness remain uncertain.

At the end of this project, we will have a verified free platform and evidence about what students value. Only then will we write a separate plan for paid upgrades and gateway integration. No existing student will be reclassified into a paid plan as part of the work described here.

## 9. Source references for implementation planning

| Finding | Current source locations |
| --- | --- |
| OAuth callback has a validated `next`, but onboarding returns to dashboard | `app/auth/callback/route.ts`, `app/auth/login/login-form.tsx`, `app/onboarding/actions.ts`, `lib/supabase/proxy.ts` |
| Paper-scoped selection, counts and duration rules | `app/(dashboard)/test/select/test-select-form.tsx`, `app/(dashboard)/test/select/actions.ts`, `lib/test-pool.ts`, `lib/test-catalog.ts` |
| Saving, timer, exit handling, client-triggered completion effects | `app/(dashboard)/test/[sessionId]/exam-client.tsx`, `exam-store.ts`, `actions.ts`, `page.tsx` |
| Trusted grading and answer semantics | `lib/question-response.ts`, `lib/marking.ts`, test submission actions |
| Existing diagram viewer and KaTeX renderer | `components/QuestionFigure.tsx`, `components/MathText.tsx`, `lib/renderMath.ts`, `app/globals.css` |
| MCQ-only due revision and incomplete failure states | `lib/srs.ts`, `app/api/srs/route.ts`, `app/(dashboard)/revision/page.tsx`, `components/revision/RevisionWidget.tsx` |
| Subject-derived weak topics and response/time metrics | `app/(dashboard)/analytics/page.tsx`, `analytics-content.tsx` |
| Daily questions, dates and rewards | `app/api/daily-question/route.ts`, `app/api/cron/daily-question/route.ts`, `lib/streak.ts`, `lib/xp.ts` |
| Notification routes and subscription formats | `lib/notifications/`, `lib/push.ts`, `app/api/cron/`, `public/sw.js`, `vercel.json` |
| Stale schema assumptions requiring reconciliation | `supabase_schema.sql`, `supabase/migrations/` |

For database access design and verification, consult the current official [Supabase row-level security guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) and [Storage access-control guidance](https://supabase.com/docs/guides/storage/security/access-control). Application-level filtering alone does not establish the live database policy.
