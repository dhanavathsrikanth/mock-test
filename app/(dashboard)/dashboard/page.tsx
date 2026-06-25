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
  Percent,
  Trophy,
  FileQuestion,
  ArrowRight,
  Play,
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const userId = user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();

  const userName = profile?.full_name || "User";

  const { data: sessions } = await supabase
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
    .order("completed_at", { ascending: false });

  const sessionIds = sessions?.map((s) => s.id) || [];

  const { data: allAnswers } =
    sessionIds.length > 0
      ? await supabase
          .from("test_answers")
          .select("session_id, is_correct")
          .in("session_id", sessionIds)
      : { data: [] };

  const sessionScores = (sessions || []).map((s) => {
    const sessionAnswers = (allAnswers || []).filter(
      (a) => a.session_id === s.id
    );
    const correct = sessionAnswers.filter((a) => a.is_correct === true).length;
    const total = s.total_questions;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { ...s, correct, score };
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

  const { data: subjectAnswers } =
    sessionIds.length > 0
      ? await supabase
          .from("test_answers")
          .select(
            `
          is_correct,
          questions (
            subject_id,
            subjects ( name )
          )
        `
          )
          .in("session_id", sessionIds)
      : { data: [] };

  const subjectMap = new Map<string, { correct: number; total: number }>();
  (subjectAnswers || []).forEach((a: any) => {
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
    <div className="space-y-4">
      {/* Exam Countdown - prominent first element */}
      <ExamCountdown />

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Tests Taken
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalTests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Average Score
            </CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgScore}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{bestScore}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Questions Practiced
            </CardTitle>
            <FileQuestion className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalQuestions}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tests</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTests.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No tests completed yet. Start your first test below!
            </p>
          ) : (
            <div className="divide-y">
              {recentTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {(test as any).subjects?.name || "General"}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {modeLabels[test.mode] || test.mode}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(
                        new Date(test.completed_at!),
                        "MMM d, yyyy h:mm a"
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <span
                      className={`text-sm font-semibold ${
                        test.score >= 60
                          ? "text-green-600 dark:text-green-400"
                          : test.score >= 35
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {test.score}%
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/result/${test.id}`}>Result</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
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

      <div>
        <h2 className="text-xl font-semibold mb-3">Quick Start</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            href="/test/select"
            className="group relative overflow-hidden rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <Play className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Full Mock Test</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              150 Questions · 150 min
            </p>
            <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link
            href="/test/select"
            className="group relative overflow-hidden rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <Play className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Subject-wise Test</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Pick a subject to practice
            </p>
            <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link
            href="/test/select"
            className="group relative overflow-hidden rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <Play className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Custom Test</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Pick year · subject · count
            </p>
            <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subject Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <SubjectChart data={subjectPerformance} />
        </CardContent>
      </Card>
    </div>
  );
}
