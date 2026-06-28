"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Bookmark, ArrowLeft, Check, X, Minus, Eye, AlertTriangle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ReportButton } from "@/components/report/ReportButton";
import { MathText } from "@/components/MathText";
import { MatchingQuestion, isMatchingQuestion } from "@/components/MatchingQuestion";

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
    image_url?: string | null;
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
    <div className="h-[100dvh] lg:h-auto flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-6 pt-4 pb-3 border-b bg-card">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Button variant="ghost" size="sm" asChild className="mb-1 -ml-2">
                <Link href={`/result/${sessionId}`}>
                  <ArrowLeft className="h-4 w-4" />
                  Back to Results
                </Link>
              </Button>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Review Answers</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 bg-green-500/10 text-green-700 dark:text-green-400 px-2.5 py-1.5 rounded-lg text-sm font-medium">
                <Check className="h-3.5 w-3.5" />
                {correctCount}
              </div>
              <div className="flex items-center gap-1.5 bg-red-500/10 text-red-700 dark:text-red-400 px-2.5 py-1.5 rounded-lg text-sm font-medium">
                <X className="h-3.5 w-3.5" />
                {wrongCount}
              </div>
              <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground">
                <Minus className="h-3.5 w-3.5" />
                {skippedCount}
              </div>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 mt-3 -mx-1 px-1">
            {FILTERS.map((f) => {
              const count = getFilterCount(f.key);
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border transition-colors whitespace-nowrap ${
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
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-4">
          {/* Empty state */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <h2 className="text-lg font-semibold">No questions found</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {filter === "wrong"
                    ? "Great job \u2014 no wrong answers!"
                    : filter === "skipped"
                      ? "You didn\u2019t skip any questions."
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
            </div>
          ) : current && currentQ ? (
            <>
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground font-medium min-w-fit">
                  {currentIndex + 1} / {filtered.length}
                </span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / filtered.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Card */}
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Question header */}
                  <div className="flex items-center justify-between gap-3">
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
                  <div className="text-sm sm:text-base lg:text-lg leading-relaxed">
                    {isMatchingQuestion(currentQ.question_text) ? (
                      <MatchingQuestion questionText={currentQ.question_text} />
                    ) : (
                      <MathText text={currentQ.question_text} />
                    )}
                  </div>

                  {/* Image */}
                  {currentQ.image_url && (
                    <div className="relative w-full max-h-80 overflow-hidden rounded-xl border bg-muted/30">
                      <Image
                        src={currentQ.image_url}
                        alt="Question image"
                        width={800}
                        height={400}
                        className="object-contain w-full h-auto"
                        unoptimized
                      />
                    </div>
                  )}

                  {/* Options */}
                  <div className="space-y-2.5">
                    {([1, 2, 3, 4] as const).map((idx) => {
                      const isSelected = current.selected_option === idx;
                      const isCorrect = currentQ.correct_option === idx;
                      const showCorrect = isCorrect && (!isSelected || current.is_correct === false);

                      return (
                        <div
                          key={idx}
                          className={`rounded-xl border-2 px-3.5 py-3 text-sm transition-all ${
                            isSelected
                              ? isCorrect
                                ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                                : "border-red-500 bg-red-50 dark:bg-red-950/20"
                              : showCorrect
                                ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/10"
                                : "border-border bg-card"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
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
                            <span className="flex-1 leading-relaxed break-words">
                              {(() => {
                                const optionText = currentQ[`option_${idx}` as keyof typeof currentQ] as string;
                                const isMatchingCode = isMatchingQuestion(currentQ.question_text) && /^[A-P]\s*[-–]\s*\d/.test(optionText || "");
                                if (isMatchingCode) {
                                  return (
                                    <div className="flex flex-wrap gap-1.5">
                                      {optionText!.split(/[,\s]+/).filter(Boolean).map((pair, i) => {
                                        const [code, num] = pair.split(/[-–]/);
                                        return (
                                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-xs font-medium">
                                            <span className="font-bold text-primary">{code?.trim()}</span>
                                            <span className="text-muted-foreground">→</span>
                                            <span className="font-bold text-primary">{num?.trim()}</span>
                                          </span>
                                        );
                                      })}
                                    </div>
                                  );
                                }
                                return optionText;
                              })()}
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
                            <div className={`mt-1.5 text-xs font-medium flex items-center gap-1 ${
                              isCorrect ? "text-green-600" : "text-red-600"
                            }`}>
                              Your answer: {optionLabels[idx - 1]}
                            </div>
                          )}
                          {showCorrect && !isSelected && (
                            <div className="mt-1.5 text-xs font-medium flex items-center gap-1 text-green-600">
                              Correct answer: {optionLabels[idx - 1]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Explanation */}
              {currentQ.explanation && (
                <div className="rounded-xl border bg-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleExplanation(current.question_id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
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
                    <div className="px-4 pb-4 pt-0">
                      <div className="border-t pt-3 text-sm text-muted-foreground leading-relaxed">
                        {currentQ.explanation}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Navigation - fixed at bottom */}
      {filtered.length > 0 && current && currentQ && (
        <div className="shrink-0 border-t bg-card px-4 sm:px-6 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(currentIndex - 1)}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <span className="text-sm text-muted-foreground font-medium tabular-nums">
              {currentIndex + 1} / {filtered.length}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex >= filtered.length - 1}
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="gap-1.5"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
