# Phase 1 — Content Verification and Availability

*4 November 2026 · Free-platform enhancements*

## Outcome

We audited the current local and live GATE catalogue and added factual availability information to onboarding and test selection. EC 2026 is now present; the Phase 0 gap is a historical finding, not the current state.

The catalogue contains **42 papers and 2,730 questions across CE, CS, ME, EE, and EC for 2021–2026**. Each paper has 65 distinct source question numbers and 100 marks. There are no missing explanations according to the nonempty/placeholder check.

All 2,730 records match the captured live records for audited prompt/options, key/marking fields, subject/topic mapping, explanation content, and image references after documented format normalisation. This establishes consistency with the prepared imports; it does not independently re-prove every solution or certify that edited practice versions are unchanged official papers.

## Coverage

| Branch | Papers | Questions | Years |
| --- | --- | --- | --- |
| Civil | 12 | 780 | 2021–2026 |
| Computer Science | 10 | 650 | 2021–2026 |
| Mechanical | 8 | 520 | 2021–2026 |
| Electrical | 6 | 390 | 2021–2026 |
| Electronics and Communication | 6 | 390 | 2021–2026 |

See `CONTENT_COVERAGE.md` for the complete paper-level table. Multiple sessions explain why a six-year archive contains more than six papers in some branches.

## Work completed

| Task | Status | Evidence |
| --- | --- | --- |
| C01: paper inventory | Complete for the captured catalogue | 42 manifests reconciled with 2,730 database records; all numbering/count/marks checks pass |
| C02: EC 2026 | Resolved | Local source/import artifacts and 65 live EC 2026 rows are present; this task did not import them |
| C03: explanation/source quality | Initial audit complete; editorial reconciliation remains open | 120 type-spanning sample checks; special-case review list and quality limitations recorded below |
| C04: source/use records | Ledger created; permissions unresolved | 83 source references covering 74 distinct source hashes, all matched to local files; reuse marked unconfirmed |
| C05: common question contract | Defined and adopted by the active-test payload | Typed presentation/grading/review boundary, explicit payload allowlist, and regression tests |
| C06: accurate availability | Implemented locally | Counts/years/papers shown on onboarding and test selection; empty scopes and request failures remain distinct |

No production database changes, migrations, content overwrites, new test sessions, account changes, deployments, paywalls, or payments were performed in this task.

## Audit method and evidence

The reusable audit is `tools/audit-content.mjs`. It reads local manifests/batches and separately captured read-only database/Storage metadata. It writes only audit evidence, never application or database content.

Checks include:

- Complete source numbering and mark totals per paper.
- Exact prompt, option and explanation hashes; structured key and numerical-rule comparisons.
- Accepted answer sets/ranges with semantic JSON object-key comparison.
- Existing subject/topic assignment and membership in the local question's declared hierarchy labels; the content-specific tests also exercise mapped syllabus leaves.
- Detection of inconsistent merged/import-batch copies.
- Source-file presence and recorded SHA-256 matching.
- Local diagram/option-image presence, positive display dimensions, available local mirror hash comparisons, and referenced Storage object presence.

**2,167 unique image references** passed the local/reference checks. Storage metadata contained 2,174 objects in the bucket; extra historical objects were not deleted. We did not re-download every remote image or claim new byte-for-byte verification of every served HTTP response.

Four EC explanations initially had different raw hashes: EC 2022 Q52, EC 2023 Q22/Q46, and EC 2024 Q56. Full-text comparison established that the only difference is CRLF versus LF. The raw differences are preserved in evidence; normalised equality is used for the audit, and solution rendering now handles both representations consistently.

Audit outputs are under `output/phase1-content/`: `audit.json`, `coverage.csv`, `live-*.json`, `storage-objects.json`, `representation-differences.json`, `solution-sample-checks.json`, and `source-rights-ledger.csv`. These files are ignored by Git and include answer-related metadata; do not expose them as public application assets.

## Quality findings and qualifications

### Explanation depth

All GATE records have nonempty explanation content, but that alone does not mean every explanation is detailed. The sample checks cover one question of every available type per paper: **120 samples**, all with source/key provenance and the existing reviewed flag. Two samples lack headed method/answer sections. Several early CE/CS papers contain explanations shorter than 150 characters.

Short explanations are not automatically wrong, particularly for direct verbal questions. We should assess them for sufficient reasoning before advertising uniform step-by-step depth. Existing content tests perform key checks, formula rendering, taxonomy checks, and many independent calculations; this audit is not a fresh expert mathematical review of all 2,730 solutions.

### Official paper versus edited practice

The audit identifies 55 questions for special-case review through marks-to-all, alternate answers/ranges, and explicit correction metadata. This list is a review aid rather than an exhaustive classifier of every possible editorial note.

Examples requiring clear source qualifications include:

- CE 2026 CE1 Q19: an edited practice version with ordinary marking, while its original question used marks-to-all.
- Several EC questions originally marked MTA have editorial practice replacements with ordinary grading.
- EE 2022 Q37: an inferred denominator correction documented in source metadata.
- EE 2026 Q58: current local/live data uses ordinary exact-answer practice grading at 20; its README still describes marks-to-all as retained. That documentation needs reconciliation with the intended approved policy.
- EE 2023 Q43 has documented replacement history in its paper notes and should be included in the editorial review even if a metadata-only detector misses it.

We did not choose a different grading policy or rewrite these records. **C03 remains open for reconciling stale descriptions and ensuring all edited versions are clearly identified across study surfaces.** Counts and import consistency are not a guarantee of an untouched official exam replay.

### Legacy CSV

The root `questions_dataset.csv` has **423 rows**: 148 labelled 2015 and 275 labelled 2023. It has **286 missing/placeholder explanations** and **47 repeated question-text entries** by exact text comparison. Its original source is not established by this file.

Live TSPSC content is a separate database inventory and must not be equated automatically with that CSV. We retained both; the release checklist places new CSV imports on hold until provenance and quality are resolved.

### Reuse status

The ledger marks all recorded source references **unconfirmed for reuse**, with no permission evidence established in this task. Source origin/hash verification does not establish copyright ownership, commercial permission, or a statutory exception. The platform remains free in this development phase, and external rights clarification remains separate from software correctness.

## Application changes

- Onboarding lists the current question count for each stream, explicitly labels empty streams, and shows the selected scope's source-paper count and actual year coverage.
- An onboarding error boundary offers retry rather than describing a failed query as no available questions.
- Test selection has an expandable year/paper inventory with question and mark totals. A selected GATE source with incomplete counts/numbering gets an explicit qualification; no new access restriction is introduced.
- Metadata queries page beyond 1,000 rows, isolate exam/stream/unstreamed scopes, omit text/keys, and propagate errors.
- `toQuestionPresentation()` now supplies the active-test page/client. It preserves positional image slots while excluding grading keys, explanation text and arbitrary import metadata.
- Solution sections normalise CRLF/LF before parsing headings.

The question projection does **not** fix the direct database permissions identified in Phase 0. Those remain priority security/integrity work once isolation is available.

## Verification

- **417 tests passed, 0 failed** on the final complete test run, including new catalogue/audit/contract checks and the current calculator regression test.
- TypeScript passed.
- Focused lint passed for the new/changed catalogue, contract, onboarding, selection and explanation modules. Existing unrelated lint debt is not claimed to be cleared.
- Production build passed using the valid process-local configuration from the Phase 0 runbook; no environment file was changed.
- Browser verification confirmed the CS paper list (10 papers/650 questions), the EC onboarding summary (6 papers/390 questions, 2021–2026), and the explicit empty-stream message. Dropdown changes were not submitted, so the saved selection remained unchanged.

One full-suite run caught a regression where a bare test-client fixture omitted `option_images`. Optional image access was restored, the regression passed, and the full suite was rerun successfully.

## Handoff

The software and inventory portion of Phase 1 is ready locally. Keep the editorial qualification work in C03 and the Phase 0 isolated-environment/restore tasks open. Before releasing new write behaviour, resolve the role/correctness/timer permission findings from T01/T02 in a verified isolated environment.

Further revision/daily/bookmark migrations to the common contract belong to their later phases. Premium plans, payments, and older-year expansion remain deferred.
