# Analytics & Result Trust Pass

Scope: post-test surfaces — `result/[sessionId]`, `analytics`, `dashboard`, `recent-tests`,
`review/[sessionId]`, plus the admin accuracy views. Motivation: *"A wrong projected score or a
lost answer destroys willingness to pay instantly."*

Authoritative definitions live in `PLATFORM_BEHAVIOUR_CONTRACT.md` (§ Questions, responses, and
grading; § Results and analytics). This document records what the audit found, what was corrected,
and what is explicitly **not** solved by this pass.

---

## 1. Metric definitions (now enforced in one place)

All student-facing score surfaces compute through the shared pure layer `lib/test-metrics.ts`.
`tests/test-metrics.test.cjs` fails the build if a surface reintroduces a local formula.

| Metric | Definition |
| --- | --- |
| **Net marks** | Earned marks minus applicable deductions, per each question's marking rules. **Not clamped at zero** — a negative total is shown honestly with an explanatory note. |
| **Correct rate** | Correct ordinarily graded questions ÷ **all** ordinarily graded questions, including skipped. |
| **Attempt accuracy** | Correct attempted ordinarily graded questions ÷ attempted ordinarily graded questions. |
| **Marks-to-all (MTA)** | Receives full marks in the marks ledger, but is **excluded** from both accuracy denominators and from correct/skipped counts (it is not a demonstrated correct response, nor a mistake). |
| **Aggregate rates** | **Question-weighted** (sum of correct ÷ sum of graded). Per-test percentages are never averaged to produce an aggregate. |
| **Response detection** | MCQ `selected_option`, MSQ `selected_options`, NAT `numeric_answer` — each type read from its own field. |

Surface-by-surface:

- `result/[sessionId]` — correct rate **and** attempt accuracy shown as separate KPIs, marks ledger
  with unearned/skipped/MTA lines, negative-net note, data-caveats card, definitions card.
- `analytics` — practice-performance hero badged *"Practice metric · not an official score"*;
  question-weighted year/weekly/cumulative series; 8 explicit data caveats; *"What is not shown"* card.
- `dashboard` — `avgScore` = question-weighted correct rate (was: mean of per-test percentages);
  subject bars from `bySubject.correctRate` (was: `is_correct` over answer rows, MTA inflated).
- `recent-tests` — per-test score from `summarizeAttempts` (was: `correct / total_questions`);
  summary average is question-weighted (was: mean of per-test percentages).
- `review/[sessionId]` — correct/skip counts exclude MTA; an MTA badge is shown instead.
- `admin/analytics`, `admin/users/[userId]` — MTA excluded from accuracy denominators; skip
  detection uses all response fields (was: `selected_option` only, which miscounted MSQ/NAT).

### Removed or reworded claims

- ~~"GATE Score Forecast"~~, ~~"Above Cutoff" / "Near Cutoff"~~, ~~"You're exam ready"~~,
  `projectedGateScore` — removed. Replaced by practice net-mark rate with explicit
  *"not a prediction of your official GATE score or rank"* wording.
- ~~"official GATE criteria"~~ result framing and the wrong 2-guess equivalence copy — removed.
- Pacing zones / per-question speed figures — rendered only when `time_spent_seconds`
  is genuinely recorded (the exam player now writes foreground active time; sessions
  without records show an explicit unavailable state, never estimates).
- Session elapsed time is labelled wall-clock (idle included, capped) and is never presented as
  question-solving time.
- Test calendar relabelled **"Completed-test calendar"** (completed tests only, not all activity).
- Streaks read from the authoritative `streaks` table; if the read fails the UI shows
  *"Streak unavailable"* rather than deriving a number from test dates.
- Test history shows 20 rows at a time with an explicit *"Showing X of Y"* — no silent truncation.
- Weak topics come from real topic-level aggregation (≥3 graded questions required), distinct from
  weak subjects; low-evidence topics are disclosed as such.
- Weak-topic "Practice" links now retain subject **and** topic
  (`/test/select?mode=topic_wise&subject=…&topic=…`), and `TestSelectForm` honours the `topic` param.

---

## 2. Verification

```
node --test tests/test-metrics.test.cjs   # 13 pass
node --test tests/dashboard-ui.test.mjs   # 4 pass
node --test tests/test-select-ui.test.mjs # 1 pass
node --test tests/test-grading.test.cjs   # passes
npx tsc --noEmit                          # clean
npx next build                            # passes (needs a real NEXT_PUBLIC_SUPABASE_URL;
                                          # .env.production.local currently holds a placeholder)
```

Regression coverage in `tests/test-metrics.test.cjs`:

1. Correct rate includes skipped; attempt accuracy does not.
2. MTA: full marks, excluded from accuracy and skipped counts.
3. MSQ/NAT detected from their own response fields.
4. Subject/topic groups share denominators and never exceed 100%.
5. Net marks are not clamped at zero.
6. Aggregates are question-weighted, not per-test averages.
7. Timing distinguishes sprint active time, capped elapsed time, and unavailable history.
8. Question sets use persisted order; missing rows are not invented as answers.
9. UI contains no exam-readiness, cutoff, or GATE-score-forecast claims.
10. Every student-facing score surface imports `@/lib/test-metrics` and has no local
    `correct / total` formula.
11. No per-test percentage averaging in analytics / recent-tests / dashboard.
12. Admin accuracy excludes marks-to-all too.
13. Weak-topic practice links keep subject and topic.

---

## 3. Explicitly NOT solved by this pass

These remain open in `PLATFORM_EXECUTION_PLAN.md`. This pass must not be read as closing them,
and no screen claims otherwise.

**Phase 2 — session integrity (T-series)**

- **T03 — Save state accuracy.** Pending/failed saves are still not tracked per question.
- **T04 — Recoverable drafts.** No durable client-side draft + reconciliation.
- **T08 — Recovery verification.** No end-to-end proof of slow/offline saves, reload, backgrounding,
  expiry, two tabs, or account switching. **A lost answer is still possible**; the trust pass only
  ensures we never *present* uncertain data as certain (missing rows are counted as skipped and
  disclosed via data caveats).
- Also open: T01, T02, T05, T06, T07.

**Timing data (part of A03 / T-series)**

- `time_spent_seconds` now has a write path: the exam player accrues foreground
  visible time per question and flushes it on navigation, tab hide, a 20s interval,
  and before submit (`app/(dashboard)/test/[sessionId]/exam-client.tsx`). Only
  `summarizePacing` in `lib/test-metrics.ts` derives pacing from it — benchmark is
  the paper's even budget (duration ÷ questions) or the recorded median, and
  sessions without records stay unavailable. Still open: the 5-Q sprint player
  (`components/practice/SprintClient.tsx`) does not write per-question time, so
  sprint results show pacing as unavailable; and `pagehide` flushes are best-effort
  (bounded by the 20s interval), matching the contract's "browser-close handlers
  are not always run" rule.

**Phase 3 — revision coverage (R-series)**

- **R01–R06 all open**: revision remains MCQ-centric, reveal/self-rate semantics, queue
  determinism, single due-date policy, error/empty/complete distinction, and progress reporting.
- The result screen's MTA treatment is fixed, but revision's treatment of MTA (R01) is not.

**Phase 4 — remaining analytics work**

- **A03** partially addressed: elapsed vs active are distinguished and missing timing is labelled,
  but the *recording path* for per-question time does not exist yet.
- **A04** partially addressed: real topic-level weak topics, timestamp sorting, and paginated
  history are done; practice-link retention is done. Large-history aggregation still fetches in
  chunks (500/50/100) — bounded, but not a permanent fix for very large accounts.
- **A05** partially addressed: streaks now read the authoritative record on analytics and dashboard.
  Freeze-token semantics, day-boundary, and first-activity paths are still untested.
- **A06** open: daily practice XP/retry/date verification and unavailable-vs-empty states.

**Historical data honesty**

- Sessions created before `question_ids` persistence are reconstructed from answer rows. The
  analytics page discloses that unanswered questions may be missing from those records; the
  disclosed denominator is what is actually counted.

---

## 4. Review checklist for future metric changes

1. Change `lib/test-metrics.ts` first — never a page-local formula.
2. Add a case to `tests/test-metrics.test.cjs`.
3. If the change affects historical scores, follow § Historical changes in the contract
   (document current result, intended result, affected records, migration, recovery).
4. Any number shown without its measurement source must be labelled with its source or marked
   unavailable — never inferred.
