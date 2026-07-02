import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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
  Clock,
  Trophy,
  Flame,
} from "lucide-react";
import Link from "next/link";
import { SubjectChart } from "./subject-chart";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";

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

export const metadata = { title: "Dashboard | TGPSC AEE Civil Prep" };

const modeLabels: Record<string, string> = {
  full_mock: "Full Mock",
  topic_wise: "Subject-wise",
  custom: "Custom",
};

const modeVariants: Record<string, "default" | "secondary" | "outline"> = {
  full_mock: "default",
  topic_wise: "secondary",
  custom: "outline",
};

function getScoreColor(score: number) {
  if (score >= 60) return "text-green-600 dark:text-green-400";
  if (score >= 35) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const userId = user.id;

  const [profileResult, sessionsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single(),
    supabase
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
      .eq("status", "completed")
      .order("completed_at", { ascending: false }),
  ]);

  const profile = profileResult.data;
  const sessions = sessionsResult.data;
  const userName = profile?.full_name || "User";

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
    const total = correct + wrong + skipped || s.total_questions;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { ...s, correct, wrong, skipped, score };
  });

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
  (allAnswers || []).forEach((a: any) => {
    const subjectName = a.questions?.subjects?.name;
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
              Keep practicing for TSPSC AEE Civil
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/test/select">
                <Play className="h-3.5 w-3.5" />
                Start Test
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href="/daily">
                <Zap className="h-3.5 w-3.5" />
                Daily Q
              </Link>
            </Button>
          </div>
        </div>
      </div>

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
                <p className="text-[11px] text-muted-foreground leading-none mb-1">Avg Score</p>
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
                <p className="text-[11px] text-muted-foreground leading-none mb-1">Best Score</p>
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

      {/* Countdown */}
      <ExamCountdown />

      {/* Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DailyQuestionWidget />
        <StreakCard />
        <RevisionWidget />
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Link
              href="/test/select"
              className="group flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-all"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Play className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">Full Mock Test</p>
                <p className="text-[11px] text-muted-foreground">150 Qs · 150 min</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              href="/test/select"
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
              href="/test/select"
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
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {(test as any).subjects?.name || "General"}
                        </span>
                        <Badge variant={modeVariants[test.mode] || "outline"} className="text-[9px] px-1.5 py-0 shrink-0">
                          {modeLabels[test.mode] || test.mode}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {format(new Date(test.completed_at!), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <span className={`text-sm font-semibold ${getScoreColor(test.score)}`}>
                        {test.score}%
                      </span>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" asChild className="h-6 text-[10px] px-1.5">
                          <Link href={`/result/${test.id}`}>Result</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="h-6 text-[10px] px-1.5">
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
