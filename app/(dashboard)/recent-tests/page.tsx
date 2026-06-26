import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ClipboardList, Check, X, Minus, ArrowRight, TrendingUp, Target, BarChart3 } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Recent Tests | TGPSC AEE Civil Prep" };

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

export default async function RecentTestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const userId = user.id;

  const { data: sessions } = await supabase
    .from("test_sessions")
    .select(
      `id, total_questions, mode, completed_at, subject_id, subjects ( name )`
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
    const wrong = sessionAnswers.filter((a) => a.is_correct === false).length;
    const skipped = sessionAnswers.filter((a) => a.is_correct === null).length;
    const total = s.total_questions;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { ...s, correct, wrong, skipped, score };
  });

  const totalTests = sessionScores.length;
  const avgScore = totalTests > 0
    ? Math.round(sessionScores.reduce((sum, t) => sum + t.score, 0) / totalTests)
    : 0;
  const bestScore = totalTests > 0
    ? Math.max(...sessionScores.map((t) => t.score))
    : 0;
  const totalQuestions = sessionScores.reduce((sum, t) => sum + t.total_questions, 0);

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recent Tests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your completed test sessions and track your progress
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Tests</p>
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
              <p className="text-xs text-muted-foreground">Total Questions</p>
              <p className="text-xl font-bold">{totalQuestions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Test History</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionScores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <ClipboardList className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h2 className="text-lg font-semibold">No tests completed yet</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Start your first test from the sidebar or try a quick subject-wise practice to begin tracking your progress.
                </p>
              </div>
              <Button asChild>
                <Link href="/test/select">
                  Take a test
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessionScores.map((test) => (
                <Card key={test.id} className="overflow-hidden border-border/60 hover:border-border transition-colors">
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Left: Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">
                            {(test as any).subjects?.name || "General"}
                          </span>
                          <Badge variant={modeVariants[test.mode] || "outline"} className="text-xs">
                            {modeLabels[test.mode] || test.mode}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {test.completed_at
                            ? format(new Date(test.completed_at), "MMM d, yyyy h:mm a")
                            : "—"}
                        </p>
                      </div>

                      {/* Middle: Progress + stats */}
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="hidden sm:flex items-center gap-2.5">
                          <div className="flex items-center gap-1 text-xs">
                            <Check className="h-3.5 w-3.5 text-green-600" />
                            <span className="text-green-700 dark:text-green-400 font-medium">{test.correct}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <X className="h-3.5 w-3.5 text-red-600" />
                            <span className="text-red-700 dark:text-red-400 font-medium">{test.wrong}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium">{test.skipped}</span>
                          </div>
                        </div>

                        {/* Score bar */}
                        <div className="w-24 sm:w-32">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className={`text-lg font-bold ${getScoreColor(test.score)}`}>
                              {test.score}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getScoreBg(test.score)}`}
                              style={{ width: `${test.score}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/result/${test.id}`}>Result</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/review/${test.id}`}>Review</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
