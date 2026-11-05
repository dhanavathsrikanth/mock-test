# Our Content Release Checklist

*For the free platform; premium access and payments are outside this process.*

## Before a paper is advertised

- [ ] Record exam, branch, actual source year, paper/session, and the source organisation.
- [ ] Retain the question PDF and final key with source URL/origin, page references, and SHA-256 hashes.
- [ ] Record the reuse basis and permission evidence, or explicitly mark it unresolved. A download link or file hash is not permission evidence.
- [ ] Verify every expected question number and session; eliminate duplicate imports and conflicting batch copies.
- [ ] Compare all prepared questions, option positions, types, marking rules, accepted alternatives and explanations with the intended database rows.
- [ ] Check classifications against the appropriate branch's syllabus hierarchy.
- [ ] Check MCQ, MSQ, NAT, marks-to-all, numerical precision, and disjoint-range grading cases.
- [ ] Verify every prompt/choice image locally, preserve display proportions, and verify the referenced Storage object and actual served image.
- [ ] Review a sample of worked explanations across every available type; separately review every source discrepancy, inferred correction, or practice replacement.
- [ ] Label edited practice versions clearly; preserve original text/key and distinguish their score from an unmodified official replay.
- [ ] Align manifest, README, import scripts, batches, and release notes. A stale “all fields verified” note must not override a fresh audit finding.
- [ ] Exercise representative questions in the isolated test environment without using real students' sessions.
- [ ] Update the displayed availability from current records. Counts must not be described as a certification of correctness.
- [ ] Retain audit evidence, unresolved issues, and the correction/recovery procedure.

## Verification tools

`node tools/audit-content.mjs output/phase1-content` generates the local/live field comparison and CSV inventory using the snapshots in that directory. It performs no network requests, imports, or database writes.

The live snapshots must be refreshed read-only before a later audit. They contain hashes and grading/presentation metadata, not student records. Source/rights and audit results belong in local evidence or an appropriately protected operating store; do not publish answer-key snapshots accidentally.

## Correction handling

For a reported defect, record the source question, affected version, proposed correction, independent review, and expected impact on existing results. Preserve original records before any change. Apply migrations/data corrections only after isolation and backup checks are satisfied. Re-run related grading, rendering, and catalogue checks; update user-visible source notes when the change affects interpretation.

## Legacy CSV

The root `questions_dataset.csv` is not approved as a new import source until provenance, duplicate handling, and explanation quality are established. This is an operational hold on new imports, not deletion or withdrawal of existing students' data. The current Phase 1 report records its measured contents.
