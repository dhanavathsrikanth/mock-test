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
} from "lucide-react";
import Link from "next/link";
import { SubjectChart } from "./subject-chart";

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

function getScoreBg(score: number) {
  if (score >= 60) return "bg-green-500";
  if (score >= 35) return "bg-yellow-500";
  return "bg-red-500";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const userId = user.id;

  // Parallelize independent queries
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

  // Single query for all answer data (replaces two separate queries)
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

  // Derive subject performance from the combined answer data
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
    <div className="space-y-6 py-6">
      {/* Exam Countdown */}
      <ExamCountdown />

      {/* Welcome + Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {userName}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Keep practicing for TSPSC AEE Civil
          </p>
        </div>
        <div className="lg:col-span-1">
          <DailyQuestionWidget />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-2">
          <StreakCard />
          <RevisionWidget />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tests Taken</p>
              <p className="text-xl font-bold">{totalTests}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Average Score</p>
              <p className={`text-xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Best Score</p>
              <p className={`text-xl font-bold ${getScoreColor(bestScore)}`}>{bestScore}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Questions</p>
              <p className="text-xl font-bold">{totalQuestions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Quick Start
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            href="/test/select"
            className="group relative overflow-hidden rounded-xl border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Play className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Full Mock Test</h3>
                <p className="text-xs text-muted-foreground">150 Questions · 150 min</p>
              </div>
            </div>
            <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link
            href="/test/select"
            className="group relative overflow-hidden rounded-xl border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Subject-wise Test</h3>
                <p className="text-xs text-muted-foreground">Pick a subject to practice</p>
              </div>
            </div>
            <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link
            href="/test/select"
            className="group relative overflow-hidden rounded-xl border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Custom Test</h3>
                <p className="text-xs text-muted-foreground">Pick year · subject · count</p>
              </div>
            </div>
            <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
      </div>

      {/* Main grid: Recent Tests + Subject Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Tests */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Tests</CardTitle>
              {recentTests.length > 0 && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/recent-tests">
                    View all
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentTests.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-3">
                <ClipboardList className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">No tests yet</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Complete your first test to see results here.
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link href="/test/select">
                    <Play className="h-3.5 w-3.5" />
                    Start a test
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {(test as any).subjects?.name || "General"}
                        </span>
                        <Badge variant={modeVariants[test.mode] || "outline"} className="text-[10px] px-1.5 py-0">
                          {modeLabels[test.mode] || test.mode}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(test.completed_at!), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <span className={`text-sm font-semibold ${getScoreColor(test.score)}`}>
                        {test.score}%
                      </span>
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" asChild className="h-7 text-xs px-2">
                          <Link href={`/result/${test.id}`}>Result</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="h-7 text-xs px-2">
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
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Subject Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <SubjectChart data={subjectPerformance} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
