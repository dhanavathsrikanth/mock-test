# Smart-tagging layer

**Current version:** automatic syllabus mapping and answer-pattern feedback supersede the manual-only activation steps below. No tag-table migration or content backfill is needed for automatic diagnostics and concept practice. See [Automatic Smart Tagging](AUTOMATIC_SMART_TAGGING.md) for the current behaviour and release evidence. The remainder records the original optional editorial-tag design.

*Implemented locally on 5 November 2026. Free-platform scope; no payment or entitlement logic.*

## Student experience

- A concept breakdown appears directly below the marks card on completed results.
- The dashboard shows up to three weak concepts across the last three completed sessions in the selected exam and stream.
- A concept needs at least three answered attempts and a failure rate of at least 60% to qualify as a dashboard suggestion. Result breakdowns show the current session without this threshold.
- Each entry shows correct/incorrect counts and accuracy. Repeated attempts count once per session/question. Refreshing results cannot increase a counter.
- “Practise this concept” opens a preview, then starts a ten-minute session containing up to three reviewed questions for that exact concept, subject, exam and stream. Question types follow availability. Recent questions are deprioritised; repeated questions remain possible in a small pool. No unrelated questions fill a shortage.
- The normal test engine handles answering, grading, expiry, result review and existing revision enrolment. Unlike the separate five-question sprint, the concept-fix timer continues while the page is hidden.

## Meaning of the diagnosis

The application re-grades saved responses with the existing MCQ/MSQ/NAT grader. It does not trust a stored `is_correct` flag for concept statistics. Correct attempts are included in the denominator; skips and marks-to-all questions are excluded. Multi-concept question counts overlap.

A wrong answer is evidence that a concept deserves practice, not proof that the student misunderstood every attached concept. `common_error_triggers` are editor-labelled pitfalls on missed questions, displayed as things to check during answer review. We do not assert that a student missed a particular option because of a specific mental error.

Coverage is explicit: the interface reports how many answered questions have reviewed tags. Untagged questions still score normally. Insufficient evidence, unavailable queries, and a missing migration have different messages. Optional diagnostics cannot prevent the result page from displaying a saved score when their query fails.

## Storage and aggregation

`question_smart_tags` stores one reviewed/draft tag set per question:

| Field | Meaning |
| --- | --- |
| `question_id` | Existing question UUID, with a cascading foreign key |
| `core_concepts` | Up to eight human-readable concept labels |
| `common_error_triggers` | Up to eight possible pitfalls |
| `reviewed`, `review_note` | Explicit editorial approval and its evidence |
| `reviewed_by`, `updated_at` | Database-stamped reviewer and save time |

Labels are trimmed, whitespace-normalised and deduplicated case-insensitively. Concept identity includes the subject; the same label in another subject does not merge its counters. The database enforces tag bounds and requires a concept plus a review note before approval. Approved content edits/imports return affected tags to draft; editors must review again after changing a question.

The proposal's `user_error_logs` counters are implemented as **derived server-side counters**, rather than an independently mutable table. The source is completed owned sessions and their existing responses. This avoids duplicate logging, stale increment/decrement counters, and a new client-writable failure store. No submission hook, migration of student history or paid AI API is required. The current bounded window reads at most three sessions; it is not advertised as lifetime performance. Tag edits affect subsequent calculations for earlier sessions in that window.

Student-facing payloads contain counters and labels, not grading keys. Question retrieval and concept selection remain scoped to the current exam/stream. Legacy sessions without a persisted question list can use their saved answer IDs. Unexpectedly large or incomplete question sets produce an unavailable state instead of partial accuracy.

## Editorial workflow

Open **Admin → Questions Manager → Smart tags** (`/admin/questions/smart-tags`). Search by exact question UUID or a text fragment. Inspect the question and solution, add one label per line, and save a draft. Add a review note and check the review box to publish the tags to diagnostics. Editing a form clears its review checkbox.

Use precise reusable labels, for example “Topological sort”, rather than broad labels such as “Computer science”. Do not turn a question format into an invented concept diagnosis. In particular, MSQs require the existing exact-set grading rules; this feature does not introduce partial credit.

No invented tags or blanket approvals were written to the existing 2,730-question bank. Content managers must establish a reviewed initial pool. For a useful pilot, review at least three questions per chosen concept, including more than one variant where possible, before promoting it. We can expand coverage incrementally without restricting ordinary practice.

## Access and rollout

The server and RLS check existing `admin_profiles` membership for editing; `profiles.role` is not sufficient. Students can read reviewed sets, not drafts, and cannot insert/update/delete them. Anonymous access is not granted. Private trigger functions use invoker rights and a fixed empty search path. Existing database permission findings in `PHASE_0_BASELINE_REPORT.md` still require their separate integrity work; these changes do not certify all legacy content/session write paths as secure.

The CLI-generated migration is `supabase/migrations/20261105012708_smart_concept_diagnostics.sql`. It creates the tag table, policies and triggers, then adds the `concept_fix` session mode and its one-to-three-question/ten-minute shape constraint. Existing modes are retained. There is no backfill or deletion of student records.

The migration has been exercised against isolated PGlite PostgreSQL fixtures, **not applied to the hosted database**. Before release:

1. Reconcile migration history and verify backups/staging using `BASELINE_RUNBOOK.md`; do not blindly replay every local migration against production.
2. Apply this reviewed migration to the isolated full schema. Verify real PostgREST relationship filters, both admin/editor paths, and a complete concept-fix/result journey there.
3. Run database advisors and review grants/RLS, then populate a small reviewed content pool.
4. Apply the approved release migration and application deployment through the normal release process.

Before the migration, the added dashboard/result panels display a preparation message. The tagging editor reports that tagging is unavailable, and concept-fix creation returns a retry/support message without creating a partial session.

## Validation

All **456 tests passed**, including 14 smart-tagging checks. They cover counter thresholds, retries, subjects, NAT/MSQ grading, skips/MTA, tag bounds, RLS for drafts/writes, reviewer stamping, stale-review invalidation, legacy sessions, optional-query failures, paginated/scoped selection and session-shape constraints. TypeScript, focused lint and a production build also pass. Browser checks include the actual dashboard and saved result page's preparation states, plus desktop/mobile renders of populated cards using explicitly labelled sample data. A complete hosted database/concept-fix/result journey remains a staging release check.

Evidence and preview screenshots are under the ignored `output/smart-tags/` folder. The sample preview is not a production route, real student history or a database integration test.

Implementation references: [Supabase functions](https://supabase.com/docs/guides/database/functions) and [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
