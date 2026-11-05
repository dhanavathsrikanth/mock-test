# Phase 0 — Baseline Findings and Completion Record

*4 November 2026 · Free-platform enhancement programme*

## Outcome

We completed the available baseline audit and preserved the working tree and local content. The application passes its complete existing test suite and TypeScript checks, and its production build succeeds with valid environment values.

**Phase 0 is partially complete, not fully closed.** An isolated database and disposable integration accounts are not ready. Docker Desktop did not provide a running engine, and the Supabase CLI's stored management credential cannot list backups. We did not create a billable cloud branch, use the unrelated connected project, or run write-based browser tests against live student data.

No application source, environment files, database records, policies, migrations, or deployments were intentionally changed. The modifications in this task are baseline documentation and local evidence/backup files. We inspected the app through its existing authenticated browser session without starting tests, answering questions, rating revision, changing the selected branch, or changing account settings.

## Task status

| Task | Status | Evidence or remaining work |
| --- | --- | --- |
| B01: record starting state | Complete | Git state captured; production deployment inspected; database project and applied migration history identified |
| B02: reconcile schema sources | Complete for baseline | Live columns, RLS flags, policies, grants, relevant guard triggers, constraints, and migration history captured; drift documented below |
| B03: isolated data and recovery | Partial | Local source/content snapshots created; all content archive entries verified; isolated database, disposable accounts, and database restore rehearsal remain pending |
| B04: check baseline | Partial | All 390 existing tests pass; TypeScript passes; build passes with valid environment; lint findings recorded; limited read-only browser smoke checks completed; full write-based browser checks await isolation |
| B05: common behaviour | Complete as a specification | Defined in `PLATFORM_BEHAVIOUR_CONTRACT.md`; these intended rules are not a claim that current code implements them |

## 1. Starting state and environment inventory

- Workspace: `C:/Users/ratho/Desktop/mock-test`.
- Local HEAD: `c70f3177f04b42802749fad69afc90a35f300e30`, dated 31 October 2026, “Improve test-taking navigation and save feedback”.
- Latest inspected production deployment: `dpl_3q7D2szeyBEy6A8EHeA2wVzjvMn4`, state `READY`, targeting production and associated with the same commit.
- Verified production alias: [mocktestcivil.vercel.app](https://mocktestcivil.vercel.app). The browser smoke checks in this task used localhost, not this deployment.
- The working tree has additional modified and untracked application files, tests, and assets. Matching HEAD does not mean the working tree is deployed.
- Connected database: Supabase project `mocktest`, reference `kygptxzyiyucpigzasat`, region `us-east-1`, PostgreSQL 17.6, reported `ACTIVE_HEALTHY`.
- No development branches were returned for this project.
- `.env.local` points to that same database. It is not an isolated staging configuration.
- `.env.preview.local` and `.env.production.local` contain empty Supabase URL values. Their mere presence does not establish a working preview environment.
- No local service-role key was found among the inspected environment variable names. Secret values were not copied into this report or source snapshots.

### Installed/locked tooling

| Component | Version observed |
| --- | --- |
| Node.js | 24.18.0 |
| npm | 11.16.0 |
| Next.js | 16.2.9 |
| React | 19.2.7 |
| `@supabase/ssr` | 0.12.0 |
| `@supabase/supabase-js` | 2.108.2 |
| `eslint-config-next` | 15.3.1 |
| Supabase CLI package | 2.110.0 |
| Vercel CLI | 58.9.0 |

`next`, `@supabase/ssr`, and `@supabase/supabase-js` are declared as `latest` in `package.json`, although the lockfile supplies concrete versions. Next.js and its ESLint configuration are on different major versions. Record this as reproducibility/tooling debt; no package upgrade or lockfile change was made here.

## 2. Verification results

| Check | Result | Scope and qualification |
| --- | --- | --- |
| Existing tests | **390 passed, 0 failed** | 63 test files; final TAP result; approximately 129 seconds |
| TypeScript | **Passed** | `tsc --noEmit --incremental false` |
| Source-scoped ESLint | **Failed** | 220 files; 289 errors and 15 warnings; application/configuration sources only |
| Production build with existing production env file | **Failed** | Compiled and type-checked; prerender then rejected the empty Supabase URL |
| Production build with valid `.env.local` values injected into the child process | **Passed** | All 78 static-generation entries completed; no env file was edited |
| Content archive | **Passed** | 5,039 entries decompressed and checked against SHA-256 inventory; zero mismatches |
| Complete database restore rehearsal | **Not performed** | No isolated database ready and managed backup availability not verified |

The first restricted-shell build also encountered Windows path canonicalisation access denial. Repeating outside that restriction reached the actual build. That environment limitation is distinct from the empty-URL failure and from application compilation.

### Existing lint debt

The application-scoped lint findings are:

- 196 `no-explicit-any` errors.
- 85 `no-unused-vars` errors.
- Five unescaped-entity errors.
- One `prefer-const` error.
- One `no-require-imports` error.
- One Hooks-rule error: `useState` inside `renderConceptNode` in `app/(admin)/admin/concept-map/concept-map-client.tsx`, line 491 at inspection time.
- 15 warnings: dependency-array and image-element guidance.

The Hooks-rule finding warrants behavioural investigation before cosmetic lint cleanup. We did not disable rules or change unrelated application code to make this baseline appear clean.

The existing `npm run lint` script targets the whole directory. We used an explicit application/configuration scope to avoid generated builds and imported artifacts; this report does not claim that the unrestricted root lint command passes.

## 3. Live schema reconciliation

Read-only metadata queries found **34 public tables**, **289 public columns**, and **124 policies across public/storage**. All 34 public tables have RLS enabled. RLS being enabled is not by itself evidence that privileges or policies are sufficiently restrictive.

The live migration list contains 37 entries; the local migrations directory contains 14 files. Thirteen local migrations match live migration names. Only the latest marks-to-all migration has the same version timestamp in both lists; other name matches have different timestamps. Name matches do not prove byte-for-byte migration equivalence.

The local `20261027143423_exam_scoped_daily_questions.sql` has no exact live name/version match. Later stream-selection migration code also changes daily-question scoping, so absence of that migration name is not sufficient justification to replay the old file. Doing so could conflict with the later stream-level uniqueness model.

The recently added `20261103113957_gate_msq_marks_to_all` migration is present live.

`supabase_schema.sql` is an older snapshot with Clerk-era assumptions. It is not a complete, verified replay of today's database. Until we produce and restore-test a canonical schema, live metadata plus applied history is the baseline reference—not that file alone.

### Priority findings from metadata

These findings were established by inspecting grants/policies and relevant triggers, without attempting an exploit or modifying live rows.

| Priority | Finding | Required follow-up |
| --- | --- | --- |
| Critical | Signed-in users have UPDATE privilege on their own `profiles.role`; the owner-update policy does not exclude that column. Some administrative question-write policies trust this same role. No user-defined guard trigger was returned for profiles. | Move privilege hardening from T01 to the first implementation batch after isolation; make role/admin assignment exclusively trusted and verify ordinary users cannot promote themselves |
| High | Signed-in users have UPDATE privilege on their own answer correctness and session status/timestamps; inspected owner policies do not themselves enforce lifecycle or grading authority. No user-defined guards were returned for these tables. | Protect authoritative fields and completed/expired session writes at the database boundary; test with ordinary authenticated clients in isolation |
| High | The questions SELECT policy allows every signed-in user to read question rows, and column SELECT grants include answer data. Omitting keys from a page's props does not restrict direct database reads. | Review the presentation/key access model for test integrity; retain correct grading and submitted-review behaviour |
| Review | Supabase advisors returned warnings for callable SECURITY DEFINER functions and disabled leaked-password protection. | Review each function's intended access and account-security configuration; do not revoke or enable settings blindly |

**Order adjustment:** read-only content inventory may proceed, but isolate and verify these permission fixes before releasing new write workflows or treating the free beta as ready. This is protection of existing accounts and grading, not premium-access work.

## 4. Browser smoke checks

We used a separate temporary browser tab, preserving existing user-opened test tabs.

| Check | Observed result |
| --- | --- |
| Public homepage | Loaded with sign-in/sign-up and feature entry points |
| Sign-in link with an existing browser session | Resolved to the authenticated dashboard; this is not a fresh Google OAuth test |
| Dashboard | Loaded account-scoped history, streak, and revision widgets |
| Test selection | Listed CS source years 2021–2026 |
| CS1 2026 selection | Displayed 65 questions, 100 marks, 180 minutes; no test was started |
| Phone viewport | Test-selection controls remained usable at 390 × 844; no horizontal page overflow was found in that one measured view; viewport override was reset afterwards |
| Revision entry | Loaded a due MCQ without submitting a rating |

Observed follow-ups:

- Revision exposed raw `$...$`/`$$...$$` equation delimiters rather than using the common mathematical renderer for the inspected question.
- Revision displayed “1 / 1 reviewed” before the current question was rated; check progress semantics.
- The XP display showed 270 / 230 XP toward the next level; check whether the numerator and denominator use different level conventions.
- A local navigation initially timed out during compilation, then the revision page loaded. Record this as a development smoke-check limitation rather than a measured production performance result.
- Dashboard announcements still included older TGPSC launch wording; review active operational content before GATE-facing launch copy.

Fresh authentication, first-time onboarding, test creation/submission, offline recovery, multi-tab races, rating persistence, and scheduled reminder delivery were not exercised against live data. Those remain pending in the isolated environment.

## 5. Preservation and recovery evidence

Local evidence is under `output/phase0-baseline/`, which is ignored by Git.

| Artifact | Purpose |
| --- | --- |
| `starting-head.txt`, `starting-git-status.txt` | Starting commit and modified/untracked file inventory |
| `starting-tracked-changes.patch` | Tracked working-tree changes, preserved without resetting or staging |
| `working-source-snapshot.zip` | 319 source/configuration/documentation files at snapshot time, including eligible untracked source; excludes env files, Git internals, dependencies, generated builds, and the database row dump |
| `content-snapshot.zip` | 5,039 files from `data/` and `public/questions/`, approximately 285 MiB compressed |
| `content-integrity.json` | Paths, sizes, and SHA-256 hashes for the content snapshot |
| `content-archive-verification.json` | Verification result: all 5,039 entries match |
| `live-*.json`, `migration-reconciliation.json` | Schema/policy/grant/constraint and migration evidence; no student-table row export |
| `tests.tap`, `typecheck.log`, `eslint-application.json`, `build-valid-env.log` | Verification output |

These are local snapshots on the same disk, not an independent off-device backup. A live database backup, its retention, auth/storage coverage, and a restore rehearsal remain unverified. The old `full_database_dump.sql` must not be assumed to be current or safe to publish.

The backup-list command returned 401 “Invalid access token” from the CLI's stored credential. The connected Supabase plugin still works for the metadata inspected here. We did not overwrite credentials or initiate a restore.

See `BASELINE_RUNBOOK.md` for repeatable commands and the isolated restore procedure.

## 6. Remaining Phase 0 work

1. Restore a working local Docker engine, or identify an explicitly approved independent test database. Docker Desktop's CLI could not start its engine because its installation registry entry was unavailable; launching the installed executable did not produce a reachable engine in the subsequent check.
2. Reconcile/export a canonical schema and apply it only to that isolated database. Do not point local writes at the current live project.
3. Add disposable student A/student B/admin fixtures and synthetic question data; verify identity, ownership, grading, and recovery workflows there.
4. Refresh the Supabase CLI management login or inspect backup status through an authorised alternative, then verify an actual isolated restore path. Do not restore over live data.
5. Finish write-based browser integration checks and record the results. Keep B03 and B04 open until that evidence exists.

No premium or payment work is part of this remaining scope.
