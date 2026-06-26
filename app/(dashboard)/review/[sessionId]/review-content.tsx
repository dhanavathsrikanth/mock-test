"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Bookmark, ArrowLeft, Check, X, Minus, Eye, EyeOff, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { ReportButton } from "@/components/report/ReportButton";
import { MathText } from "@/components/MathText";

interface AnswerData {
  question_id: string;
  selected_option: number | null;
  is_correct: boolean | null;
  questions: {
    id: string;
    question_text: string;
    option_1: string;
    option_2: string;
    option_3: string;
    option_4: string;
    correct_option: number;
    explanation: string | null;
  };
}

interface ReviewContentProps {
  answers: AnswerData[];
  bookmarkedIds: Set<string>;
  userId: string;
  sessionId: string;
}

const FILTERS: { key: string; label: string; icon: typeof X }[] = [
  { key: "all", label: "All", icon: X },
  { key: "wrong", label: "Wrong", icon: X },
  { key: "skipped", label: "Skipped", icon: Minus },
  { key: "bookmarked", label: "Bookmarked", icon: Bookmark },
];

export function ReviewContent({
  answers,
  bookmarkedIds,
  userId,
  sessionId,
}: ReviewContentProps) {
  const [filter, setFilter] = useState<string>("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bookmarks, setBookmarks] = useState(bookmarkedIds);
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = answers;
    if (filter === "wrong") {
      list = list.filter(a => a.selected_option != null && a.is_correct === false);
    }
    if (filter === "skipped") {
      list = list.filter(a => a.selected_option == null);
    }
    if (filter === "bookmarked") {
      list = list.filter(a => bookmarks.has(a.question_id));
    }
    return list;
  }, [filter, answers, bookmarks]);

  useEffect(() => setCurrentIndex(0), [filter]);

  const current = filtered[currentIndex];
  const currentQ = current?.questions;
  const isBookmarked = current ? bookmarks.has(current.question_id) : false;

  const toggleBookmark = async (questionId: string) => {
    const next = new Set(bookmarks);
    if (next.has(questionId)) {
      next.delete(questionId);
      await createClient().from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("question_id", questionId);
    } else {
      next.add(questionId);
      await createClient().from("bookmarks")
        .insert({ user_id: userId, question_id: questionId });
    }
    setBookmarks(next);
  };

  const toggleExplanation = (questionId: string) => {
    const next = new Set(expandedExplanations);
    if (next.has(questionId)) next.delete(questionId);
    else next.add(questionId);
    setExpandedExplanations(next);
  };

  const wrongCount = answers.filter(a => a.selected_option != null && a.is_correct === false).length;
  const skippedCount = answers.filter(a => a.selected_option == null).length;
  const correctCount = answers.filter(a => a.is_correct === true).length;
  const allCount = answers.length;

  const getFilterCount = (key: string) => {
    switch (key) {
      case "all": return allCount;
      case "wrong": return wrongCount;
      case "skipped": return skippedCount;
      case "bookmarked": return bookmarks.size;
      default: return 0;
    }
  };

  const optionLabels = ["A", "B", "C", "D"];

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-1 -ml-2">
            <Link href={`/result/${sessionId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Results
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Review Answers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review your test answers, see explanations, and report issues
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg text-sm font-medium">
            <Check className="h-3.5 w-3.5" />
            {correctCount}
          </div>
          <div className="flex items-center gap-1.5 bg-red-500/10 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-lg text-sm font-medium">
            <X className="h-3.5 w-3.5" />
            {wrongCount}
          </div>
          <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground">
            <Minus className="h-3.5 w-3.5" />
            {skippedCount}
          </div>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const count = getFilterCount(f.key);
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full border transition-colors whitespace-nowrap ${
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-foreground border-input hover:bg-accent hover:border-muted-foreground/30"
              }`}
            >
              {f.label}
              <span className={`text-xs ${filter === f.key ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertTriangle className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <h2 className="text-lg font-semibold">No questions found</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {filter === "wrong"
                  ? "Great job — no wrong answers!"
                  : filter === "skipped"
                    ? "You didn't skip any questions."
                    : filter === "bookmarked"
                      ? "No bookmarked questions in this test."
                      : "No questions match this filter."}
            </p>
            </div>
            {filter !== "all" && (
              <Button variant="outline" size="sm" onClick={() => setFilter("all")}>
                Show all questions
              </Button>
            )}
          </CardContent>
        </Card>
      ) : current && currentQ ? (
        <>
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground font-medium min-w-fit">
              Question {currentIndex + 1} of {filtered.length}
            </span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / filtered.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <Card className="overflow-hidden">
            <CardContent className="p-5 sm:p-6 space-y-5">
              {/* Question header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="h-7 min-w-[1.75rem] px-2 rounded-lg bg-primary/10 text-primary text-sm font-bold inline-flex items-center justify-center">
                    {currentIndex + 1}
                  </span>
                  {current.selected_option == null && (
                    <Badge variant="secondary" className="text-xs">Skipped</Badge>
                  )}
                  {current.is_correct === true && (
                    <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 border-green-500/20 text-xs">Correct</Badge>
                  )}
                  {current.is_correct === false && (
                    <Badge variant="destructive" className="text-xs">Incorrect</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <ReportButton
                    questionId={currentQ.id}
                    questionText={currentQ.question_text}
                    questionNumber={currentIndex + 1}
                    className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => toggleBookmark(current.question_id)}
                    className={`inline-flex items-center justify-center p-2 rounded-md transition-colors ${
                      isBookmarked
                        ? "text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-950"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                  >
                    <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Question text */}
              <div className="text-base lg:text-lg leading-relaxed">
                <MathText text={currentQ.question_text} />
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {([1, 2, 3, 4] as const).map((idx) => {
                  const isSelected = current.selected_option === idx;
                  const isCorrect = currentQ.correct_option === idx;
                  const showCorrect = isCorrect && (!isSelected || current.is_correct === false);

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border-2 px-4 py-3.5 text-sm transition-all ${
                        isSelected
                          ? isCorrect
                            ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                            : "border-red-500 bg-red-50 dark:bg-red-950/20"
                          : showCorrect
                            ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/10"
                            : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 mt-0.5 ${
                            isSelected
                              ? isCorrect
                                ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                              : showCorrect
                                ? "bg-green-500 text-white"
                                : "border border-muted-foreground/30 text-muted-foreground"
                          }`}
                        >
                          {optionLabels[idx - 1]}
                        </span>
                        <span className="flex-1 leading-relaxed">
                          {currentQ[`option_${idx}` as keyof typeof currentQ]}
                        </span>
                        {isSelected && isCorrect && (
                          <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                        )}
                        {isSelected && !isCorrect && (
                          <X className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                        )}
                        {showCorrect && !isSelected && (
                          <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                        )}
                      </div>
                      {isSelected && (
                        <div className={`mt-2 text-xs font-medium flex items-center gap-1 ${
                          isCorrect ? "text-green-600" : "text-red-600"
                        }`}>
                          Your answer: {optionLabels[idx - 1]}
                        </div>
                      )}
                      {showCorrect && !isSelected && (
                        <div className="mt-2 text-xs font-medium flex items-center gap-1 text-green-600">
                          Correct answer: {optionLabels[idx - 1]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Explanation */}
          {currentQ.explanation && (
            <Card className="overflow-hidden">
              <button
                type="button"
                onClick={() => toggleExplanation(current.question_id)}
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Eye className={`h-4 w-4 ${expandedExplanations.has(current.question_id) ? "text-primary" : "text-muted-foreground"}`} />
                  Explanation
                </span>
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedExplanations.has(current.question_id) ? "rotate-90" : ""
                  }`}
                />
              </button>
              {expandedExplanations.has(current.question_id) && (
                <div className="px-5 pb-5 pt-0">
                  <div className="border-t pt-4 text-sm text-muted-foreground leading-relaxed">
                    {currentQ.explanation}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(currentIndex - 1)}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-1.5">
              {filtered.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? "w-6 bg-primary"
                      : filtered[idx].is_correct === true
                        ? "w-2 bg-green-500"
                        : filtered[idx].selected_option == null
                          ? "w-2 bg-muted-foreground/30"
                          : "w-2 bg-red-500"
                  }`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              disabled={currentIndex >= filtered.length - 1}
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="gap-1.5"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
