import { requireExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import {
  recordsForQuestions,
  sessionQuestionIds,
  summarizeAttempts,
  type AttemptRecord,
  type MetricsAnswer,
  type MetricsQuestion,
  type MetricsSession,
  type QuestionStats,
  type SessionTiming,
} from "@/lib/test-metrics";
import {
  AnalyticsContent,
  type AnalyticsTiming,
  type SessionHistoryItem,
  type TopicAnalyticsItem,
  type YearWiseItem,
} from "./analytics-content";

export const metadata = { title: "Analytics | Exam Prep" };

const PAGE_SIZE = 500;
const SESSION_CHUNK = 50;
const QUESTION_CHUNK = 100;

interface SessionRow extends MetricsSession {
  id: string;
  user_id: string;
  exam_id: string;
  year: number | null;
  paper: string | null;
  subject_id: string | null;
  topic_id: string | null;
  status: string;
  completed_at: string | null;
  started_at: string | null;
  total_questions: number | null;
  duration_minutes: number | null;
  mode: string | null;
  question_ids: string[] | null;
}

interface AnswerRow extends MetricsAnswer {
  session_id: string;
}

interface SubjectRow {
  id: string;
  name: string;
}

interface TopicRow {
  id: string;
  name: string;
  subject_id: string;
}

interface SessionResult {
  session: SessionRow;
  records: AttemptRecord[];
  stats: QuestionStats;
  timing: SessionTiming;
  missingQuestionCount: number;
  missingAnswerRows: number;
  recordedQuestionCount: number;
  declaredQuestionCount: number;
}

function dateParts(iso: string | null): { label: string; time: string; key: string; ms: number } {
  if (!iso) return { label: "Not recorded", time: "", key: "", ms: 0 };
  const date = new Date(iso);
  const ms = date.getTime();
  if (!Number.isFinite(ms)) return { label: "Not recorded", time: "", key: "", ms: 0 };

  const label = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);

  const parts = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Kolkata",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  const key = `${part("year")}-${part("month")}-${part("day")}`;

  return { label, time, key, ms };
}

function weekStartMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

function ratio(correct: number, graded: number): number | null {
  return graded > 0 ? Math.round((correct / graded) * 100) : null;
}

async function fetchSessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  examId: string,
  streamId: string | null,
): Promise<SessionRow[]> {
  const sessions: SessionRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from("test_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("exam_id", examId)
      .eq("status", "completed");
    query = streamId ? query.eq("stream_id", streamId) : query.is("stream_id", null);
    const { data, error } = await query
      .order("completed_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error("Unable to load your completed tests. Please retry.");
    }
    const page = (data || []) as SessionRow[];
    sessions.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return sessions;
}

async function fetchAnswers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionIds: string[],
): Promise<AnswerRow[]> {
  const answers: AnswerRow[] = [];
  for (let offset = 0; offset < sessionIds.length; offset += SESSION_CHUNK) {
    const chunk = sessionIds.slice(offset, offset + SESSION_CHUNK);
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("test_answers")
        .select("session_id, question_id, selected_option, selected_options, numeric_answer, is_correct, time_spent_seconds")
        .in("session_id", chunk)
        .order("session_id", { ascending: true })
        .order("question_id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        throw new Error("Unable to load the saved answers for your tests. Please retry.");
      }
      const page = (data || []) as AnswerRow[];
      answers.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
  }
  return answers;
}

async function fetchQuestions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  examId: string,
  questionIds: string[],
): Promise<MetricsQuestion[]> {
  const questions: MetricsQuestion[] = [];
  for (let offset = 0; offset < questionIds.length; offset += QUESTION_CHUNK * 4) {
    const chunks = Array.from({ length: 4 }, (_, index) => questionIds.slice(offset + index * QUESTION_CHUNK, offset + (index + 1) * QUESTION_CHUNK)).filter(chunk => chunk.length);
    const results = await Promise.all(chunks.map(chunk => supabase.from("questions")
      .select("id, marks, negative_marks, marks_to_all, question_type, subject_id, topic_id")
      .eq("exam_id", examId).in("id", chunk)));
    for (const { data, error } of results) {
      if (error) throw new Error("Unable to load question metadata for your tests. Please retry.");
      questions.push(...((data || []) as MetricsQuestion[]));
    }
  }
  return questions;
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { user, exam, stream } = await requireExamContext();
  const userId = user.id;

  const sessions = await fetchSessions(supabase, userId, exam.id, stream?.id ?? null);
  if (sessions.length === 0) {
    return <AnalyticsContent totalTests={0} examLabel={exam.name} streamLabel={stream?.name} />;
  }

  const answers = await fetchAnswers(supabase, sessions.map((session) => session.id));
  const answersBySession = new Map<string, AnswerRow[]>();
  for (const answer of answers) {
    const list = answersBySession.get(answer.session_id) || [];
    list.push(answer);
    answersBySession.set(answer.session_id, list);
  }

  const questionIdSet = new Set<string>();
  for (const session of sessions) {
    for (const id of session.question_ids || []) questionIdSet.add(id);
    for (const answer of answersBySession.get(session.id) || []) questionIdSet.add(answer.question_id);
  }
  const questionIds = [...questionIdSet];
  const [questions, { data: subjectRows, error: subjectError }, { data: streakRow, error: streakError }] = await Promise.all([
    fetchQuestions(supabase, exam.id, questionIds),
    supabase.from("subjects").select("id, name").eq("exam_id", exam.id)
      .or(stream ? `stream_id.eq.${stream.id},stream_id.is.null` : "stream_id.is.null"),
    supabase.from("streaks").select("current_streak, longest_streak, last_activity_date").eq("user_id", userId).maybeSingle(),
  ]);
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const subjectIdSet = new Set(questions.map((question) => question.subject_id).filter(Boolean) as string[]);
  if (subjectError) {
    throw new Error("Unable to load subject names for your tests. Please retry.");
  }
  const subjectNameMap = new Map(((subjectRows || []) as SubjectRow[]).map((subject) => [subject.id, subject.name]));

  const topicNameMap = new Map<string, string>();
  const topicSubjectMap = new Map<string, string>();
  for (let offset = 0; offset < subjectIdSet.size; offset += QUESTION_CHUNK) {
    const chunk = [...subjectIdSet].slice(offset, offset + QUESTION_CHUNK);
    if (chunk.length === 0) continue;
    const { data: topicRows, error: topicError } = await supabase
      .from("topics")
      .select("id, name, subject_id")
      .in("subject_id", chunk);
    if (topicError) {
      throw new Error("Unable to load topic names for your tests. Please retry.");
    }
    for (const topic of (topicRows || []) as TopicRow[]) {
      topicNameMap.set(topic.id, topic.name);
      topicSubjectMap.set(topic.id, topic.subject_id);
    }
  }

  const sessionResults: SessionResult[] = sessions.map((session) => {
    const sessionAnswers = answersBySession.get(session.id) || [];
    const ids = sessionQuestionIds(session, sessionAnswers);
    const answerMap = new Map(sessionAnswers.map((answer) => [answer.question_id, answer]));
    const built = recordsForQuestions(ids, questionMap, answerMap);
    const summary = summarizeAttempts(built.records, { session });
    return {
      session,
      records: built.records,
      stats: summary.stats,
      timing: summary.timing,
      missingQuestionCount: built.missingQuestionCount,
      missingAnswerRows: built.missingAnswerRows,
      recordedQuestionCount: ids.length,
      declaredQuestionCount: Array.isArray(session.question_ids) ? session.question_ids.length : 0,
    };
  });

  const allRecords = sessionResults.flatMap((result) => result.records);
  const overall = summarizeAttempts(allRecords, {
    subjectNames: subjectNameMap,
    topicNames: topicNameMap,
  });

  const sortedResults = [...sessionResults].sort((a, b) => {
    const aMs = Date.parse(a.session.completed_at || "");
    const bMs = Date.parse(b.session.completed_at || "");
    return (Number.isFinite(bMs) ? bMs : 0) - (Number.isFinite(aMs) ? aMs : 0);
  });

  const history: SessionHistoryItem[] = sortedResults.map((result) => {
    const stats = result.stats;
    const completed = dateParts(result.session.completed_at);
    const timing = result.timing;
    return {
      id: result.session.id,
      completedAt: result.session.completed_at,
      dateLabel: completed.label,
      timeLabel: completed.time,
      mode: result.session.mode || "custom",
      paper: result.session.paper,
      year: result.session.year,
      loadedQuestions: stats.total,
      gradedQuestions: stats.graded,
      correct: stats.correct,
      wrong: stats.wrong,
      skipped: stats.skipped,
      marksToAll: stats.marksToAll,
      ungraded: stats.ungraded,
      correctRate: stats.correctRate,
      attemptAccuracy: stats.attemptAccuracy,
      netMarks: stats.netMarks,
      maximumMarks: stats.maximumMarks,
      netMarkRate: stats.netMarkRate,
      timingLabel: timing.label,
      timingAvailable: timing.available,
      timingSeconds: timing.seconds,
      timingKind: timing.kind,
    };
  });

  const scoredHistory = [...history]
    .filter((item) => item.correctRate != null)
    .sort((a, b) => (Date.parse(a.completedAt || "") || 0) - (Date.parse(b.completedAt || "") || 0));

  const scoreTrend = scoredHistory.slice(-10).map((item) => ({
    date: item.dateLabel,
    score: item.correctRate ?? 0,
  }));

  const weeklyMap = new Map<number, { correct: number; graded: number; label: string }>();
  for (const result of sortedResults) {
    const start = weekStartMs(result.session.completed_at);
    if (start == null) continue;
    if (result.stats.graded === 0) continue;
    const entry = weeklyMap.get(start) || {
      correct: 0,
      graded: 0,
      label: dateParts(new Date(start).toISOString()).label,
    };
    entry.correct += result.stats.correct;
    entry.graded += result.stats.graded;
    weeklyMap.set(start, entry);
  }
  const weeklyTrend = [...weeklyMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, entry]) => ({
      week: entry.label,
      avgScore: ratio(entry.correct, entry.graded) ?? 0,
    }));

  let runningCorrect = 0;
  let runningGraded = 0;
  const cumulativeProgress = scoredHistory.map((item) => {
    runningCorrect += item.correct;
    runningGraded += item.gradedQuestions;
    return {
      label: item.dateLabel,
      avgScore: ratio(runningCorrect, runningGraded) ?? 0,
    };
  });

  const perTestRates = scoredHistory.map((item) => item.correctRate as number);
  const mean = perTestRates.length > 0 ? perTestRates.reduce((sum, value) => sum + value, 0) / perTestRates.length : 0;
  const variance = perTestRates.length > 0
    ? perTestRates.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / perTestRates.length
    : 0;
  const consistencyScore = Math.round(Math.sqrt(variance));

  const topics: TopicAnalyticsItem[] = overall.byTopic.map((topic) => ({
    ...topic,
    subjectName: topic.subjectId ? subjectNameMap.get(topic.subjectId) || "Unclassified" : "Unclassified",
  }));

  const yearMap = new Map<number, SessionResult[]>();
  for (const result of sortedResults) {
    const year = result.session.year || 0;
    const list = yearMap.get(year) || [];
    list.push(result);
    yearMap.set(year, list);
  }
  const yearWise: YearWiseItem[] = [...yearMap.entries()]
    .map(([year, results]) => {
      const grouped = summarizeAttempts(
        results.flatMap((result) => result.records),
        { subjectNames: subjectNameMap, topicNames: topicNameMap },
      );
      return {
        year,
        tests: results.length,
        graded: grouped.stats.graded,
        correctRate: grouped.stats.correctRate,
        netMarks: grouped.stats.netMarks,
        maximumMarks: grouped.stats.maximumMarks,
        netMarkRate: grouped.stats.netMarkRate,
      };
    })
    .sort((a, b) => b.year - a.year);

  const timedResults = sortedResults.filter(
    (result) => result.timing.available && result.timing.seconds != null,
  );
  const totalTimedSeconds = timedResults.reduce((sum, result) => sum + (result.timing.seconds ?? 0), 0);
  const timedGradedQuestions = timedResults.reduce(
    (sum, result) => sum + result.stats.graded,
    0,
  );
  const timing: AnalyticsTiming = {
    availableSessions: timedResults.length,
    totalSessions: sortedResults.length,
    totalSeconds: totalTimedSeconds,
    avgElapsedPerGradedQuestion: timedGradedQuestions > 0 ? Math.round(totalTimedSeconds / timedGradedQuestions) : null,
    perQuestionRecorded: sortedResults.some((result) =>
      result.records.some((record) => {
        const seconds = Number(record.answer?.time_spent_seconds);
        return Number.isFinite(seconds) && seconds > 0;
      }),
    ),
    // Question-weighted aggregate across every loaded session. With no single
    // paper to budget against, the benchmark is the recorded median and drift
    // is not claimed.
    pacing: overall.pacing,
  };

  const streakAvailable = !streakError;
  const studyStreak = streakAvailable ? Number(streakRow?.current_streak ?? 0) : 0;
  const longestStreak = streakAvailable ? Number(streakRow?.longest_streak ?? 0) : 0;

  const sessionDayCount = new Map<string, number>();
  for (const result of sortedResults) {
    const key = dateParts(result.session.completed_at).key;
    if (!key) continue;
    sessionDayCount.set(key, (sessionDayCount.get(key) || 0) + 1);
  }

  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setDate(oneYearAgo.getDate() - 363);
  const streakData: { date: string; count: number }[][] = [];
  const startDay = new Date(oneYearAgo);
  startDay.setDate(startDay.getDate() - startDay.getDay());
  const cursor = new Date(startDay);
  while (cursor <= today) {
    const week: { date: string; count: number }[] = [];
    for (let day = 0; day < 7; day++) {
      const key = dateParts(cursor.toISOString()).key;
      week.push({ date: key, count: sessionDayCount.get(key) || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    streakData.push(week);
  }

  const dataCaveats: string[] = [];
  const missingQuestionSets = sortedResults.filter(
    (result) => result.declaredQuestionCount === 0,
  ).length;
  if (missingQuestionSets > 0) {
    dataCaveats.push(
      `${missingQuestionSets} completed test${missingQuestionSets === 1 ? " did" : "s did"} not persist the original question set. Their totals include saved answer rows only, so unanswered questions may be missing.`,
    );
  }
  const missingQuestionRows = sortedResults.reduce((sum, result) => sum + result.missingQuestionCount, 0);
  if (missingQuestionRows > 0) {
    dataCaveats.push(
      `${missingQuestionRows} question record${missingQuestionRows === 1 ? "" : "s"} could not be loaded. Marks for those slots use the default 1-mark assumption and are included only to keep question counts honest.`,
    );
  }
  const missingAnswerRows = sortedResults.reduce((sum, result) => sum + result.missingAnswerRows, 0);
  if (missingAnswerRows > 0) {
    dataCaveats.push(
      `${missingAnswerRows} declared question${missingAnswerRows === 1 ? " has" : "s have"} no saved answer row. ${missingAnswerRows === 1 ? "It is" : "They are"} treated as skipped, not wrong.`,
    );
  }
  if (overall.stats.ungraded > 0) {
    dataCaveats.push(
      `${overall.stats.ungraded} saved response${overall.stats.ungraded === 1 ? "" : "s"} have no trusted grading result and are excluded from both correct rate and attempt accuracy.`,
    );
  }
  if (overall.stats.marksToAll > 0) {
    dataCaveats.push(
      `${overall.stats.marksToAll} marks-to-all question${overall.stats.marksToAll === 1 ? " is" : "s are"} awarded full marks but excluded from correct rate, attempt accuracy, attempted and skipped counts.`,
    );
  }
  if (overall.topicCoverage.mapped < overall.topicCoverage.total) {
    const unmapped = overall.topicCoverage.total - overall.topicCoverage.mapped;
    dataCaveats.push(
      `${unmapped} loaded question${unmapped === 1 ? " has" : "s have"} no topic assigned. The topic breakdown covers only mapped questions.`,
    );
  }
  if (!streakAvailable) {
    dataCaveats.push("The authoritative study-streak record could not be loaded, so the streak is shown as unavailable rather than derived from test dates.");
  }
  if (!timing.perQuestionRecorded) {
    dataCaveats.push("Per-question time is not recorded by the test player, so no pacing zones or per-question speed analysis are shown.");
  }

  return (
    <AnalyticsContent
      totalTests={sessions.length}
      overall={overall.stats}
      byType={overall.byType}
      subjectStats={overall.bySubject}
      topicStats={topics}
      scoreTrend={scoreTrend}
      history={history}
      weeklyTrend={weeklyTrend}
      cumulativeProgress={cumulativeProgress}
      consistencyScore={consistencyScore}
      timing={timing}
      studyStreak={studyStreak}
      longestStreak={longestStreak}
      streakAvailable={streakAvailable}
      streakData={streakData}
      dataCaveats={dataCaveats}
      yearWise={yearWise}
      examLabel={exam.name}
      streamLabel={stream?.name}
    />
  );
}
