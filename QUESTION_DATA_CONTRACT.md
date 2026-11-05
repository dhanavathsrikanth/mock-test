# Our Shared Question Data Contract

*Phase 1 · 4 November 2026*

## Purpose and scope

We use one vocabulary for questions across tests, review, bookmarks, daily practice, and revision. The executable starting point is `lib/question-contract.ts`, with response and grading rules in `lib/question-response.ts`.

The active-test page and client now use this presentation projection. Other study surfaces still have legacy query/display shapes; their migration is work for the relevant revision/daily/review phases. Defining the contract does not establish that those migrations are complete.

## Three distinct data boundaries

| Boundary | Required content | Access rule |
| --- | --- | --- |
| Presentation | ID, prompt, options in their original positions, question type, diagrams, input precision, marks, source year/paper/number, reviewed presentation flags | Appropriate for an active test |
| Grading | Correct choice/set alternatives, accepted numerical range(s), precision and marks-to-all policy | Trusted grading path; never included in the active-test presentation projection |
| Submitted review | Presentation plus accepted answer information and explanation | Ownership and completed/practice-state checks must be enforced before delivery |

`toQuestionPresentation()` is an explicit allowlist. It removes answer keys, solutions, original source records, and arbitrary nested metadata, including unknown fields attached to option-image objects. Option-image null slots remain in position so an image for option D cannot move into option B.

**Important boundary:** this projection reduces accidental page-payload disclosure; it does not repair broad direct database SELECT privileges. Phase 0's database permission findings remain open for T01/T02.

## Core fields

- `id`: stable database question identity. Source numbering is not a substitute for this ID.
- `question_text`: text/LaTeX/approved matching presentation consumed by the shared renderers.
- `question_type`: `MCQ`, `MSQ`, or `NAT`.
- `option_1`–`option_4`: positional text values. NAT has no selectable options; an empty label on an image-based choice does not mean the choice is missing.
- `option_images`: a positional array of image or null entries. Do not filter away nulls.
- Prompt image: URL with proportional display dimensions; option images remain separate from the prompt image.
- `marks`, `negative_marks`, `marks_to_all`: actual grading policy, including documented editorial practice exceptions.
- `answer_decimal_places`: an input instruction that may be visible while attempting NAT; it is not an accepted-answer range.
- `year`, `paper`, `source_question_number`: the source exam identity. GATE 2027 is the preparation target; it does not turn a 2021 paper into a 2027 source paper.

## Responses and accepted answers

| Type | Saved response | Accepted answer data |
| --- | --- | --- |
| MCQ | A single option index, or null | `correct_option`, or explicitly documented singleton alternatives in `correct_option_sets` |
| MSQ | A normalised set of option indices, or null | `correct_options`, or complete alternative sets in `correct_option_sets` |
| NAT | Validated decimal text, or null | Inclusive `answer_min`/`answer_max`, or disjoint `answer_ranges`, plus requested precision |

An MSQ with one correct option still uses MSQ interaction and exact-set grading. Multiple accepted alternatives do not mean arbitrary subsets earn credit. NAT ranges must preserve disjoint intervals rather than merge them into an invalid continuous range.

Transient NAT text such as a minus sign alone is not a valid saved numerical answer. Rounding input into an interval is not permitted. Marks-to-all and editorial replacements must retain their explicit policy and provenance.

## Provenance and editorial qualifications

Full provenance stays in trusted/admin/import records: source PDF identity/hash, original page and key, syllabus mapping, editorial difficulty estimates, original text/key, and the explanation for any replacement or inferred correction.

An edited practice question must not be advertised as an untouched official-paper replay. Keep the original and edited policies distinguishable. Some existing README/manifest claims are older than the actual records; the Phase 1 report lists examples requiring reconciliation.

Difficulty labels and syllabus grouping are editorial unless explicitly sourced otherwise. Source hashes establish which files were used; they do not establish reuse permission or prove mathematical correctness.

## Import compatibility

The audit supports older CE2 GA records that express penalties as a fraction and classifications as `area`/`primary_topic` inside metadata. It normalises those fields for comparison without rewriting the stored content.

Equivalent JSON object key ordering is ignored during comparison. Four EC explanation records differ only in CRLF/LF line endings; normalised equality was checked using their full text before classifying those as representation differences. Solution-section rendering now normalises line endings as well.

## Cross-surface acceptance checks

Before migrating another surface to this contract, verify:

- [ ] All advertised question types and accepted alternatives are supported.
- [ ] Mathematical text, matching layouts, prompt diagrams and positional option images render correctly.
- [ ] Active attempts omit grading keys and explanations.
- [ ] Submitted-review eligibility is checked before constructing the reviewed payload.
- [ ] Marks-to-all and editorial edits are displayed and graded according to their documented version.
- [ ] Missing content and failed requests remain distinguishable.
- [ ] Existing student responses/history remain intact.

Tests for the projection, positional images, NAT key omission, catalogue pagination, and line-ending rendering are in `tests/content-catalog.test.cjs`.
