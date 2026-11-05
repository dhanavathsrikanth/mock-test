# Automatic smart tagging

*5 November 2026 · Free platform enhancement*

## What a student gets

After a completed test, the result page automatically links answered questions to their existing syllabus concepts and shows correct/incorrect counts. The score streams independently while diagnostics load. No admin needs to tag those questions again.

The dashboard uses the last three completed sessions for the selected exam and stream. A repeated weak spot needs at least three attempts and at least 60% incorrect answers. Before that threshold, one recent missed concept can still produce a clearly labelled early practice suggestion. Three attempts are not the same as three sessions.

“Practise this concept” opens a preview and starts up to three matching questions with a ten-minute wall-clock limit. It prefers questions outside the last three completed sessions and reports shortages honestly. A question can repeat in a small pool. The normal test engine handles scoring and answer review; this uses existing `custom` sessions with persisted question IDs and needs no new session mode or column.

The dashboard also reports improving concepts when accuracy rises between the latest three and previous three completed sessions, provided the concept has at least three answered attempts in each window. It shows both attempt counts. This is observed practice progress, not a prediction of exam rank or a claim of mastery.

## Automatic mapping

The connected database was checked read-only: all **3,450 current questions** have a topic that belongs to the question's subject, spanning 767 topic nodes. These include the 2,730 GATE questions and the separate existing exam content. This establishes available mappings, not a fresh expert review of every classification or solution.

The engine uses the existing assigned topic, at its actual level of detail. It does not invent finer concepts from keywords or call a generative model. Stable topic UUIDs identify automatic concepts, so same-named nodes, subjects, branches, years and paper sessions do not collide. There is no ambiguous `Q34/year` lookup and no invented “General” fallback for missing metadata.

Optional editor-reviewed tags take precedence where available. Drafts do not publish their labels; automatic syllabus mapping still works. A missing editorial-tag table is nonfatal, and its absence is cached briefly to avoid repeated failed lookups. No student answers or diagnostics are held in that shared availability cache.

Mapping coverage and automatic versus editorial sources are visible in the interface. New imported questions participate automatically once their subject/topic assignments exist. Records with missing, inconsistent or unusable generic assignments remain outside concept coverage, while their normal scores are retained.

## Observable answer patterns

| Pattern | Evidence and useful next action |
| --- | --- |
| Incomplete MSQ selection | The submitted set is a strict subset of an accepted set. Check every statement independently. |
| Extra options in an MSQ | The submitted set contains an accepted set plus extra options. Look for counterexamples to selected statements. |
| MSQ selection mismatch | Both removing and adding options are necessary. Review the statements and worked solution. |
| NAT decimal precision | The response exceeds the permitted significant decimal places. Check the required precision. |
| Check the NAT sign | Flipping the submitted sign satisfies the actual accepted key. Recheck the sign convention and substitution. |
| NAT interval boundary | One exact permitted decimal step changes the response to an accepted value. Check the interval and intermediate rounding. |

Every accepted MSQ alternative, NAT range and precision rule is evaluated using the existing grader. Correct answers, skipped responses and marks-to-all do not produce mistake observations. A fixed tolerance such as `0.05` is not treated as evidence of a rounding error; decimal adjustments use exact integer arithmetic.

These are answer differences and prompts for review. They do not prove that a student misread a negation, used a particular wrong formula or misunderstood every concept in a multi-concept question. Behaviour occurrences remain separate from concept-accuracy denominators.

## Reliability and privacy

Counters are derived from completed owned sessions, including successes in the denominator. They are not incremented only on mistakes. A result refresh or repeated submit does not add an attempt, and current grading is recalculated from saved responses rather than a mutable correctness flag. Existing history benefits immediately; there is no rewrite or synthetic backfill of student answers.

The server reads at most six sessions (three for current suggestions, three for comparison), rejects incomplete/oversized sets instead of presenting partial accuracy, bounds REST question batches to 150 IDs, and gives optional diagnostics a shared ten-second query deadline. Grading keys and raw response data remain server-side; student components receive summaries.

Concept selection is revalidated on the server against the active exam, stream, subject and stable topic identifier. Request IDs make retries reuse the same owned session. Fixed custom sessions with missing questions do not silently shorten their timer; submission also refuses to grade a partial persisted question set.

No paid AI service, background worker, new counter table, payment check, notification or email is needed. Existing wider database permission findings remain separate work; this feature does not certify all legacy direct-write paths as secure.

## Verification and release

The complete working-tree suite passed **478 tests**, including automatic mapping, same-name topic identities, all accepted answer alternatives, precision boundaries, evidence thresholds, initial suggestions, comparison windows, user/stream scoping, retries and partial-question-set protection. TypeScript passed. Focused lint and production-build evidence are kept with the release artifacts.

Browser verification used the existing signed-in account and its saved responses against the real connected database. The dashboard mapped all six answered questions in its recent window, reported a concrete MSQ selection pattern, and opened a three-question preview for the matching syllabus concept. The saved result independently mapped all five answered questions and showed Graph Traversals, Hashing and Minimum Spanning Trees as missed concepts, plus an observable extra-option MSQ pattern. No answers, completed tests, XP or streak records were edited for this verification. Populated feedback is not sample data.

Release preparation uses the production baseline `c70f3177f04b42802749fad69afc90a35f300e30` plus the smart-tagging files and small integration patches. This avoids deploying unrelated unfinished checkout work, including challenge/payment changes. No environment files or database migrations are included. Evidence, file hashes, test/build logs, before-release deployment details and screenshots are under the ignored `output/smart-tags-automatic/` directory.

The optional `20261105012708_smart_concept_diagnostics.sql` migration is not required for automatic mode. Its original manual editor and dedicated session-mode design remain optional; applying it is not part of this rollout.
