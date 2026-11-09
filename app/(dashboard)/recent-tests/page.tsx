import { requireExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import {
  recordsForQuestions,
  sessionQuestionIds,
  summarizeAttempts,
  type AttemptRecord,
  type MetricsAnswer,
  type MetricsQuestion,
} from "@/lib/test-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ClipboardList, Check, X, Minus, ArrowRight, TrendingUp, Target, BarChart3 } from "lucide-react";
import Link from "next/link";
import { PageHeading } from '@/components/workspace/PageHeading';

export const metadata = { title: "Recent Tests | Exam Prep" };

const modeLabels: Record<string, string> = {
  sprint: "5-Q Sprint",
  concept_fix: "Concept fix",
  full_mock: "Full Mock",
  full_paper: "Full paper",
  subject_wise: "Subject-wise",
  topic_wise: "Topic-wise",
  custom: "Custom",
};

const modeVariants: Record<string, "default" | "secondary" | "outline"> = {
  sprint: "secondary",
  concept_fix: "secondary",
  full_mock: "default",
  full_paper: "default",
  subject_wise: "secondary",
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
  const { user, exam, stream } = await requireExamContext();

  const userId = user.id;

  const { data: sessions } = await supabase
    .from("test_sessions")
    .select(
      `id, total_questions, mode, completed_at, question_ids, subject_id, subjects ( name )`
    )
    .eq("user_id", userId)
    .eq("exam_id", exam.id)
    .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  const sessionIds = sessions?.map((s) => s.id) || [];

  const { data: allAnswers } =
    sessionIds.length > 0
      ? await supabase
          .from("test_answers")
          .select(
            `
            session_id,
            question_id,
            is_correct,
            selected_option,
            selected_options,
            numeric_answer,
            questions (
              id,
              marks,
              negative_marks,
              marks_to_all,
              question_type
            )
          `
          )
          .in("session_id", sessionIds)
      : { data: [] };

  type RowAnswer = MetricsAnswer & {
    session_id: string;
    questions?: MetricsQuestion | null;
  };
  const answerList = (allAnswers || []) as unknown as RowAnswer[];

  const answersBySession = new Map<string, RowAnswer[]>();
  for (const answer of answerList) {
    const list = answersBySession.get(answer.session_id) || [];
    list.push(answer);
    answersBySession.set(answer.session_id, list);
  }

  const sessionScores = (sessions || []).map((s) => {
    const sessionAnswers = answersBySession.get(s.id) || [];
    const questionById = new Map<string, MetricsQuestion>();
    for (const answer of sessionAnswers) {
      if (answer.questions?.id) questionById.set(answer.questions.id, answer.questions);
    }
    const answerById = new Map(sessionAnswers.map((a) => [a.question_id, a]));
    const questionIds = sessionQuestionIds(s, sessionAnswers);
    const built = recordsForQuestions(questionIds, questionById, answerById);
    const stats = summarizeAttempts(built.records as AttemptRecord[]).stats;
    return {
      ...s,
      correct: stats.correct,
      wrong: stats.wrong,
      skipped: stats.skipped,
      marksToAll: stats.marksToAll,
      graded: stats.graded,
      score: stats.correctRate ?? 0,
    };
  });

  const totalTests = sessionScores.length;
  const totalGraded = sessionScores.reduce((sum, t) => sum + t.graded, 0);
  const totalCorrect = sessionScores.reduce((sum, t) => sum + t.correct, 0);
  const avgScore = totalGraded > 0 ? Math.round((totalCorrect / totalGraded) * 100) : 0;
  const bestScore = totalTests > 0
    ? Math.max(...sessionScores.map((t) => t.score))
    : 0;
  const totalQuestions = sessionScores.reduce((sum, t) => sum + t.graded, 0);

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <PageHeading title="Recent tests" icon={<ClipboardList />} description="Review your answers, revisit mistakes, and see how your practice is progressing." actions={<Button asChild><Link href="/test/select">Start a test<ArrowRight /></Link></Button>} />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex flex-col items-start gap-2 sm:p-4 sm:flex-row sm:items-center sm:gap-3">
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
          <CardContent className="p-3 flex flex-col items-start gap-2 sm:p-4 sm:flex-row sm:items-center sm:gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg correct rate</p>
              <p className={`text-xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex flex-col items-start gap-2 sm:p-4 sm:flex-row sm:items-center sm:gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Best correct rate</p>
              <p className={`text-xl font-bold ${getScoreColor(bestScore)}`}>{bestScore}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex flex-col items-start gap-2 sm:p-4 sm:flex-row sm:items-center sm:gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Graded Questions</p>
              <p className="text-xl font-bold">{totalQuestions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">Correct rate = correct answers ÷ graded questions, including skipped questions; marks-to-all questions are excluded from the rate but their marks count. Averages are weighted by question count, not by test. This is a practice figure, not an official {exam.name} score.</p>

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
                    <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                      {/* Left: Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">
                            {(test.subjects as unknown as { name?: string } | null)?.name || "General"}
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
                              {test.score}% <span className="text-xs font-normal text-muted-foreground">correct</span>
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
                      <div className="grid grid-cols-2 gap-2 xl:flex xl:items-center xl:shrink-0">
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
