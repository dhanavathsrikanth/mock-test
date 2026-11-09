const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function loadMetrics() {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync("lib/test-metrics.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    { exports, Number, Math, Map, Set, Array, Object, String, Boolean },
  );
  return exports;
}

const metrics = loadMetrics();

const q = (id, extra = {}) => ({ id, marks: 1, negative_marks: 0, question_type: "MCQ", ...extra });
const a = (question_id, extra = {}) => ({ question_id, is_correct: null, ...extra });
const plain = value => JSON.parse(JSON.stringify(value));

test("correct rate includes skipped questions while attempt accuracy does not", () => {
  const summary = metrics.summarizeAttempts([
    { question: q("q1"), answer: a("q1", { selected_option: 1, is_correct: true }) },
    { question: q("q2"), answer: a("q2", { selected_option: 2, is_correct: true }) },
    { question: q("q3", { negative_marks: 1 / 3 }), answer: a("q3", { selected_option: 3, is_correct: false }) },
    { question: q("q4"), answer: a("q4") },
    { question: q("q5"), answer: null },
  ]);

  assert.equal(summary.stats.total, 5);
  assert.equal(summary.stats.graded, 5);
  assert.equal(summary.stats.attempted, 3);
  assert.equal(summary.stats.correct, 2);
  assert.equal(summary.stats.wrong, 1);
  assert.equal(summary.stats.skipped, 2);
  assert.equal(summary.stats.correctRate, 40);
  assert.equal(summary.stats.attemptAccuracy, 67);
  assert.equal(summary.stats.earnedMarks, 2);
  assert.equal(summary.stats.deductedMarks, 0.33);
  assert.equal(summary.stats.netMarks, 1.67);
  assert.equal(summary.stats.skippedMarks, 2);
});

test("marks-to-all receives full marks but is excluded from accuracy and skipped counts", () => {
  const summary = metrics.summarizeAttempts([
    { question: q("mta", { marks_to_all: true }), answer: a("mta") },
    { question: q("right"), answer: a("right", { selected_option: 1, is_correct: true }) },
    { question: q("wrong", { negative_marks: 1 / 3 }), answer: a("wrong", { selected_option: 2, is_correct: false }) },
  ]);

  assert.equal(summary.stats.total, 3);
  assert.equal(summary.stats.graded, 2);
  assert.equal(summary.stats.marksToAll, 1);
  assert.equal(summary.stats.attempted, 2);
  assert.equal(summary.stats.skipped, 0);
  assert.equal(summary.stats.correct, 1);
  assert.equal(summary.stats.correctRate, 50);
  assert.equal(summary.stats.attemptAccuracy, 50);
  assert.equal(summary.stats.earnedMarks, 2);
  assert.equal(summary.stats.maximumMarks, 3);
  assert.equal(summary.byType.MCQ.marksToAll, 1);
  assert.equal(summary.byType.MCQ.attemptAccuracy, 50);
});

test("MSQ and NAT responses are detected from their own response fields", () => {
  const summary = metrics.summarizeAttempts([
    { question: q("msq", { question_type: "MSQ" }), answer: a("msq", { selected_options: [1, 3], is_correct: true }) },
    { question: q("nat", { question_type: "NAT" }), answer: a("nat", { numeric_answer: "1.50", is_correct: false }) },
    { question: q("mcq"), answer: a("mcq", { selected_option: null }) },
  ]);

  assert.equal(summary.stats.attempted, 2);
  assert.equal(summary.stats.correct, 1);
  assert.equal(summary.stats.wrong, 1);
  assert.equal(summary.stats.skipped, 1);
  assert.equal(summary.byType.MSQ.attempted, 1);
  assert.equal(summary.byType.NAT.attempted, 1);
  assert.equal(summary.byType.MCQ.attempted, 0);
});

test("subject and topic groups use the same denominators and never exceed 100%", () => {
  const summary = metrics.summarizeAttempts([
    { question: q("1", { subject_id: "s1", topic_id: "t1", marks_to_all: true }), answer: a("1") },
    { question: q("2", { subject_id: "s1", topic_id: "t1" }), answer: a("2", { selected_option: 1, is_correct: true }) },
    { question: q("3", { subject_id: "s1", topic_id: "t1", negative_marks: 1 / 3 }), answer: a("3", { selected_option: 2, is_correct: false }) },
    { question: q("4", { subject_id: "s1", topic_id: "t1" }), answer: null },
  ], {
    subjectNames: { s1: "Algorithms" },
    topicNames: { t1: "Graphs" },
  });

  const subject = summary.bySubject[0];
  assert.equal(subject.name, "Algorithms");
  assert.equal(subject.total, 4);
  assert.equal(subject.graded, 3);
  assert.equal(subject.marksToAll, 1);
  assert.equal(subject.attempted, 2);
  assert.equal(subject.correctRate, 33);
  assert.equal(subject.attemptAccuracy, 50);
  assert.ok(subject.attemptAccuracy <= 100);

  assert.equal(summary.byTopic[0].name, "Graphs");
  assert.equal(summary.byTopic[0].subjectId, "s1");
  assert.deepEqual(plain(summary.topicCoverage), { mapped: 4, total: 4 });
});

test("net marks are not clamped at zero", () => {
  const summary = metrics.summarizeAttempts([
    { question: q("1", { negative_marks: 1 }), answer: a("1", { selected_option: 1, is_correct: false }) },
    { question: q("2", { negative_marks: 1 }), answer: a("2", { selected_option: 1, is_correct: false }) },
  ]);
  assert.equal(summary.stats.netMarks, -2);
  assert.equal(summary.stats.netMarkRate, -100);
});

test("aggregate rates are weighted by question counts, not averaged per test", () => {
  const large = Array.from({ length: 10 }, (_, index) => ({
    question: q(`large-${index}`, { subject_id: "s1" }),
    answer: a(`large-${index}`, { selected_option: 1, is_correct: index < 5 }),
  }));
  const small = Array.from({ length: 2 }, (_, index) => ({
    question: q(`small-${index}`, { subject_id: "s1" }),
    answer: a(`small-${index}`, { selected_option: 1, is_correct: true }),
  }));

  const combined = metrics.summarizeAttempts([...large, ...small]);
  assert.equal(combined.stats.correct, 7);
  assert.equal(combined.stats.graded, 12);
  assert.equal(combined.stats.correctRate, 58, "7/12 is 58%, not the 75% mean of 50% and 100%");
  assert.equal(combined.bySubject[0].correctRate, 58);
});

test("session timing distinguishes sprint active time, capped elapsed time, and unavailable history", () => {
  const sprint = metrics.sessionTiming({ mode: "sprint", sprint_active_seconds: 430 });
  assert.equal(sprint.available, true);
  assert.equal(sprint.kind, "active");
  assert.equal(sprint.seconds, 430);

  const capped = metrics.sessionTiming({
    mode: "full_paper",
    started_at: "2026-11-01T10:00:00.000Z",
    completed_at: "2026-11-01T14:00:00.000Z",
    duration_minutes: 180,
  });
  assert.equal(capped.available, true);
  assert.equal(capped.kind, "elapsed");
  assert.equal(capped.seconds, 10800);
  assert.equal(capped.capped, true);

  const untimed = metrics.sessionTiming({
    mode: "custom",
    started_at: "2026-11-01T10:00:00.000Z",
    completed_at: "2026-11-01T10:20:00.000Z",
    duration_minutes: 0,
  });
  assert.equal(untimed.seconds, 1200);
  assert.equal(untimed.capped, false);

  const missingSprint = metrics.sessionTiming({ mode: "sprint", sprint_active_seconds: null });
  assert.equal(missingSprint.available, false);
  assert.equal(missingSprint.seconds, null);
});

test("question sets use the persisted order and do not invent responses for missing rows", () => {
  const questionById = new Map([
    ["q1", q("q1")],
    ["q2", q("q2")],
  ]);
  const answerById = new Map([
    ["q1", a("q1", { selected_option: 1, is_correct: true })],
  ]);
  const result = metrics.recordsForQuestions(["q1", "q2", "missing"], questionById, answerById);
  const summary = metrics.summarizeAttempts(result.records);

  assert.deepEqual(plain(metrics.sessionQuestionIds({ question_ids: ["q2", "q1", "q2"] }, [])), ["q2", "q1"]);
  assert.equal(result.missingQuestionCount, 1);
  assert.equal(result.missingAnswerRows, 2);
  assert.equal(summary.stats.total, 3);
  assert.equal(summary.stats.skipped, 2);
  assert.equal(summary.stats.correct, 1);
});

test("the UI no longer presents exam readiness, cutoffs, or a GATE score forecast", () => {
  const resultPage = fs.readFileSync("app/(dashboard)/result/[sessionId]/page.tsx", "utf8");
  const analyticsPage = fs.readFileSync("app/(dashboard)/analytics/page.tsx", "utf8");
  const analyticsContent = fs.readFileSync("app/(dashboard)/analytics/analytics-content.tsx", "utf8");
  const all = `${resultPage}\n${analyticsPage}\n${analyticsContent}`;

  assert.doesNotMatch(all, /You're exam ready/i);
  assert.doesNotMatch(all, /Above Cutoff|Near Cutoff/i);
  assert.doesNotMatch(all, /GATE Score Forecast/i);
  assert.doesNotMatch(all, /projectedGateScore/i);
});

test("every student-facing score surface reads the shared metrics layer", () => {
  const surfaces = [
    "app/(dashboard)/result/[sessionId]/page.tsx",
    "app/(dashboard)/analytics/page.tsx",
    "app/(dashboard)/dashboard/page.tsx",
    "app/(dashboard)/recent-tests/page.tsx",
  ];
  for (const file of surfaces) {
    const source = fs.readFileSync(file, "utf8");
    assert.match(
      source,
      /from "@\/lib\/test-metrics"/,
      `${file} must compute metrics via lib/test-metrics`,
    );
    // Old formula: correct/total per session or averaged per-test percentages.
    assert.doesNotMatch(
      source,
      /correct \/ total\b/,
      `${file} still uses a local correct/total formula`,
    );
  }
});

test("aggregate averages are question-weighted, never per-test percentage averages", () => {
  const analytics = fs.readFileSync("app/(dashboard)/analytics/page.tsx", "utf8");
  const recent = fs.readFileSync("app/(dashboard)/recent-tests/page.tsx", "utf8");
  const dashboard = fs.readFileSync("app/(dashboard)/dashboard/page.tsx", "utf8");

  // Averaging per-test percentages would divide a sum of scores by a test count.
  for (const [name, source] of [["analytics", analytics], ["recent-tests", recent], ["dashboard", dashboard]]) {
    assert.doesNotMatch(
      source,
      /reduce\(\(sum[^)]*\)\s*=>\s*sum \+ [a-zA-Z.]*score[^)]*\)\s*\/\s*[a-zA-Z]*Tests/,
      `${name} averages per-test percentages`,
    );
  }
});

test("marks-to-all is excluded from admin accuracy denominators too", () => {
  const adminAnalytics = fs.readFileSync("app/(admin)/admin/analytics/page.tsx", "utf8");
  const adminUser = fs.readFileSync("app/(admin)/admin/users/[userId]/page.tsx", "utf8");

  assert.match(adminAnalytics, /marks_to_all/);
  assert.match(adminAnalytics, /isMarksToAll/);
  assert.match(adminUser, /marks_to_all/);
  assert.match(adminUser, /isMta/);
});

test("weak-topic practice links keep the chosen subject and topic", () => {
  const analyticsContent = fs.readFileSync("app/(dashboard)/analytics/analytics-content.tsx", "utf8");
  const selectForm = fs.readFileSync("app/(dashboard)/test/select/test-select-form.tsx", "utf8");

  assert.match(analyticsContent, /mode=topic_wise.*topic=\$\{encodeURIComponent\(topic\.id\)\}/);
  assert.match(selectForm, /initialSelection\.topic/);
});

test("pacing is unavailable until per-question time is genuinely recorded", () => {
  const summary = metrics.summarizeAttempts([
    { question: q("q1"), answer: a("q1", { selected_option: 1, is_correct: true }) },
    { question: q("q2"), answer: a("q2", { selected_option: 2, is_correct: false }) },
  ], { session: { duration_minutes: 10 } });

  assert.equal(summary.hasQuestionTiming, false);
  assert.equal(summary.pacing.available, false);
  assert.equal(summary.pacing.recorded, 0);
  assert.equal(summary.pacing.benchmark, null);
  assert.equal(summary.pacing.drift, null);
  assert.deepEqual(plain(summary.pacing.quadrants), {
    fastCorrect: 0, fastWrong: 0, slowCorrect: 0, slowWrong: 0, fastSkipped: 0, slowSkipped: 0,
  });
});

test("pacing uses the paper budget as benchmark and splits time into outcome quadrants", () => {
  const summary = metrics.summarizeAttempts([
    { question: q("fast-right"), answer: a("fast-right", { selected_option: 1, is_correct: true, time_spent_seconds: 10 }) },
    { question: q("fast-wrong"), answer: a("fast-wrong", { selected_option: 2, is_correct: false, time_spent_seconds: 20 }) },
    { question: q("mid"), answer: a("mid", { selected_option: 1, is_correct: true, time_spent_seconds: 40 }) },
    { question: q("slow-right"), answer: a("slow-right", { selected_option: 1, is_correct: true, time_spent_seconds: 90 }) },
    { question: q("slow-wrong"), answer: a("slow-wrong", { selected_option: 3, is_correct: false, time_spent_seconds: 120 }) },
    { question: q("skipped-late"), answer: a("skipped-late", { time_spent_seconds: 100 }) },
    { question: q("no-time") },
  ], { session: { duration_minutes: 5 } }); // 300s / 7 questions ≈ 43s benchmark

  const pacing = summary.pacing;
  assert.equal(pacing.available, true);
  assert.equal(summary.hasQuestionTiming, true);
  assert.equal(pacing.recorded, 6);
  assert.equal(pacing.total, 7);
  assert.deepEqual(plain(pacing.benchmark), { seconds: 43, kind: "limit" });
  assert.equal(pacing.totalSeconds, 380);
  assert.equal(pacing.meanSeconds, 63);
  assert.deepEqual(plain(pacing.quadrants), {
    fastCorrect: 2, fastWrong: 1, slowCorrect: 1, slowWrong: 1, fastSkipped: 0, slowSkipped: 1,
  });
  assert.deepEqual(plain(pacing.slowestWrong), [
    { questionId: "slow-wrong", index: 5, seconds: 120 },
    { questionId: "fast-wrong", index: 2, seconds: 20 },
  ]);
});

test("pacing falls back to the recorded median without a paper duration", () => {
  const summary = metrics.summarizeAttempts([
    { question: q("q1"), answer: a("q1", { selected_option: 1, is_correct: true, time_spent_seconds: 30 }) },
    { question: q("q2"), answer: a("q2", { selected_option: 1, is_correct: true, time_spent_seconds: 60 }) },
    { question: q("q3"), answer: a("q3", { selected_option: 2, is_correct: false, time_spent_seconds: 90 }) },
  ], { session: { duration_minutes: 0 } });

  const pacing = summary.pacing;
  assert.deepEqual(plain(pacing.benchmark), { seconds: 60, kind: "median" });
  assert.equal(pacing.medianSeconds, 60);
  assert.equal(pacing.meanSeconds, 60);
  assert.deepEqual(plain(pacing.quadrants), {
    fastCorrect: 2, fastWrong: 0, slowCorrect: 0, slowWrong: 1, fastSkipped: 0, slowSkipped: 0,
  });
});

test("pacing drift compares the first and final thirds of one paper only", () => {
  const records = [
    { question: q("q1"), answer: a("q1", { selected_option: 1, is_correct: true, time_spent_seconds: 20 }) },
    { question: q("q2"), answer: a("q2", { selected_option: 1, is_correct: true, time_spent_seconds: 20 }) },
    { question: q("q3"), answer: a("q3", { selected_option: 1, is_correct: true, time_spent_seconds: 20 }) },
    { question: q("q4"), answer: a("q4", { selected_option: 1, is_correct: true, time_spent_seconds: 40 }) },
    { question: q("q5"), answer: a("q5", { selected_option: 1, is_correct: true, time_spent_seconds: 40 }) },
    { question: q("q6"), answer: a("q6", { selected_option: 1, is_correct: true, time_spent_seconds: 40 }) },
  ];

  const withSession = metrics.summarizeAttempts(records, { session: { duration_minutes: 10 } });
  assert.deepEqual(plain(withSession.pacing.drift), {
    earlyMeanSeconds: 20,
    lateMeanSeconds: 40,
    percent: 100,
  });

  // Concatenated histories have no single paper order, so no drift is claimed.
  const aggregate = metrics.summarizeAttempts(records);
  assert.equal(aggregate.pacing.drift, null);
});

test("topic pace ranks timed topics by mean foreground time with honest accuracy", () => {
  const summary = metrics.summarizeAttempts([
    { question: q("g1", { topic_id: "t1", subject_id: "s1" }), answer: a("g1", { selected_option: 1, is_correct: true, time_spent_seconds: 100 }) },
    { question: q("g2", { topic_id: "t1", subject_id: "s1" }), answer: a("g2", { selected_option: 2, is_correct: false, time_spent_seconds: 30 }) },
    { question: q("g3", { topic_id: "t2", subject_id: "s1" }), answer: a("g3", { selected_option: 1, is_correct: true, time_spent_seconds: 10 }) },
    { question: q("g4"), answer: a("g4", { time_spent_seconds: 50 }) },
  ], { topicNames: { t1: "Graphs", t2: "DP" } });

  const pacing = summary.pacing;
  assert.equal(pacing.byTopic.length, 2);
  assert.equal(pacing.byTopic[0].id, "t1");
  assert.equal(pacing.byTopic[0].name, "Graphs");
  assert.equal(pacing.byTopic[0].questions, 2);
  assert.equal(pacing.byTopic[0].meanSeconds, 65);
  assert.equal(pacing.byTopic[0].correctRate, 50);
  assert.equal(pacing.byTopic[1].meanSeconds, 10);
});
