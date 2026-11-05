# Automated revision loop

The dashboard and `/revision` use a persistent daily queue. Completed tests enroll
incorrect answers automatically; unattempted and Marks To All questions stay out.
New bookmarks and incorrect daily questions also enroll automatically. Existing
bookmarks and completed mistakes are backfilled without resetting active progress.

Stage 1 is due after 1 day. Successful reviews advance through 3, 7, 14, and 30-day
intervals. A successful Stage 5 review graduates the question. Any wrong revision
answer resets to Stage 1. Another test mistake resets an existing question too.
Bookmarking an active item preserves its progress; bookmarking a mastered item
restarts it at Stage 1.

Each exam/stream's queue is fixed when first surfaced that day. A student can be
assigned at most 20 questions in total across exams/streams per day. Lower stages
come first, then oldest due dates. Reloading resumes the same queue; completing
reviews does not refill it from the backlog. Deferred questions remain due for
future days. Days and scheduling consistently use Asia/Kolkata.

Reviews award 10 XP for “Solved it Easily” and 5 XP for “Got it Wrong / Confused”.
Completing a nonempty daily queue maintains the study streak, including a first
streak of 1. Saving the schedule, queue result, XP transaction, level, and streak
happens in one PostgreSQL transaction. Repeated submissions return the original
result without duplicate XP. Empty queues award nothing.

## Database installation

Apply `supabase/migrations/20261104161916_automated_revision_loop.sql` with the
normal Supabase migration deployment process before deploying the application.
This change has not been applied to a hosted project by this implementation.
The migration requires the existing schema and question-type migrations.

Daily manifests and privileged functions live in `revision_private`, which must
remain outside Supabase's exposed schemas. Authenticated users can call only the
three scoped public RPC wrappers. All functions use the authenticated identity;
direct client inserts and updates to `spaced_repetition` are revoked. Existing
admin deletion permissions and unrelated
database permissions and policies are retained.

## Verification

Run `npm run test:revision` after
`npm install`. Database tests use an isolated embedded PostgreSQL instance with
minimal application tables; they do not connect to a hosted database. Run the
normal TypeScript, lint, grading, stream-selection, and calculator checks too.
