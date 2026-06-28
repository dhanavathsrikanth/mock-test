"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Sparkles,
  Clock,
  BookOpen,
  Brain,
  ThumbsUp,
  HelpCircle,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";

interface SRSQuestion {
  srsId: string;
  intervalDays: number;
  easeFactor: number;
  repetitionCount: number;
  nextReviewDate: string;
  question: {
    id: string;
    text: string;
    options: string[];
    correctOption: number;
    explanation: string;
    year: number | null;
    subject: string | null;
  };
}

const optionLabels = ["A", "B", "C", "D"];

export default function RevisionPage() {
  const [questions, setQuestions] = useState<SRSQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<
    { questionId: string; result: string }[]
  >([]);
  const [finished, setFinished] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/srs?action=due");
        if (!res.ok) return;
        const json = await res.json();
        setQuestions(json.questions || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleRate = useCallback(
    async (result: "correct" | "wrong" | "skipped") => {
      if (submitting || !questions[currentIndex]) return;
      setSubmitting(true);
      setResults((r) => [
        ...r,
        { questionId: questions[currentIndex].question.id, result },
      ]);

      try {
        await fetch("/api/srs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "answer",
            questionId: questions[currentIndex].question.id,
            result,
          }),
        });
      } catch {
        // ignore
      }

      setShowAnswer(false);
      setSubmitting(false);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        setFinished(true);
      }
    },
    [currentIndex, questions, submitting]
  );

  const handleSkip = useCallback(() => {
    handleRate("skipped");
  }, [handleRate]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-2 w-full" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <div className="space-y-2.5">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (finished) {
    const correctCount = results.filter((r) => r.result === "correct").length;
    const wrongCount = results.filter((r) => r.result === "wrong").length;
    const skippedCount = results.filter((r) => r.result === "skipped").length;
    const totalXp = correctCount * 10;

    return (
      <div className="max-w-2xl mx-auto space-y-8 py-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-16 w-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Revision Complete!</h1>
        </motion.div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Card>
            <CardContent className="p-3 sm:p-4 text-center space-y-1.5">
              <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
              <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                {correctCount}
              </div>
              <p className="text-xs text-muted-foreground">Correct</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center space-y-1.5">
              <XCircle className="h-5 w-5 text-red-500 mx-auto" />
              <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                {wrongCount}
              </div>
              <p className="text-xs text-muted-foreground">Still Learning</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center space-y-1.5">
              <Clock className="h-5 w-5 text-muted-foreground mx-auto" />
              <div className="text-xl sm:text-2xl font-bold text-muted-foreground">
                {skippedCount}
              </div>
              <p className="text-xs text-muted-foreground">Skipped</p>
            </CardContent>
          </Card>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-xl border border-emerald-500/20 p-5 text-center"
        >
          <Sparkles className="h-5 w-5 text-emerald-500 mx-auto mb-1.5" />
          <p className="text-emerald-700 dark:text-emerald-400 font-semibold text-lg">
            +{totalXp} XP earned
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Next revision scheduled based on your performance.
          </p>
        </motion.div>

        <div className="flex justify-center">
          <Button onClick={() => router.push("/dashboard")} size="lg">
            Back to Dashboard
            <ArrowLeft className="h-4 w-4 ml-1.5 rotate-180" />
          </Button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16">
        <Card>
          <CardContent className="flex flex-col items-center text-center py-12 gap-4">
            <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">All Caught Up!</h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
                You&apos;ve reviewed everything due. Questions you answer wrong
                or bookmark will appear here for spaced repetition.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/test/select">
                Practice More
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const q = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Revision
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {questions.length} question{questions.length > 1 ? "s" : ""} due today
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSkip}>
          <Clock className="h-3.5 w-3.5" />
          Skip for today
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{currentIndex + 1}</span> / {questions.length} reviewed
          </span>
          <span className="text-muted-foreground">
            +{questions.length * 10} XP available
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
          />
        </div>
      </div>

      {/* Question Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Subject + question */}
          <div className="flex items-center gap-2 flex-wrap">
            {q.question.subject && (
              <Badge variant="secondary">{q.question.subject}</Badge>
            )}
            {q.question.year && (
              <Badge variant="outline" className="text-xs">{q.question.year}</Badge>
            )}
          </div>

          <div className="text-base lg:text-lg leading-relaxed font-medium">
            {q.question.text}
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {q.question.options.map((opt, idx) => {
              const optNum = idx + 1;
              const isCorrectAnswer = showAnswer && q.question.correctOption === optNum;

              return (
                <div
                  key={idx}
                  className={`rounded-xl border-2 px-4 py-3.5 text-sm transition-all ${
                    isCorrectAnswer
                      ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 mt-0.5 ${
                        isCorrectAnswer
                          ? "bg-green-500 text-white"
                          : "border border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {optionLabels[idx]}
                    </span>
                    <span className="flex-1 leading-relaxed">{opt}</span>
                    {isCorrectAnswer && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Explanation */}
          <AnimatePresence>
            {showAnswer && q.question.explanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground leading-relaxed border">
                  {q.question.explanation}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rating buttons or Show Answer */}
          {showAnswer ? (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  How did you do?
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  className="flex flex-col gap-1.5 h-auto py-3 sm:py-4 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30 hover:border-red-300"
                  onClick={() => handleRate("wrong")}
                  disabled={submitting}
                >
                  <Brain className="h-5 w-5 text-red-500" />
                  <span className="text-xs font-medium">
                    <span className="sm:hidden">Confused</span>
                    <span className="hidden sm:inline">Still Confused</span>
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col gap-1.5 h-auto py-3 sm:py-4 border-amber-200 hover:bg-amber-50 dark:border-amber-900 dark:hover:bg-amber-950/30 hover:border-amber-300"
                  onClick={() => handleRate("correct")}
                  disabled={submitting}
                >
                  <HelpCircle className="h-5 w-5 text-amber-500" />
                  <span className="text-xs font-medium">
                    <span className="sm:hidden">Effort</span>
                    <span className="hidden sm:inline">Got it with effort</span>
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col gap-1.5 h-auto py-3 sm:py-4 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/30 hover:border-emerald-300"
                  onClick={() => handleRate("correct")}
                  disabled={submitting}
                >
                  <ThumbsUp className="h-5 w-5 text-emerald-500" />
                  <span className="text-xs font-medium">Easy!</span>
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowAnswer(true)}
              className="w-full"
              size="lg"
            >
              <Eye className="h-4 w-4" />
              Show Answer
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
