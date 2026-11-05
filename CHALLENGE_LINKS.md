# Shareable challenge links

Finish a five-question sprint and choose **Challenge a classmate** on its result page. Native sharing, copy, WhatsApp and Telegram use the same `/c/ch_<random id>` URL. Creating again from the same completed sprint returns the same link.

The public landing page has dynamic OpenGraph and Twitter preview images, the creator's first name, score, time, and exact ordered five-question set. Full question snapshots, grading keys, creator answers, recovery tokens and entitlements live in `challenge_private`, outside the exposed Data API schema. Only allowlisted presentation fields reach the guest.

Guests start without authentication. The wall-clock timer starts on the server and continues across refresh, backgrounding and offline periods. Each answer and question position is saved synchronously on the device. Submission locks the client answers and commits an immutable temporary server copy before Google OAuth. The recovery capability travels in the page's URL fragment; answers never go in URLs or OAuth state. A private recovery link can reopen the saved submission in another browser and initiate a fresh Google login there if an in-app browser refuses OAuth. This does not claim cookies or PKCE verifiers survive switching browsers.

After Google authentication, the page claims the saved turn. The database locks the turn, validates ownership and expiry, grades the frozen questions, creates the completed sprint and its five answers in one transaction, and returns the same session on duplicate callbacks. Existing completion triggers enroll incorrect answers into revision. Storage is removed only after acknowledgement. Submission failures preserve the device draft and offer retry. Unclaimed finished payloads expire after 30 minutes; unfinished turns after 24 hours. Starting a turn cleans up at most 100 expired unclaimed turns. Completed responses persist.

The timer is a practice constraint, not a proctored anti-cheating system: delayed offline submissions are accepted within the unfinished-turn lifetime and charged the full duration. Comparison shows marks and time separately; it does not invent rank or error-trigger diagnoses. Shared missed question numbers come from actual grading.

## Database setup

Apply `supabase/migrations/20261105014126_shareable_challenge_links.sql` after the existing sprint, revision and smart-tag migrations, then apply `supabase/migrations/20261105020450_free_challenge_solutions.sql`. Both were created with `supabase migration new`. The initial migration adds a private schema, three RLS-enabled tables and narrowly granted RPC wrappers, with no anonymous access to question keys or table contents. The follow-up makes solutions free for the authenticated owner of a completed turn. Core challenges use the existing publishable key and Google Auth configuration; they do not require a service-role key. Private-schema security-definer functions are necessary to grade anonymous guest responses without exposing keys; wrappers use security invoker and privileged functions are not in an exposed schema.

Allow your deployed `/auth/callback` URL (including query parameters) in Supabase's redirect configuration. Verify Google login inside your target browsers. Deployment and hosted migration application are separate from the local implementation.

## Free solutions

Challenge comparison pages include all available text solutions for free after sign-in and submission. No pass, payment credentials or payment webhook is required. Guests can still start immediately, with Google sign-in used to save and view their completed results.

The purchase UI is removed and `/api/challenges/checkout` returns HTTP 410 without contacting a payment provider, even if old credentials remain configured. Existing payment records and the signed webhook handler remain for compatibility; they do not control access to solutions. Anonymous visitors and other accounts cannot retrieve a completed user's solutions. Existing review/revision access elsewhere in the app is preserved.

## Verification

```
node --test tests/challenges.test.mjs tests/challenge-ui.test.mjs tests/auth-callback.test.cjs
npx tsc --noEmit
npm run build
```

PGlite tests execute both migrations and real SQL calls under anonymous, authenticated and service roles. They cover grading parity with the existing GATE engine, frozen snapshots, free owner-only solutions without a pass, forged correctness flags, immutable submissions, duplicate callbacks, account isolation and expiry. UI tests exercise guest start, answer persistence, sign-in handoff and retry after failed submission. No live Google sign-in or real payment is performed by these tests.
