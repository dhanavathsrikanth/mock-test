# Our Platform Behaviour Contract

*Phase 0 specification · 4 November 2026*

## Status

This is the intended behaviour for the free-platform enhancement work. It resolves the common rules needed by later tasks. Existing implementations may differ; the baseline report records those differences. Defining this contract does not migrate data or silently recalculate historical results.

## Identity and study scope

- The authenticated account determines ownership; request parameters never supply trusted user identity or administrative authority.
- The saved exam/stream determines the current study context. Opening a shared link must not silently overwrite it.
- Switching context does not delete tests, answers, bookmarks, revision records, XP, or streak history.
- Students can read their own historical work by switching to its relevant context. Withdrawal or correction of source content requires explicit handling rather than deletion of student history.
- All functionality in this enhancement phase is free. No field or UI state will reclassify an account into a paid tier.

## Calendar and activity

- Our initial study-day timezone is **Asia/Kolkata**. Day keys represent the local calendar date in that timezone; timestamps are stored consistently as absolute instants, normally UTC.
- First meaningful study activity starts a streak at one, not zero.
- A study day can qualify through a successfully completed test containing at least one actual response, a saved daily-question response, or a successfully saved revision rating representing a genuine review. Correctness is not required.
- Sign-in, opening a question, receiving a notification, starting an empty test, or clicking only “skip” does not qualify by itself.
- Multiple qualifying actions on one day do not increment the streak repeatedly. Retries do not create duplicate activity or rewards.
- Default freeze behaviour: one token may cover one missed calendar day. A gap containing more missing days than available tokens resets the current streak. Historic records are not rewritten until the old/new rule difference and any correction are reviewed.
- XP and general engagement streaks remain account-wide; subject/test metrics and revision retrieval retain their explicit exam/stream scope.
- Daily assignment, due/overdue revision, activity charts, reminders, and streaks must use the same study-day calculation.

## Questions, responses, and grading

- MCQ responses contain one valid selected choice; MSQ responses contain a normalised set; NAT responses retain validated decimal text.
- A missing/cleared response is skipped. Invalid transient NAT input is not silently treated as a valid numerical answer.
- Officially accepted alternatives, disjoint numerical ranges, precision instructions, and marks-to-all are preserved deliberately.
- Exam grading and authoritative correctness are calculated by trusted server/database code. A browser cannot set `is_correct`, award itself marks, or grant itself an admin role.
- For active timed tests, keys and explanations become available through the intended review path only after submission. Untimed sessions currently use explicit submission as well; any immediate-feedback practice mode must be a deliberate later design, not an accidental leak.
- Matching layouts and image-based choices are presentation formats that must not alter the underlying response/marking rules.

## Session timing and lifecycle

- Session states have explicit transitions: created/in-progress to completed, with a separately documented invalid/cancelled case if later introduced. Clients cannot arbitrarily change authoritative state or start time.
- A timed session ends at the server-recorded start plus its allowed duration. Backgrounding, refresh, calculator use, and diagram viewing do not pause it.
- At the deadline, editing stops. A short, documented transport-finalisation allowance may deliver already accepted work; it must not become extra solving time or allow trusting client timestamps. The current differing grace periods require reconciliation in T05.
- The server grades only the fixed question IDs for the session. A retrieval failure must not silently replace questions or shorten a full-paper timer.
- Deliberate leaving must offer a clear choice and explain its consequence. Accidental interruption must preserve recoverable work; the app must not claim that browser-close handlers always run.
- Repeat/concurrent submission returns the same completed outcome. Late arrivals cannot overwrite a completed result.
- Revision insertion, rewards, and qualifying activity follow successful completion reliably and are safe to retry.

## Saving and recovery

- Unsaved, saving, remotely saved, locally pending, and failed are distinct states. A local draft alone is not labelled remotely saved.
- Answer drafts and navigation position are scoped to account plus session. One account's browser draft must never appear in another account.
- Recovery reconciles versions with server records; it never silently replaces newer answers with older local work.
- Cleared browser storage, unavailable storage, expired auth, and disconnected networks have explicit recovery/error behaviour. Full offline test-taking is not promised by this contract.
- Recovering a draft cannot restart an expired timer or reopen a submitted test. Server-accepted history remains authoritative.

## Results and analytics

- **Net marks:** earned marks minus applicable deductions, using each question's marking rules.
- **Correct rate:** correct ordinarily graded questions divided by all ordinarily graded questions, including skipped questions. Marks-to-all cases are shown separately where needed to avoid claiming a demonstrated correct response.
- **Attempt accuracy:** correct attempted ordinarily graded questions divided by attempted ordinarily graded questions.
- Aggregate correct rate/accuracy should use the corresponding total counts. A mean of per-test percentages can still be shown, but must be labelled “average test correct rate” rather than substituted for question-weighted accuracy.
- NAT and MSQ attempts count through their actual response fields, not only the MCQ option field.
- Session elapsed time and foreground per-question active time are different metrics. Missing historical time data is labelled unavailable; it is not fabricated or represented as measured zero.
- “Weak subjects” uses subjects. “Weak topics” requires actual topic-level aggregation. Recommendations disclose limited evidence when the sample is small.
- Dates are sorted using actual time values rather than formatted labels.

## Revision

- All advertised question types must render with their formulas, diagrams, source labels, options, and accepted answers.
- Self-rated recall remains distinct from a newly graded test response. It must not silently inflate exam accuracy.
- Due counts and due retrieval share the same eligibility/calendar rules. A batch limit is explained and must not imply that additional due questions disappeared.
- A failed rating is not treated as successfully reviewed. Retry does not apply the interval change twice.
- Progress counts completed reviews; before the first successful review, completed progress is zero.

## Loading, errors, and notifications

- Loading, genuinely empty, unavailable, unauthorised, and failed are distinct states. A database error is not “All caught up,” zero history, or complete coverage.
- Recoverable failures offer a useful retry action and preserve the last confirmed work.
- Notification delivery follows recorded preferences, applicable permissions, quiet hours, timezone rules, and deduplication. Opening a page does not opt a user into marketing.
- Reminders lead to an available study destination. This phase adds no upgrade promotions, discount campaigns, or premium sharing rewards.
- Background/cron requests have their own verified authentication. They must not be redirected through browser login or become open because a secret is unset.

## Historical changes

Before changing a rule that affects historical scores, due dates, streaks, or rewards, document the current result, intended result, affected records, migration approach, and recovery method. Preserve source-key corrections and allow students to understand why a displayed result changed.
