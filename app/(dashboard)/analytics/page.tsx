import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnalyticsContent } from "./analytics-content";

export const metadata = { title: "Analytics | TGPSC AEE Civil Prep" };

function getStreak(dates: string[]): number {
  const unique = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  if (unique.length === 0) return 0;

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .split("T")[0];

  if (unique[0] !== today && unique[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const curr = new Date(unique[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diff) === 1) streak++;
    else break;
  }
  return streak;
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const userId = user.id;

  const { data: sessions } = await supabase
    .from("test_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (!sessions || sessions.length === 0) {
    return <AnalyticsContent totalTests={0} />;
  }

  const sessionIds = sessions.map((s) => s.id);

  const { data: answers } = await supabase
    .from("test_answers")
    .select("session_id, is_correct, question_id, time_spent_seconds, selected_option")
    .in("session_id", sessionIds);

  const { data: subjectAnswers } = await supabase
    .from("test_answers")
    .select("is_correct, questions(subject_id)")
    .in("session_id", sessionIds);

  const examId = sessions[0].exam_id;
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("exam_id", examId);

  const subjectNameMap = new Map(
    (subjects || []).map((s) => [s.id, s.name])
  );

  const answerList = answers || [];

  const perSessionStats = sessions.map((s) => {
    const sessAnswers = answerList.filter(
      (a) => a.session_id === s.id
    );
    const correct = sessAnswers.filter(
      (a) => a.is_correct === true
    ).length;
    return {
      id: s.id,
      completed_at: s.completed_at,
      total_questions: s.total_questions,
      duration_minutes: s.duration_minutes,
      mode: s.mode,
      subject_id: s.subject_id,
      year: s.year,
      correct,
      score:
        s.total_questions > 0
          ? Math.round((correct / s.total_questions) * 100)
          : 0,
      timeSpent:
        s.completed_at && s.started_at
          ? Math.floor(
              (new Date(s.completed_at).getTime() -
                new Date(s.started_at).getTime()) /
                1000
            )
          : 0,
    };
  });

  const totalTests = sessions.length;
  const totalQuestions = sessions.reduce(
    (sum, s) => sum + s.total_questions,
    0
  );
  const overallAccuracy =
    totalTests > 0
      ? Math.round(
          perSessionStats.reduce((sum, s) => sum + s.score, 0) /
            totalTests
        )
      : 0;
  const studyStreak = getStreak(
    sessions
      .filter((s) => s.completed_at)
      .map((s) => new Date(s.completed_at!).toISOString().split("T")[0])
  );

  const scoreTrend = perSessionStats
    .slice(0, 10)
    .reverse()
    .map((s) => ({
      date: s.completed_at
        ? formatDateShort(new Date(s.completed_at))
        : "",
      score: s.score,
    }));

  const subjectAccMap = new Map<
    string,
    { correct: number; total: number }
  >();
  (subjectAnswers || []).forEach((a: any) => {
    const subjectId = a.questions?.subject_id;
    if (!subjectId) return;
    const entry = subjectAccMap.get(subjectId) || {
      correct: 0,
      total: 0,
    };
    entry.total++;
    if (a.is_correct === true) entry.correct++;
    subjectAccMap.set(subjectId, entry);
  });
  const subjectAccuracy = Array.from(subjectAccMap.entries())
    .map(([id, data]) => ({
      subjectId: id,
      name: subjectNameMap.get(id) || "Unknown",
      accuracy:
        data.total > 0
          ? Math.round((data.correct / data.total) * 100)
          : 0,
      totalQuestions: data.total,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const weakTopics = subjectAccuracy.filter((s) => s.accuracy < 50);

  const answeredQuestions = answerList.filter(
    (a) => a.selected_option != null
  );
  const totalTimeSpent = answerList.reduce(
    (sum, a) => sum + (a.time_spent_seconds || 0),
    0
  );
  const avgTimePerQuestion =
    answeredQuestions.length > 0
      ? Math.round(totalTimeSpent / answeredQuestions.length)
      : 0;

  const sessionTimeStats = perSessionStats
    .filter((s) => s.timeSpent > 0 && s.correct > 0)
    .map((s) => ({
      id: s.id,
      avgTime:
        s.total_questions > 0
          ? Math.round(s.timeSpent / s.total_questions)
          : 0,
    }));

  const fastestTest =
    sessionTimeStats.length > 0
      ? Math.min(...sessionTimeStats.map((s) => s.avgTime))
      : 0;
  const slowestTest =
    sessionTimeStats.length > 0
      ? Math.max(...sessionTimeStats.map((s) => s.avgTime))
      : 0;

  const yearMap = new Map<
    number,
    { tests: number; scores: number[] }
  >();
  perSessionStats.forEach((s) => {
    const year = s.year || 0;
    const entry = yearMap.get(year) || { tests: 0, scores: [] };
    entry.tests++;
    entry.scores.push(s.score);
    yearMap.set(year, entry);
  });
  const yearWise = Array.from(yearMap.entries())
    .map(([year, data]) => ({
      year,
      tests: data.tests,
      avgScore:
        data.scores.length > 0
          ? Math.round(
              data.scores.reduce((a, b) => a + b, 0) /
                data.scores.length
            )
          : 0,
      bestScore: Math.max(...data.scores),
    }))
    .sort((a, b) => b.year - a.year);

  const timeAccuracyData = perSessionStats
    .filter((s) => s.timeSpent > 0 && s.total_questions > 0)
    .map((s) => ({
      timePerQ: Math.round(s.timeSpent / s.total_questions),
      score: s.score,
    }));

  const weeklyMap = new Map<string, number[]>();
  perSessionStats.forEach((s) => {
    if (!s.completed_at) return;
    const key = getWeekStart(new Date(s.completed_at));
    const entry = weeklyMap.get(key) || [];
    entry.push(s.score);
    weeklyMap.set(key, entry);
  });
  const weeklyTrend = Array.from(weeklyMap.entries())
    .map(([week, scores]) => ({
      week: formatDateShort(new Date(week)),
      avgScore: Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      ),
    }))
    .sort((a, b) => a.week.localeCompare(b.week));

  const scores = perSessionStats.map((s) => s.score);
  const mean =
    scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) /
    scores.length;
  const consistencyScore = Math.round(Math.sqrt(variance));

  const focusRecommendations = subjectAccuracy
    .filter((s) => s.totalQuestions > 0)
    .map((s) => ({
      name: s.name,
      accuracy: s.accuracy,
      totalQuestions: s.totalQuestions,
      focusScore: Math.round(
        ((100 - s.accuracy) * s.totalQuestions) / 100
      ),
    }))
    .filter((s) => s.focusScore > 0)
    .sort((a, b) => b.focusScore - a.focusScore)
    .slice(0, 5);

  const chronological = [...perSessionStats].reverse();
  let runningSum = 0;
  const cumulativeProgress = chronological.map((s, i) => {
    runningSum += s.score;
    return {
      label: s.completed_at
        ? formatDateShort(new Date(s.completed_at))
        : "",
      avgScore: Math.round(runningSum / (i + 1)),
    };
  });

  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setDate(oneYearAgo.getDate() - 363);

  const sessionDateCount = new Map<string, number>();
  sessions.forEach((s) => {
    if (!s.completed_at) return;
    const key = new Date(s.completed_at)
      .toISOString()
      .split("T")[0];
    sessionDateCount.set(
      key,
      (sessionDateCount.get(key) || 0) + 1
    );
  });

  const streakData: { date: string; count: number }[][] = [];
  const startDay = new Date(oneYearAgo);
  startDay.setDate(startDay.getDate() - startDay.getDay());

  const cursor = new Date(startDay);
  while (cursor <= today) {
    const week: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dateKey = cursor.toISOString().split("T")[0];
      week.push({
        date: dateKey,
        count: sessionDateCount.get(dateKey) || 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    streakData.push(week);
  }

  return (
    <AnalyticsContent
      totalTests={totalTests}
      totalQuestions={totalQuestions}
      overallAccuracy={overallAccuracy}
      studyStreak={studyStreak}
      scoreTrend={scoreTrend}
      subjectAccuracy={subjectAccuracy}
      weakTopics={weakTopics}
      avgTimePerQuestion={avgTimePerQuestion}
      fastestTest={fastestTest}
      slowestTest={slowestTest}
      yearWise={yearWise}
      timeAccuracyData={timeAccuracyData}
      weeklyTrend={weeklyTrend}
      consistencyScore={consistencyScore}
      focusRecommendations={focusRecommendations}
      cumulativeProgress={cumulativeProgress}
      streakData={streakData}
    />
  );
}
