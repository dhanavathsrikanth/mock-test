/**
 * Shared, pure test-result metrics.
 *
 * These definitions implement PLATFORM_BEHAVIOUR_CONTRACT.md:
 * - correct rate counts every ordinarily graded question, including skipped;
 * - attempt accuracy counts only attempted ordinarily graded questions;
 * - marks-to-all is awarded full marks but excluded from both accuracy measures;
 * - net marks are earned minus applicable deductions and are never clamped at zero;
 * - session elapsed time and per-question active time remain distinct.
 *
 * No database or React code belongs here so both the result screen and the
 * aggregate analytics screen use exactly the same rules.
 */

export type QuestionType = "MCQ" | "MSQ" | "NAT";

export interface MetricsQuestion {
  id: string;
  marks?: number | string | null;
  negative_marks?: number | string | null;
  marks_to_all?: boolean | null;
  question_type?: string | null;
  subject_id?: string | null;
  topic_id?: string | null;
}

export interface MetricsAnswer {
  question_id: string;
  selected_option?: number | null;
  selected_options?: number[] | null;
  numeric_answer?: string | null;
  is_correct?: boolean | null;
  time_spent_seconds?: number | null;
}

export interface MetricsSession {
  id?: string | null;
  mode?: string | null;
  total_questions?: number | null;
  question_ids?: string[] | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_minutes?: number | null;
  sprint_active_seconds?: number | null;
}

export interface AttemptRecord {
  question: MetricsQuestion;
  answer: MetricsAnswer | null;
}

export interface QuestionStats {
  /** Every question in the loaded set, including marks-to-all and skipped. */
  total: number;
  /** Ordinarily graded questions (total minus marks-to-all). */
  graded: number;
  /** Questions with a saved response (correct + wrong + ungraded). */
  attempted: number;
  /** Attempts whose correctness is known (correct + wrong). */
  gradedAttempts: number;
  correct: number;
  wrong: number;
  skipped: number;
  ungraded: number;
  marksToAll: number;
  earnedMarks: number;
  deductedMarks: number;
  netMarks: number;
  maximumMarks: number;
  /** Positive marks that were available on questions left unanswered. */
  skippedMarks: number;
  /** Correct divided by every ordinarily graded question, including skipped. */
  correctRate: number | null;
  /** Correct divided by attempted questions whose correctness is known. */
  attemptAccuracy: number | null;
  /** Net marks divided by the loaded maximum. Can be negative. */
  netMarkRate: number | null;
}

export interface GroupStats extends QuestionStats {
  id: string;
  name: string;
  /** Present for topic groups. */
  subjectId?: string | null;
}

export interface TestSummary {
  stats: QuestionStats;
  byType: Record<QuestionType, QuestionStats>;
  byTier: Record<"1" | "2", QuestionStats>;
  bySubject: GroupStats[];
  byTopic: GroupStats[];
  timing: SessionTiming;
  hasQuestionTiming: boolean;
  pacing: PacingSummary;
  topicCoverage: { mapped: number; total: number };
  missingAnswerRows: number;
}

/** How the quick/slow split benchmark was obtained. */
export type PaceBenchmarkKind = "limit" | "median";

export interface PaceQuadrantCounts {
  /** At or under the benchmark and graded correct. */
  fastCorrect: number;
  /** At or under the benchmark but graded wrong — guessing or a shaky foundation. */
  fastWrong: number;
  /** Over the benchmark but graded correct — knows it, but too slowly. */
  slowCorrect: number;
  /** Over the benchmark and graded wrong — priority revision. */
  slowWrong: number;
  /** At or under the benchmark, left unanswered. */
  fastSkipped: number;
  /** Over the benchmark, left unanswered. */
  slowSkipped: number;
}

export interface SlowestWrongItem {
  questionId: string;
  /** 1-based position of the question in the loaded paper order. */
  index: number;
  seconds: number;
}

export interface TopicPaceItem {
  id: string;
  name: string;
  subjectId: string | null;
  /** Timed questions recorded for this topic. */
  questions: number;
  meanSeconds: number;
  /** Correct rate over just the timed questions of this topic. */
  correctRate: number | null;
}

export interface PaceDrift {
  earlyMeanSeconds: number | null;
  lateMeanSeconds: number | null;
  /** Change in mean time from the first third to the final third; positive = slower late. */
  percent: number | null;
}

/**
 * Foreground per-question active time analysis. Every figure is derived from
 * genuinely recorded `time_spent_seconds` values; when none exist the summary
 * is unavailable rather than estimated. Session elapsed time is a different
 * metric and is never mixed into these numbers.
 */
export interface PacingSummary {
  available: boolean;
  /** Questions with a recorded active time greater than zero. */
  recorded: number;
  /** Every question in the loaded set, timed or not. */
  total: number;
  medianSeconds: number | null;
  meanSeconds: number | null;
  totalSeconds: number;
  /** Split point between "quick" and "slow"; null only when nothing is recorded. */
  benchmark: { seconds: number; kind: PaceBenchmarkKind } | null;
  quadrants: PaceQuadrantCounts;
  /** Most time spent on questions graded wrong, longest first. */
  slowestWrong: SlowestWrongItem[];
  /** Single-paper pacing drift; null when no session context is supplied. */
  drift: PaceDrift | null;
  byTopic: TopicPaceItem[];
}

export type TimingKind = "active" | "elapsed" | "unavailable";

export interface SessionTiming {
  available: boolean;
  seconds: number | null;
  kind: TimingKind;
  label: string;
  note: string;
  /** True when wall-clock time exceeded the paper duration and was capped. */
  capped: boolean;
}

function finiteNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function questionMarks(question: MetricsQuestion) {
  const positive = finiteNumber(question.marks, 1);
  const negative = finiteNumber(question.negative_marks, 0);
  return {
    positive: positive > 0 ? positive : 1,
    negative: negative > 0 ? negative : 0,
  };
}

export function questionType(question: MetricsQuestion): QuestionType {
  const value = String(question.question_type ?? "MCQ").toUpperCase();
  return value === "MSQ" || value === "NAT" ? value : "MCQ";
}

export function marksTier(question: MetricsQuestion): 1 | 2 {
  return questionMarks(question).positive === 2 ? 2 : 1;
}

/** A cleared response is skipped; every response field is accepted. */
export function hasStoredResponse(answer: MetricsAnswer | null | undefined): boolean {
  if (!answer) return false;
  if (typeof answer.numeric_answer === "string" && answer.numeric_answer.trim().length > 0) return true;
  if (Array.isArray(answer.selected_options) && answer.selected_options.length > 0) return true;
  return answer.selected_option != null;
}

function percent(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : null;
}

function roundMarks(value: number): number {
  return Math.round(value * 100) / 100;
}

function emptyStats(): QuestionStats {
  return {
    total: 0,
    graded: 0,
    attempted: 0,
    gradedAttempts: 0,
    correct: 0,
    wrong: 0,
    skipped: 0,
    ungraded: 0,
    marksToAll: 0,
    earnedMarks: 0,
    deductedMarks: 0,
    netMarks: 0,
    maximumMarks: 0,
    skippedMarks: 0,
    correctRate: null,
    attemptAccuracy: null,
    netMarkRate: null,
  };
}

function finalize(stats: QuestionStats): QuestionStats {
  const earnedMarks = roundMarks(stats.earnedMarks);
  const deductedMarks = roundMarks(stats.deductedMarks);
  const maximumMarks = roundMarks(stats.maximumMarks);
  const netMarks = roundMarks(earnedMarks - deductedMarks);
  return {
    ...stats,
    earnedMarks,
    deductedMarks,
    netMarks,
    maximumMarks,
    skippedMarks: roundMarks(stats.skippedMarks),
    correctRate: percent(stats.correct, stats.graded),
    attemptAccuracy: percent(stats.correct, stats.gradedAttempts),
    netMarkRate: maximumMarks > 0 ? Math.round((netMarks / maximumMarks) * 100) : null,
  };
}

function addQuestion(stats: QuestionStats, question: MetricsQuestion, answer: MetricsAnswer | null) {
  const { positive, negative } = questionMarks(question);
  stats.total += 1;
  stats.maximumMarks += positive;

  if (question.marks_to_all) {
    stats.marksToAll += 1;
    stats.earnedMarks += positive;
    return;
  }

  stats.graded += 1;

  if (!hasStoredResponse(answer)) {
    stats.skipped += 1;
    stats.skippedMarks += positive;
    return;
  }

  stats.attempted += 1;
  if (answer?.is_correct === true) {
    stats.gradedAttempts += 1;
    stats.correct += 1;
    stats.earnedMarks += positive;
  } else if (answer?.is_correct === false) {
    stats.gradedAttempts += 1;
    stats.wrong += 1;
    stats.deductedMarks += negative;
  } else {
    // A saved response without a trusted correctness result is not silently
    // relabelled as skipped or correct.
    stats.ungraded += 1;
  }
}

function addGroup(groups: Map<string, QuestionStats>, id: string, question: MetricsQuestion, answer: MetricsAnswer | null) {
  if (!groups.has(id)) groups.set(id, emptyStats());
  addQuestion(groups.get(id)!, question, answer);
}

function toGroups(groups: Map<string, QuestionStats>, names: Map<string, string>, subjectIds?: Map<string, string>): GroupStats[] {
  return Array.from(groups.entries())
    .map(([id, stats]) => ({
      id,
      name: names.get(id) || (id === "unclassified" ? "Unclassified" : id),
      subjectId: subjectIds?.get(id) ?? null,
      ...finalize(stats),
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

/**
 * Summarise an arbitrary set of question attempts. Passing every session's
 * records produces question-weighted aggregates rather than a mean of
 * per-test percentages.
 */
export function summarizeAttempts(
  records: AttemptRecord[],
  options: {
    session?: MetricsSession;
    subjectNames?: Map<string, string> | Record<string, string>;
    topicNames?: Map<string, string> | Record<string, string>;
  } = {},
): TestSummary {
  const overall = emptyStats();
  const types: Record<QuestionType, QuestionStats> = {
    MCQ: emptyStats(),
    MSQ: emptyStats(),
    NAT: emptyStats(),
  };
  const tiers: Record<"1" | "2", QuestionStats> = {
    "1": emptyStats(),
    "2": emptyStats(),
  };
  const subjects = new Map<string, QuestionStats>();
  const topics = new Map<string, QuestionStats>();
  const topicSubjects = new Map<string, string>();
  const subjectNames = options.subjectNames instanceof Map ? options.subjectNames : new Map(Object.entries(options.subjectNames || {}));
  const topicNames = options.topicNames instanceof Map ? options.topicNames : new Map(Object.entries(options.topicNames || {}));
  let topicMapped = 0;

  for (const record of records) {
    const { question, answer } = record;
    addQuestion(overall, question, answer);
    addQuestion(types[questionType(question)], question, answer);
    addQuestion(tiers[String(marksTier(question)) as "1" | "2"], question, answer);

    const subjectId = question.subject_id || "unclassified";
    addGroup(subjects, subjectId, question, answer);

    if (question.topic_id) {
      topicMapped += 1;
      topicSubjects.set(question.topic_id, subjectId);
      addGroup(topics, question.topic_id, question, answer);
    }
  }

  return {
    stats: finalize(overall),
    byType: {
      MCQ: finalize(types.MCQ),
      MSQ: finalize(types.MSQ),
      NAT: finalize(types.NAT),
    },
    byTier: {
      "1": finalize(tiers["1"]),
      "2": finalize(tiers["2"]),
    },
    bySubject: toGroups(subjects, subjectNames),
    byTopic: toGroups(topics, topicNames, topicSubjects),
    timing: sessionTiming(options.session),
    hasQuestionTiming: records.some(record => {
      const seconds = Number(record.answer?.time_spent_seconds);
      return Number.isFinite(seconds) && seconds > 0;
    }),
    pacing: summarizePacing(records, options),
    topicCoverage: { mapped: topicMapped, total: records.length },
    missingAnswerRows: records.filter(record => record.answer == null).length,
  };
}

export function unavailableTiming(label = "Session time"): SessionTiming {
  return {
    available: false,
    seconds: null,
    kind: "unavailable",
    label,
    note: "No trustworthy timing was recorded for this session.",
    capped: false,
  };
}

/**
 * Sprint time is foreground active time. Other sessions expose wall-clock
 * elapsed time, capped at the paper duration when a late submission would
 * otherwise imply extra solving time.
 */
export function sessionTiming(session: MetricsSession | null | undefined): SessionTiming {
  if (!session) return unavailableTiming();

  if (String(session.mode ?? "").toLowerCase() === "sprint") {
    if (session.sprint_active_seconds == null) return unavailableTiming("Sprint active time");
    const active = Number(session.sprint_active_seconds);
    if (!Number.isFinite(active) || active < 0) {
      return unavailableTiming("Sprint active time");
    }
    return {
      available: true,
      seconds: Math.round(active),
      kind: "active",
      label: "Sprint active time",
      note: "Foreground time while the sprint timer was running; background time is excluded.",
      capped: false,
    };
  }

  const startedAt = Date.parse(session.started_at || "");
  const completedAt = Date.parse(session.completed_at || "");
  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt < startedAt) {
    return unavailableTiming();
  }

  const rawSeconds = Math.floor((completedAt - startedAt) / 1000);
  const durationMinutes = finiteNumber(session.duration_minutes, 0);
  const limit = durationMinutes > 0 ? Math.round(durationMinutes * 60) : null;
  const capped = limit != null && rawSeconds > limit;
  const seconds = limit != null ? Math.min(rawSeconds, limit) : rawSeconds;

  return {
    available: true,
    seconds,
    kind: "elapsed",
    label: limit != null ? "Session time" : "Time on task",
    note: capped
      ? "Wall-clock time capped at the paper duration; idle time is included."
      : limit != null
        ? "Wall-clock time from start to submission; idle time is included."
        : "Wall-clock time from start to submission for an untimed test.",
    capped,
  };
}

export function sessionQuestionIds(session: MetricsSession, answers: MetricsAnswer[]): string[] {
  const declared = Array.isArray(session.question_ids) ? session.question_ids.filter(Boolean) : [];
  if (declared.length > 0) return [...new Set(declared)];
  return [...new Set(answers.map(answer => answer.question_id).filter(Boolean))];
}

function emptyPacing(total: number): PacingSummary {
  return {
    available: false,
    recorded: 0,
    total,
    medianSeconds: null,
    meanSeconds: null,
    totalSeconds: 0,
    benchmark: null,
    quadrants: { fastCorrect: 0, fastWrong: 0, slowCorrect: 0, slowWrong: 0, fastSkipped: 0, slowSkipped: 0 },
    slowestWrong: [],
    drift: null,
    byTopic: [],
  };
}

function meanOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function medianOf(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

/**
 * Per-question active-time analysis from genuinely recorded values only.
 *
 * The quick/slow benchmark is the paper's own even budget (duration ÷ loaded
 * questions) when the session has a duration, and the recorded median
 * otherwise. Quadrants count only questions whose timing was recorded;
 * responses without a trusted grading result stay out of the quadrants but
 * remain in the totals. Drift compares the first and final thirds of one
 * paper and is only produced when a session is supplied, so concatenated
 * histories never fake a paper order.
 */
export function summarizePacing(
  records: AttemptRecord[],
  options: {
    session?: MetricsSession | null;
    topicNames?: Map<string, string> | Record<string, string>;
  } = {},
): PacingSummary {
  const total = records.length;
  const timed: { record: AttemptRecord; index: number; questionId: string; seconds: number }[] = [];
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    const seconds = Math.round(Number(record.answer?.time_spent_seconds));
    if (!Number.isFinite(seconds) || seconds <= 0) continue;
    timed.push({ record, index: index + 1, questionId: record.question.id, seconds });
  }
  if (timed.length === 0) return emptyPacing(total);

  const sortedSeconds = timed.map(item => item.seconds).sort((a, b) => a - b);
  const medianSeconds = medianOf(sortedSeconds);
  const meanSeconds = meanOf(sortedSeconds);
  const totalSeconds = sortedSeconds.reduce((sum, value) => sum + value, 0);

  const durationMinutes = finiteNumber(options.session?.duration_minutes, 0);
  const budget = durationMinutes > 0 && total > 0 ? Math.round((durationMinutes * 60) / total) : null;
  const benchmark: PacingSummary["benchmark"] =
    budget != null && budget > 0
      ? { seconds: budget, kind: "limit" }
      : medianSeconds != null
        ? { seconds: medianSeconds, kind: "median" }
        : null;

  const quadrants: PaceQuadrantCounts = {
    fastCorrect: 0,
    fastWrong: 0,
    slowCorrect: 0,
    slowWrong: 0,
    fastSkipped: 0,
    slowSkipped: 0,
  };
  const slowestWrong: SlowestWrongItem[] = [];
  for (const item of timed) {
    const fast = benchmark != null && item.seconds <= benchmark.seconds;
    const answer = item.record.answer;
    if (!hasStoredResponse(answer)) {
      if (fast) quadrants.fastSkipped += 1;
      else quadrants.slowSkipped += 1;
    } else if (answer?.is_correct === true) {
      if (fast) quadrants.fastCorrect += 1;
      else quadrants.slowCorrect += 1;
    } else if (answer?.is_correct === false) {
      if (fast) quadrants.fastWrong += 1;
      else quadrants.slowWrong += 1;
      slowestWrong.push({ questionId: item.questionId, index: item.index, seconds: item.seconds });
    }
    // A saved response without a trusted grading result contributes to the
    // recorded totals above but is not labelled correct or wrong here.
  }
  slowestWrong.sort((a, b) => b.seconds - a.seconds || a.index - b.index);

  let drift: PaceDrift | null = null;
  if (options.session && total >= 3) {
    const third = Math.max(1, Math.ceil(total / 3));
    const early = timed.filter(item => item.index <= third).map(item => item.seconds);
    const late = timed.filter(item => item.index > total - third).map(item => item.seconds);
    const earlyMean = meanOf(early);
    const lateMean = meanOf(late);
    drift = {
      earlyMeanSeconds: earlyMean,
      lateMeanSeconds: lateMean,
      percent:
        earlyMean != null && lateMean != null && earlyMean > 0
          ? Math.round(((lateMean - earlyMean) / earlyMean) * 100)
          : null,
    };
  }

  const topicNameMap =
    options.topicNames instanceof Map ? options.topicNames : new Map(Object.entries(options.topicNames || {}));
  const topicStats = new Map<string, QuestionStats>();
  const topicSeconds = new Map<string, number[]>();
  const topicSubjects = new Map<string, string | null>();
  for (const item of timed) {
    const topicId = item.record.question.topic_id;
    if (!topicId) continue;
    if (!topicStats.has(topicId)) topicStats.set(topicId, emptyStats());
    addQuestion(topicStats.get(topicId)!, item.record.question, item.record.answer);
    const samples = topicSeconds.get(topicId) || [];
    samples.push(item.seconds);
    topicSeconds.set(topicId, samples);
    topicSubjects.set(topicId, item.record.question.subject_id ?? null);
  }
  const byTopic: TopicPaceItem[] = Array.from(topicStats.entries())
    .map(([id, stats]) => ({
      id,
      name: topicNameMap.get(id) || id,
      subjectId: topicSubjects.get(id) ?? null,
      questions: (topicSeconds.get(id) || []).length,
      meanSeconds: meanOf(topicSeconds.get(id) || []) ?? 0,
      correctRate: finalize(stats).correctRate,
    }))
    .sort((a, b) => b.meanSeconds - a.meanSeconds || b.questions - a.questions);

  return {
    available: true,
    recorded: timed.length,
    total,
    medianSeconds,
    meanSeconds,
    totalSeconds,
    benchmark,
    quadrants,
    slowestWrong: slowestWrong.slice(0, 5),
    drift,
    byTopic,
  };
}

export function recordsForQuestions(
  questionIds: string[],
  questionById: Map<string, MetricsQuestion>,
  answerById: Map<string, MetricsAnswer>,
): { records: AttemptRecord[]; missingQuestionCount: number; missingAnswerRows: number } {
  let missingQuestionCount = 0;
  let missingAnswerRows = 0;
  const records = questionIds.map(id => {
    const question = questionById.get(id);
    const answer = answerById.get(id) ?? null;
    if (!question) missingQuestionCount += 1;
    if (!answer) missingAnswerRows += 1;
    return {
      question: question ?? { id, marks: 1, negative_marks: 0, question_type: "MCQ" },
      answer,
    };
  });
  return { records, missingQuestionCount, missingAnswerRows };
}

export function formatRate(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

export function formatMarksValue(value: number): string {
  return Number(value.toFixed(2)).toString();
}
