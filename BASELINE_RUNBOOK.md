# Baseline Verification and Recovery Runbook

*Phase 0 · 4 November 2026*

## Safe operating boundary

The current `.env.local` connects to the live Supabase project. Until an isolated database is ready, run only local/mock tests and read-only metadata inspection. Do not create students, start tests, submit responses, rate revision, apply migrations, reset databases, or send notifications as a smoke-test shortcut against that project.

Keep credentials and database row dumps out of Git. The baseline output directory is intentionally ignored.

## Repeating the local checks

Run from `C:/Users/ratho/Desktop/mock-test` in PowerShell. Use a new output directory for a later baseline so the original evidence remains available.

### Existing tests

```powershell
$baselineTestFiles = @(Get-ChildItem tests -Filter '*.test.cjs' | ForEach-Object { $_.FullName })
node --test --test-reporter=tap @baselineTestFiles
```

Expected reference result: 390 passing tests across the 63 files present at inspection time. A changed test count is not itself an error; inspect the actual differences and failures.

### TypeScript

```powershell
./node_modules/.bin/tsc.cmd --noEmit --incremental false
```

Disabling incremental output keeps this check from updating the shared TypeScript build-info file.

### Application-scoped lint

```powershell
./node_modules/.bin/eslint.cmd app components hooks lib types proxy.ts next.config.ts tailwind.config.ts
```

The reference baseline has 289 errors and 15 warnings. This is existing debt, not a target to preserve indefinitely. Do not suppress rules just to turn the command green. Generated `.next`, imported artifacts, and local evidence are outside this source-scoped invocation.

### Production build with an explicitly valid environment

The normal build currently loads an empty Supabase URL from `.env.production.local`. For this baseline, the following command loads valid `.env.local` values into a child build process without editing either file:

```powershell
node -e 'process.loadEnvFile(".env.local"); const {spawnSync}=require("child_process"); const result=spawnSync(process.execPath,["node_modules/next/dist/bin/next","build"],{stdio:"inherit",env:process.env});process.exit(result.status??1);'
```

Reference result: successful compilation/type checking and generation of 78 static entries. This workaround proves a build with valid inputs; it does not repair the invalid environment export or verify a deployed environment.

On this Windows host, the restricted shell initially denied SWC path canonicalisation. The successful run used the permitted unrestricted local-build execution. Do not mistake that host restriction for a compiler failure in application code.

Review environment repair separately: confirm the intended project, update only the relevant local export values, and rerun the normal build. Never populate a staging file with production secrets merely to make it start.

## Read-only schema reconciliation

Prefer the connected Supabase plugin for project discovery, migrations, and SQL metadata. Confirm the project reference before each operation. Queries in this baseline inspected `information_schema`/PostgreSQL catalogues, not student-table rows.

Captured evidence covers:

- Public columns and types.
- Public-table RLS flags and public/storage policies.
- Column privileges on profiles, questions, sessions, and answers.
- User-defined guard triggers on profiles/sessions/answers.
- Relevant constraints and applied migration versions.
- Supabase security-advisor findings.

Do not replay all local migrations against the live database: most local/live version timestamps differ, and a legacy daily-question migration does not have an exact applied-history match. Reconcile schema semantics in an isolated restore first.

## Isolated environment setup still required

1. Restore a functioning Docker engine, or select an explicitly approved independent test project. The installed Docker CLI/executable did not yield a running engine in this task; the CLI reported a missing Docker Desktop registry installation entry.
2. Keep the test project independent of `kygptxzyiyucpigzasat`. Do not use the other connected app's project.
3. Discover the installed CLI's current commands with `supabase --help` and the relevant subcommand help. The current CLI is 2.110.0; do not assume an older command layout.
4. Prepare a canonical schema snapshot from the reviewed live schema and migration history, excluding real student data and credentials. Review SQL before applying it to an empty isolated database.
5. Add synthetic fixtures: student A, student B, admin; at least two branches; MCQ/MSQ/NAT; accepted alternatives; marks-to-all; missing image/error states; completed, in-progress, and expired sessions; due/overdue revision.
6. Configure the local app explicitly for that environment. Verify the project host and environment boundary before performing any write-based browser check.
7. Test role/ownership/answer/timer restrictions as ordinary users, then run account creation, onboarding, submission, revision, and recovery checks.

Creating a paid cloud branch, accepting new service terms, or changing account security requires its own concrete decision. No such resource was created in this task.

## Local source and content recovery

Evidence and archives are under `output/phase0-baseline/`:

- `working-source-snapshot.zip`: eligible source/config/documentation files, including untracked source at snapshot time.
- `starting-tracked-changes.patch`: tracked changes relative to the recorded HEAD.
- `content-snapshot.zip`: paths under `data/` and `public/questions/`.
- `content-integrity.json` and `content-archive-verification.json`: all 5,039 archived files match their recorded hashes.

To rehearse recovery:

1. Create a fresh empty directory within the intended recovery workspace. Verify its absolute path before extraction.
2. Extract the source/content snapshots there; never overwrite the current working tree as a verification step.
3. Verify content hashes against the manifest and compare source files with the recorded source integrity information.
4. Supply independent test-only environment configuration, then run tests/typecheck/build there.
5. Record success before treating the snapshots as a rehearsed whole-app restore. Do not apply the working-tree patch blindly over files already restored from the source snapshot.

The content archive was fully decompressed and hash-verified in place. A complete fresh-app/database restore was not performed. Snapshots on the same disk protect against accidental local edits, but not disk loss.

## Database backup and restore verification

The read-only command discovered for this installed CLI is:

```powershell
supabase backups list --project-ref kygptxzyiyucpigzasat --output-format json
```

It returned 401 “Invalid access token” with the CLI's stored credential. Refresh the appropriate authorised CLI session or inspect backup status through an authorised dashboard. Do not copy connector credentials into files or print tokens.

Before any future data migration, establish backup recency, retention, covered components, and recovery procedure. Rehearse the restore only into the isolated target. Verify auth records and Storage objects separately rather than assuming a database backup includes all files. Never restore over the live project as a test.

## Behaviour rules and implementation handoff

Use `PLATFORM_BEHAVIOUR_CONTRACT.md` when implementing calendar, scoring, session, revision, and error-state fixes. Treat its rules as intended behaviour requiring tests, not as evidence that current code already complies.

The first implementation priority after isolation is the access/authoritative-write hardening identified in `PHASE_0_BASELINE_REPORT.md`. Content inventory can continue read-only. Premium tiers and payments remain outside scope.
