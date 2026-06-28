"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bookmark,
  CheckCircle2,
  XCircle,
  Sun,
  ChevronRight,
  Sparkles,
  Clock,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface DailyData {
  id: string;
  assignedDate: string;
  question: {
    id: string;
    text: string;
    options: string[];
    correctOption: number | null;
    explanation: string | null;
    year: number | null;
    subject: string | null;
  };
  userAnswer: { selectedOption: number; isCorrect: boolean } | null;
}

const optionLabels = ["A", "B", "C", "D"];

export default function DailyQuestionPage() {
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    correctOption: number;
    explanation: string;
  } | null>(null);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);


  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/daily-question");
        if (res.ok) {
          const json = await res.json();
          setData(json);
          if (json.userAnswer) {
            setResult({
              isCorrect: json.userAnswer.isCorrect,
              correctOption: json.question.correctOption,
              explanation: json.question.explanation,
            });
            setSelected(json.userAnswer.selectedOption);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!data || selected === null || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/daily-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyQuestionId: data.id,
          selectedOption: selected,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 409) {
          const refresh = await fetch("/api/daily-question");
          if (refresh.ok) {
            const json = await refresh.json();
            setData(json);
            if (json.userAnswer) {
              setResult({
                isCorrect: json.userAnswer.isCorrect,
                correctOption: json.question.correctOption,
                explanation: json.question.explanation,
              });
              setSelected(json.userAnswer.selectedOption);
            }
          }
        } else {
          alert(err.error || "Failed to submit");
        }
      } else {
        const json = await res.json();
        setResult({
          isCorrect: json.isCorrect,
          correctOption: json.correctOption,
          explanation: json.explanation,
        });
        setXpAwarded(json.xpAwarded);
        if (typeof window !== "undefined") {
          const { useXPStore } = await import("@/lib/stores/xp-store");
          useXPStore.getState().addToast(
            json.xpAwarded,
            json.isCorrect
              ? "Daily question correct"
              : "Daily question attempted"
          );
          if (json.leveledUp) {
            useXPStore.getState().showLevelUp({
              levelName: json.newLevelName,
              levelNumber: json.newLevelNumber,
              xpGained: json.xpAwarded,
            });
          }
        }
      }
    } catch {
      alert("Network error. Please try again.");
    }
    setSubmitting(false);
  }, [data, selected, submitting]);

  const handleBookmark = async () => {
    if (!data?.question?.id) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (bookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("question_id", data.question.id);
      setBookmarked(false);
    } else {
      await supabase
        .from("bookmarks")
        .insert({ user_id: user.id, question_id: data.question.id });
      setBookmarked(true);
    }
  };

  useEffect(() => {
    const check = async () => {
      if (!data?.question?.id) return;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bm } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("question_id", data.question.id)
        .maybeSingle();

      setBookmarked(!!bm);
    };
    check();
  }, [data?.question?.id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || !data.question) {
    return (
      <div className="max-w-md mx-auto py-16">
        <Card>
          <CardContent className="flex flex-col items-center text-center py-12 gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sun className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                No Question Yet
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
                Today&apos;s daily question hasn&apos;t been assigned yet.
                Check back later or practice with a test.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/test/select">
                Take a test
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAnswered = !!result;

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sun className="h-6 w-6 text-primary" />
            Daily Question
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(data.assignedDate), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/daily/history">
              <Clock className="h-3.5 w-3.5" />
              History
            </Link>
          </Button>
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 px-3 py-1 text-sm font-medium">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            +{isAnswered ? (result.isCorrect ? 25 : 10) : 25} XP
          </Badge>
        </div>
      </div>

      {/* Question Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-5">
            {/* Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              {data.question.subject && (
                <Badge variant="secondary">{data.question.subject}</Badge>
              )}
              {data.question.year && (
                <Badge variant="outline" className="text-xs">
                  {data.question.year}
                </Badge>
              )}
              {isAnswered && result.isCorrect && (
                <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 text-xs">
                  Correct
                </Badge>
              )}
              {isAnswered && !result.isCorrect && (
                <Badge variant="destructive" className="text-xs">
                  Incorrect
                </Badge>
              )}
            </div>

            {/* Question text */}
            <div className="text-base lg:text-lg leading-relaxed font-medium">
              {data.question.text}
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {data.question.options.map((opt, idx) => {
                const optNum = idx + 1;
                const isOptionSelected = selected === optNum;
                const isCorrectAnswer =
                  isAnswered && result.correctOption === optNum;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => setSelected(optNum)}
                    className={`rounded-xl border-2 px-4 py-3.5 text-sm text-left transition-all ${
                      isAnswered
                        ? isCorrectAnswer
                          ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                          : isOptionSelected
                            ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                            : "border-border bg-card opacity-60"
                        : isOptionSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:border-primary/50 hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 mt-0.5 ${
                          isAnswered
                            ? isCorrectAnswer
                              ? "bg-green-500 text-white"
                              : isOptionSelected
                                ? "bg-red-500 text-white"
                                : "border border-muted-foreground/30 text-muted-foreground"
                            : isOptionSelected
                              ? "bg-primary text-primary-foreground"
                              : "border border-muted-foreground/30 text-muted-foreground"
                        }`}
                      >
                        {optionLabels[idx]}
                      </span>
                      <span className="flex-1 leading-relaxed">{opt}</span>
                      {isAnswered && isCorrectAnswer && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      )}
                      {isAnswered && isOptionSelected && !isCorrectAnswer && (
                        <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action area */}
            {!isAnswered ? (
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={selected === null || submitting}
                  className="flex-1"
                  size="lg"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {submitting
                    ? "Submitting..."
                    : selected
                      ? "Submit Answer"
                      : "Select an option"}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleBookmark}
                  className={
                    bookmarked
                      ? "text-yellow-600 border-yellow-500/50"
                      : ""
                  }
                >
                  <Bookmark
                    className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`}
                  />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleBookmark}
                  className={
                    bookmarked
                      ? "text-yellow-600 border-yellow-500/50"
                      : ""
                  }
                >
                  <Bookmark
                    className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`}
                  />
                </Button>
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  +{xpAwarded} XP earned
                </span>
              </div>
            )}

            {/* Explanation */}
            {isAnswered && result.explanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-muted/50 rounded-lg border p-4 text-sm text-muted-foreground leading-relaxed"
              >
                {result.explanation}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom message */}
      {isAnswered && (
        <p className="text-sm text-muted-foreground text-center">
          Come back tomorrow for a new question.{" "}
          <Link
            href="/daily/history"
            className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
          >
            View history
            <ChevronRight className="h-3 w-3" />
          </Link>
        </p>
      )}
    </div>
  );
}
