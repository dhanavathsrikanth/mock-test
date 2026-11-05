import { requireExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  ClipboardList,
  ArrowRight,
  Play,
  TrendingUp,
  Target,
  BarChart3,
  BookOpen,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { SubjectChart } from "./subject-chart";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Suspense } from "react";
import { QuickPractice } from "@/components/practice/QuickPractice";
import { DashboardConcepts } from "@/components/smart-tags/DashboardConcepts";

const StreakCard = dynamic(
  () => import("@/components/streak/StreakCard").then((m) => m.StreakCard)
);

const DailyQuestionWidget = dynamic(
  () =>
    import("@/components/daily/DailyQuestionWidget").then(
      (m) => m.DailyQuestionWidget
    )
);

const RevisionWidget = dynamic(
  () =>
    import("@/components/revision/RevisionWidget").then(
      (m) => m.RevisionWidget
    )
);

const ExamCountdown = dynamic(
  () =>
    import("@/components/countdown/ExamCountdown").then(
      (m) => m.ExamCountdown
    )
);

export const metadata = { title: "Dashboard | Exam Prep" };

const modeLabels: Record<string, string> = {
  full_mock: "Full Mock",
  full_paper: "Full paper",
  subject_wise: "Subject-wise",
  topic_wise: "Topic-wise",
  custom: "Custom",
  sprint: "5-Q Sprint",
  concept_fix: "Concept fix",
};

const modeVariants: Record<string, "default" | "secondary" | "outline"> = {
  full_mock: "default",
  full_paper: "default",
  subject_wise: "secondary",
  topic_wise: "secondary",
  custom: "outline",
  sprint: "secondary",
  concept_fix: "secondary",
};

function getScoreColor(score: number) {
  if (score >= 60) return "text-green-600 dark:text-green-400";
  if (score >= 35) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { user, exam, stream, profile } = await requireExamContext();

  const userId = user.id;

  const sessionsResult = await supabase
    .from("test_sessions")
    .select(
      `
      id,
      total_questions,
      mode,
      completed_at,
      subject_id,
      subjects ( name )
    `
    )
    .eq("user_id", userId)
    .eq("exam_id", exam.id)
    .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });
  const sessions = sessionsResult.data;
  const userName = profile?.full_name || "User";
  const studyDay = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const dayStart = new Date(`${studyDay}T00:00:00+05:30`).toISOString();
  const [{ data: streak }, dailyProgress] = await Promise.all([
    supabase.from("streaks").select("current_streak,last_activity_date").eq("user_id", userId).maybeSingle(),
    supabase.from("test_answers").select("id,test_sessions!inner(user_id,exam_id,stream_id,completed_at,status)", { count: "exact", head: true })
      .eq("test_sessions.user_id", userId).eq("test_sessions.exam_id", exam.id)
      .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null", { referencedTable: "test_sessions" })
      .eq("test_sessions.status", "completed").gte("test_sessions.completed_at", dayStart).not("is_correct", "is", null)
      .or("selected_option.not.is.null,selected_options.not.is.null,numeric_answer.not.is.null"),
  ]);

  const sessionIds = sessions?.map((s) => s.id) || [];

  const { data: allAnswers } =
    sessionIds.length > 0
      ? await supabase
          .from("test_answers")
          .select(
            `
          session_id,
          is_correct,
          questions (
            subject_id,
            subjects ( name )
          )
        `
          )
          .in("session_id", sessionIds)
      : { data: [] };

  const sessionScores = (sessions || []).map((s) => {
    const sessionAnswers = (allAnswers || []).filter(
      (a) => a.session_id === s.id
    );
    const correct = sessionAnswers.filter((a) => a.is_correct === true).length;
    const wrong = sessionAnswers.filter((a) => a.is_correct === false).length;
    const skipped = sessionAnswers.filter((a) => a.is_correct === null).length;
    const total = s.total_questions;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { ...s, correct, wrong, skipped, score };
  });
  const dailyAnswered = dailyProgress.error ? null : dailyProgress.count ?? 0;

  const totalTests = sessions?.length || 0;
  const avgScore =
    sessionScores.length > 0
      ? Math.round(
          sessionScores.reduce((sum, s) => sum + s.score, 0) /
            sessionScores.length
        )
      : 0;
  const bestScore =
    sessionScores.length > 0
      ? Math.max(...sessionScores.map((s) => s.score))
      : 0;
  const totalQuestions =
    sessions?.reduce((sum, s) => sum + s.total_questions, 0) || 0;

  const recentTests = sessionScores.slice(0, 5);

  const subjectMap = new Map<string, { correct: number; total: number }>();
  (allAnswers || []).forEach((a) => {
    const question = a.questions as unknown as { subjects?: { name: string } | null } | null;
    const subjectName = question?.subjects?.name;
    if (!subjectName) return;
    const entry = subjectMap.get(subjectName) || { correct: 0, total: 0 };
    entry.total += 1;
    if (a.is_correct === true) entry.correct += 1;
    subjectMap.set(subjectName, entry);
  });

  const subjectPerformance = Array.from(subjectMap.entries())
    .map(([name, data]) => ({
      name,
      accuracy:
        data.total > 0
          ? Math.round((data.correct / data.total) * 100)
          : 0,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  return (
    <div className="space-y-4 py-4">
      <AnnouncementBanner />

      {/* Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Welcome back, {userName}!
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Keep practicing for {exam.name}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button asChild size="sm" className="hidden gap-1.5 lg:inline-flex">
              <Link href="/test/select">
                <Play className="h-3.5 w-3.5" />
                Start Test
              </Link>
            </Button>
            <Button asChild size="sm" className="min-h-11 gap-1.5 lg:hidden"><a href="#quick-practice"><Zap className="h-3.5 w-3.5" />5-Q Sprint</a></Button>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href="/daily">
                <Zap className="h-3.5 w-3.5" />
                Daily Q
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Suspense fallback={<div role="status" className="rounded-xl border p-4 text-sm text-muted-foreground">Loading concept insights…</div>}><DashboardConcepts /></Suspense>

      <section aria-label="Your daily practice" className="space-y-3 lg:hidden">
        <div className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-3">
          <div><p className="text-xs text-muted-foreground">Study streak</p><p className="mt-1 text-sm font-semibold">🔥 {streak?.current_streak ?? 0} days</p></div>
          <div><p className="text-xs text-muted-foreground">Daily goal · answered today</p>{dailyAnswered == null ? <p className="mt-1 text-xs text-muted-foreground">Progress temporarily unavailable</p> : <><p className="mt-1 text-sm font-semibold">🎯 {dailyAnswered}/20 questions</p><div role="progressbar" aria-label="Daily question goal" aria-valuenow={Math.min(20, dailyAnswered)} aria-valuemin={0} aria-valuemax={20} className="mt-2 h-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100,dailyAnswered / 20 * 100)}%` }} /></div></>}</div>
        </div>
        <div className="grid items-start gap-3 sm:grid-cols-2"><Suspense fallback={<div id="quick-practice" role="status" className="h-56 animate-pulse rounded-xl bg-muted" />}><QuickPractice /></Suspense><RevisionWidget /></div>
      </section>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="overflow-hidden">
          <div className="h-1 bg-primary" />
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ClipboardList className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground leading-none mb-1">Tests Taken</p>
                <p className="text-xl font-bold leading-none">{totalTests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="h-1 bg-green-500" />
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground leading-tight mb-1">Avg correct rate</p>
                <p className={`text-xl font-bold leading-none ${getScoreColor(avgScore)}`}>{avgScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="h-1 bg-amber-500" />
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Target className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground leading-tight mb-1">Best correct rate</p>
                <p className={`text-xl font-bold leading-none ${getScoreColor(bestScore)}`}>{bestScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="h-1 bg-blue-500" />
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground leading-none mb-1">Questions</p>
                <p className="text-xl font-bold leading-none">{totalQuestions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">Correct rate = correct answers ÷ all questions, including skipped questions. Marks and deductions are shown in each result.</p>

      {/* Countdown */}
      <ExamCountdown key={`${userId}:${exam.id}`} examId={exam.id} examName={exam.name} userId={userId} />

      {/* Widgets Row */}
      <div aria-label="Study activity" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] items-start gap-4">
        <div className="hidden lg:block"><RevisionWidget /></div>
        <DailyQuestionWidget />
        <StreakCard />
      </div>

      {/* Quick Start */}
      <Card className="hidden lg:block">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
            <Link href="/practice" className="group flex items-center gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3 hover:bg-primary/10"><Zap className="h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-semibold">5-Q Sprint</p><p className="text-[11px] text-muted-foreground">One concept · 12–15 minutes</p></div></Link>
            <Link
              href="/test/select"
              className="group flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-all"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Play className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">Start a test</p>
                <p className="text-[11px] text-muted-foreground">Choose your paper or practice mode</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              href="/test/select?mode=subject_wise"
              className="group flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-all"
            >
              <div className="h-9 w-9 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4 text-secondary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">Subject-wise</p>
                <p className="text-[11px] text-muted-foreground">Pick a subject to practice</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              href="/test/select?mode=custom"
              className="group flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-all"
            >
              <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">Custom Test</p>
                <p className="text-[11px] text-muted-foreground">Pick year · subject · count</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Main grid: Recent Tests + Subject Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Tests */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Tests</CardTitle>
              {recentTests.length > 0 && (
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                  <Link href="/recent-tests">
                    View all
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {recentTests.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <ClipboardList className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium text-sm">No tests yet</p>
                <p className="text-xs text-muted-foreground">
                  Complete your first test to see results here.
                </p>
                <Button size="sm" asChild className="mt-1">
                  <Link href="/test/select">
                    <Play className="h-3 w-3 mr-1" />
                    Start a test
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {recentTests.map((test) => (
                  <div
                    key={test.id}
                    className="flex flex-col items-stretch gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {(test.subjects as unknown as { name?: string } | null)?.name || "General"}
                        </span>
                        <Badge variant={modeVariants[test.mode] || "outline"} className="text-[9px] px-1.5 py-0 shrink-0">
                          {modeLabels[test.mode] || test.mode}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {format(new Date(test.completed_at!), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:ml-3 sm:shrink-0">
                      <span className={`text-sm font-semibold ${getScoreColor(test.score)}`}>
                        {test.score}% <span className="text-xs font-normal text-muted-foreground">correct</span>
                      </span>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" asChild className="h-11 px-3 text-xs sm:h-8">
                          <Link href={`/result/${test.id}`}>Result</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="h-11 px-3 text-xs sm:h-8">
                          <Link href={`/review/${test.id}`}>Review</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subject Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Subject Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <SubjectChart data={subjectPerformance} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
