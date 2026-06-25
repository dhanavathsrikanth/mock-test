"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Sparkles,
  Clock,
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
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (finished) {
    const correctCount = results.filter((r) => r.result === "correct").length;
    const wrongCount = results.filter((r) => r.result === "wrong").length;
    const skippedCount = results.filter((r) => r.result === "skipped").length;
    const totalXp = correctCount * 10;

    return (
      <div className="max-w-3xl mx-auto text-center space-y-6 py-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400 }}
          className="text-6xl"
        >
          🎉
        </motion.div>

        <h1 className="text-2xl font-bold">Revision Complete!</h1>

        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {correctCount}
              </div>
              <p className="text-xs text-muted-foreground">Correct</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <XCircle className="h-5 w-5 text-red-500 mx-auto" />
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {wrongCount}
              </div>
              <p className="text-xs text-muted-foreground">Struggling</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <Clock className="h-5 w-5 text-muted-foreground mx-auto" />
              <div className="text-2xl font-bold">{skippedCount}</div>
              <p className="text-xs text-muted-foreground">Skipped</p>
            </CardContent>
          </Card>
        </div>

        <p className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
          <Sparkles className="h-4 w-4" /> +{totalXp} XP earned
        </p>

        <p className="text-sm text-muted-foreground">
          Next revision scheduled based on your performance.
        </p>

        <div className="flex gap-3 justify-center">
          <Button onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-4">
        <span className="text-5xl">📚</span>
        <h1 className="text-2xl font-bold">Nothing Due for Revision</h1>
        <p className="text-muted-foreground">
          You&apos;re all caught up! Questions you answer wrong or bookmark
          will appear here for spaced repetition.
        </p>
        <Button asChild>
          <Link href="/test/select">Practice More</Link>
        </Button>
      </div>
    );
  }

  const q = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span>📚</span> Revision
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {questions.length} question{questions.length > 1 ? "s" : ""} due
            today
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSkip}>
          Skip for today
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {currentIndex + 1} / {questions.length} reviewed
          </span>
          <span>+{questions.length * 10} XP available</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
          />
        </div>
      </div>

      {/* Question Card */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {q.question.subject && (
            <Badge variant="secondary">{q.question.subject}</Badge>
          )}

          <p className="text-lg leading-relaxed font-medium">
            {q.question.text}
          </p>

          <div className="space-y-2.5">
            {q.question.options.map((opt, idx) => {
              const optNum = idx + 1;
              const isCorrectAnswer = showAnswer && q.question.correctOption === optNum;

              return (
                <div
                  key={idx}
                  className={`w-full rounded-lg border px-4 py-3 text-sm transition-all ${
                    isCorrectAnswer
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30 ring-1 ring-green-500"
                      : "border-border"
                  }`}
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-medium mr-3 shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {opt}
                  {isCorrectAnswer && (
                    <CheckCircle2 className="inline h-4 w-4 ml-2 text-green-500" />
                  )}
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {showAnswer && q.question.explanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground"
              >
                {q.question.explanation}
              </motion.div>
            )}
          </AnimatePresence>

          {showAnswer ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-center text-muted-foreground">
                How did you do?
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="flex flex-col gap-1 h-auto py-4"
                  onClick={() => handleRate("wrong")}
                  disabled={submitting}
                >
                  <span className="text-2xl">😓</span>
                  <span className="text-xs">Still Confused</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col gap-1 h-auto py-4"
                  onClick={() => handleRate("correct")}
                  disabled={submitting}
                >
                  <span className="text-2xl">🤔</span>
                  <span className="text-xs">Got it with effort</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col gap-1 h-auto py-4 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  onClick={() => handleRate("correct")}
                  disabled={submitting}
                >
                  <span className="text-2xl">😊</span>
                  <span className="text-xs">Easy!</span>
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowAnswer(true)}
              className="w-full"
              size="lg"
            >
              Show Answer
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
