# Micro-practice sprints

The mobile dashboard puts a daily goal, a five-question sprint launcher, and
revision immediately below the welcome area. The bottom navigation has a Sprint
tab. The desktop sidebar also links to `/practice`; full mocks remain in Start
Test and the sprint launcher's “Have more time?” section.

GATE sprints sample exactly 3 MCQs, 1 MSQ, and 1 NAT. Other exams use 5 MCQs.
Filters are constrained to the authenticated student's selected exam/stream, with
subject, topic descendants, inclusive source-year range, and a 12- or 15-minute
timer. Source years default to the available part of 2021–2026. The recommended
subject is one with enough questions for the mix. Sparse selections explain the
missing types; they never silently borrow from another topic. Marks To All
questions are excluded. Session IDs make creation retries idempotent.

The separate sprint runner preserves the existing strict mock-test clock. A
sprint counts active time only and pauses when hidden or offline. Answers,
partial NAT entries, cleared selections, current question, and remaining seconds
are saved synchronously in localStorage on every edit/navigation and timer tick.
Storage keys are isolated by student/session, and restored snapshots must match
the original question IDs and start time. Unavailable device storage produces a
visible warning. Cloud saves are coalesced and retry on reconnect; online final
submission waits for the in-flight writer, then grades all restored answers on
the server. Successful submission clears the local draft. Failed submission
retains it. Students can pause and return via “Resume unfinished sprint”. Results
show active solving time, excluding interruptions, and offer another 5-Q sprint.

An already-loaded sprint continues during connectivity loss. Loading or reopening
the application and finishing a sprint require connectivity; this change does
not cache authenticated HTML or install a general offline application shell.
Sprint timing is intentionally recoverable practice timing, not a proctored exam
deadline. Full papers retain wall-clock expiry and cannot accept late responses.

Daily goal progress counts non-skipped answers in completed tests/sprints for the
selected exam/stream since midnight Asia/Kolkata. The count is queried directly
and is independent of the dashboard's history-row limit. Existing XP, streak,
grading, explanations, and automatic revision enrollment are reused.

Apply `supabase/migrations/20261104182931_micro_practice_sprints.sql` before
deployment, after earlier migrations. It adds the sprint mode, restricts sprint
snapshots to five questions and 12/15 minutes, and indexes resumable sessions.
This migration is applied to the connected `mocktest` Supabase project. Its local
version matches the hosted migration history; other environments still need it.

Run `npm run test:sprint` and the existing grading, stream-selection, calculator,
and revision tests, plus TypeScript and lint checks. PostgreSQL tests use the
isolated PGlite dev dependency.
