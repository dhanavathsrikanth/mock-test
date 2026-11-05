# Streak milestones

Payment integration and discount promotions are deferred. Messages celebrate 5- and 7-day study streaks and link to `/practice`. No checkout, coupon, paid pack, or entitlement is created.

## Activation

1. Review and apply `supabase/migrations/20261105011314_streak_campaigns.sql` to the target database. It adds preference fields, a consent audit, campaign configuration, queue, delivery leases, suppression records, and a streak trigger. Existing users remain opted out. Campaigns start disabled. There is no historical backfill.
2. Set `CRON_SECRET` to a random secret of at least 16 characters and configure the existing Supabase service credential. Set `STREAK_CAMPAIGNS_ENABLED=true` only when ready to process notifications. Never expose the service key or private secrets to the client.
3. Open `/admin/streak-campaigns`. Create a campaign for an exam and optionally one stream, then enable it. Only one enabled campaign can cover any given exam/stream. Admin access is enforced by the API.
4. Students opt in under Profile → notification settings → Streak milestones. They choose exactly one channel. Email and push must also be enabled in their channel settings. Default quiet hours are 21:00–08:00 India time; custom quiet hours override them.

The worker is `/api/cron/streak-campaigns` and requires `Authorization: Bearer <CRON_SECRET>`. `vercel.json` includes a daily 08:00 IST schedule, compatible with Hobby scheduling limits (actual invocation time may vary). Each call processes at most 100 jobs within a 40-second processing budget. It remains inert unless the global flag is true.

For timely retries and larger queues, configure an authenticated scheduler every five minutes. On Vercel Pro, change this route's cron expression to `*/5 * * * *`; on Hobby keep the daily cron and use an external scheduler if required. Daily scheduling alone does not honour minute-level retry delays and may leave backlog; jobs expire after 72 hours. Monitor pending/dead jobs in the admin page. Provider requests have timeouts and interrupted leases become reclaimable after two minutes.

## Email configuration

Set server-only values `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `CAMPAIGN_FROM_EMAIL` (verified sending domain), `CAMPAIGN_POSTAL_ADDRESS` (real sender postal address), and `CAMPAIGN_UNSUBSCRIBE_SECRET` (random, at least 32 characters). Optional `CAMPAIGN_SENDER_NAME` defaults to Exam Prep. Set `APP_URL` to the canonical HTTPS origin without a path/query/hash. Configure the verified domain's SPF/DKIM and DMARC through your sending provider before activation.

Register `/api/engagement/email-webhook` with Resend for `email.bounced` and `email.complained`; use its signing secret above. Invalid signatures are rejected. Those events suppress future milestone emails to the affected address. The provider must be configured before email delivery is considered ready. Delivery uses the authenticated user's verified email, not an email supplied by the client.

Email includes plain text, escaped HTML, a visible unsubscribe link, postal address, and one-click unsubscribe headers. GET `/unsubscribe` displays a confirmation form; only a signed POST updates consent. Unsubscribe disables all streak milestone channels. Keep the signing secret stable so previously sent unsubscribe links remain valid.

## Push configuration

Use `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, server-only `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (a valid `mailto:` or HTTPS contact), and `APP_URL`. Students must grant browser permission and have a saved push subscription. Expired subscriptions are skipped. Push delivery is at least once; stable notification tags collapse repeated visible notifications where supported.

## Delivery rules

- Trigger on a fresh streak crossing 5 or 7 days. If one update crosses both, enqueue only 7. Exam/stream come from the student's current profile. Banned accounts and missing consent are excluded.
- Deduplicate per student, campaign, and milestone, including after a streak resets. Disabling/re-enabling a campaign does not resend old milestones. Creating a new campaign is a new campaign identity.
- Recheck consent, channel, campaign, student scope, expiry, and streak before each attempt. No extra Google OAuth scopes are required.
- Reserve at most one distinct milestone contact per student per rolling 24 hours. Retries of the same job share that reservation. Quiet hours and missing configuration defer without consuming attempts.
- Database leases fence stale acknowledgements. In-app notifications use a stable ID with insert-only conflict handling. Email uses a stable provider idempotency key. An uncertain email older than 23 hours is marked dead for manual review rather than resent outside the provider's idempotency window. A provider send and database acknowledgement cannot be a single transaction.
- Retry transient delivery failures up to five attempts (1 minute, 5 minutes, 30 minutes, then 2 hours), subject to scheduler cadence. Permanent errors are dead/skipped. Never blindly recreate dead email jobs; check provider logs first.

## Verification

Run `npm run test:campaigns` for PostgreSQL migration/trigger/lease/RLS tests and mocked delivery, quiet-hour, consent, token, and validation checks. No real email or push is sent by these tests. Type-check with `npx tsc --noEmit`.
