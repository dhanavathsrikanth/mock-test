"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Bookmark, ArrowLeft, Check, X, Minus, Eye, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { QuestionFigure, type QuestionImage } from "@/components/QuestionFigure";
import { QuestionTypeTag } from "@/components/QuestionTypeTag";
import { numericAnswerLabel, multipleAnswerLabel } from "@/lib/question-response";
import { ReportButton } from "@/components/report/ReportButton";
import { MathText } from "@/components/MathText";
import { QuestionExplanation } from "@/components/QuestionExplanation";
import { MatchingQuestion } from "@/components/MatchingQuestion";
import { MatchOption } from "@/components/MatchOption";
import { isMatchingQuestion, isMatchCodeOption } from "@/lib/matching-question-utils";

interface AnswerData {
  numeric_answer?: string | null;
  selected_options?: number[] | null;
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
    correct_option: number | null;
    marks_to_all?: boolean;
    question_type?: "MCQ" | "MSQ" | "NAT";
    correct_options?: number[] | null;
    correct_option_sets?: number[][] | null;
    answer_min?: string | number | null;
    answer_max?: number | string | null;
    answer_ranges?: { min: number; max: number }[] | null;
    explanation: string | null;
    image_url?: string | null;
    image_width?: number;
    image_height?: number;
    option_images?: QuestionImage[];
  };
}

interface ReviewContentProps {
  answers: AnswerData[];
  bookmarkedIds: Set<string>;
  userId: string;
  sessionId: string;
  initialFilter?: string;
}

const FILTERS: { key: string; label: string; icon: typeof X }[] = [
  { key: "all", label: "All", icon: X },
  { key: "correct", label: "Correct", icon: Check },
  { key: "wrong", label: "Wrong", icon: X },
  { key: "skipped", label: "Skipped", icon: Minus },
  { key: "bookmarked", label: "Bookmarked", icon: Bookmark },
];

export function ReviewContent({
  answers,
  bookmarkedIds,
  userId,
  sessionId,
  initialFilter,
}: ReviewContentProps) {
  const [filter, setFilter] = useState<string>(FILTERS.some(item => item.key === initialFilter) ? initialFilter! : "all");
  const [bookmarks, setBookmarks] = useState(bookmarkedIds);
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const bookmarkBusy = useRef(false);
  const [bookmarkFeedback, setBookmarkFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());
  const questionListRef = useRef<HTMLDivElement>(null);
  const previousFilter = useRef(filter);

  const filtered = useMemo(() => {
    let list = answers;
    if (filter === "correct") list = list.filter(a => a.is_correct === true);
    if (filter === "wrong") {
      list = list.filter(a => (a.numeric_answer != null || a.selected_option != null || !!a.selected_options?.length) && a.is_correct === false);
    }
    if (filter === "skipped") {
      list = list.filter(a => !a.questions.marks_to_all && (a.numeric_answer == null && a.selected_option == null && !a.selected_options?.length));
    }
    if (filter === "bookmarked") {
      list = list.filter(a => bookmarks.has(a.question_id));
    }
    return list;
  }, [filter, answers, bookmarks]);

  useEffect(() => {
    if (previousFilter.current === filter) return;
    previousFilter.current = filter;
    questionListRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [filter]);


  const toggleBookmark = async (questionId: string) => {
    if (bookmarkBusy.current) return;
    bookmarkBusy.current = true;
    setBookmarkPending(true);
    setBookmarkFeedback(null);
    const removing = bookmarks.has(questionId);
    try {
      const client = createClient();
      const { error } = removing
        ? await client.from("bookmarks").delete().eq("user_id", userId).eq("question_id", questionId)
        : await client.from("bookmarks").insert({ user_id: userId, question_id: questionId });
      if (error) throw error;
      setBookmarks(previous => {
        const next = new Set(previous);
        if (removing) next.delete(questionId);
        else next.add(questionId);
        return next;
      });
      setBookmarkFeedback({ error: false, message: removing ? "Bookmark removed." : "Question bookmarked." });
    } catch {
      setBookmarkFeedback({ error: true, message: "Unable to update bookmark. Please try again." });
    } finally {
      bookmarkBusy.current = false;
      setBookmarkPending(false);
    }
  };

  const toggleExplanation = (questionId: string) => {
    const next = new Set(expandedExplanations);
    if (next.has(questionId)) next.delete(questionId);
    else next.add(questionId);
    setExpandedExplanations(next);
  };

  const wrongCount = answers.filter(a => (a.numeric_answer != null || a.selected_option != null || !!a.selected_options?.length) && a.is_correct === false).length;
  const skippedCount = answers.filter(a => !a.questions.marks_to_all && (a.numeric_answer == null && a.selected_option == null && !a.selected_options?.length)).length;
  const correctCount = answers.filter(a => a.is_correct === true).length;
  const allCount = answers.length;

  const getFilterCount = (key: string) => {
    switch (key) {
      case "all": return allCount;
      case "correct": return correctCount;
      case "wrong": return wrongCount;
      case "skipped": return skippedCount;
      case "bookmarked": return answers.filter(answer => bookmarks.has(answer.question_id)).length;
      default: return 0;
    }
  };

  const optionLabels = ["A", "B", "C", "D"];

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-background">
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

        </div>
      </div>

      {/* Keep filters within reach while reading the question list. */}
      <div className="sticky top-0 z-20 shrink-0 border-b bg-card px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div role="group" aria-label="Filter review questions" className="flex gap-2 overflow-x-auto -mx-1 px-1 py-1">
            {FILTERS.map((f) => {
              const count = getFilterCount(f.key);
              return (
                <button
                  key={f.key}
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border transition-colors whitespace-nowrap ${
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

      {bookmarkFeedback && <p role={bookmarkFeedback.error ? "alert" : "status"} className={`mx-4 my-2 shrink-0 rounded-lg border p-3 text-sm ${bookmarkFeedback.error ? "text-destructive" : "text-muted-foreground"}`}>{bookmarkFeedback.message}</p>}
      {/* One continuous question list on every screen size. */}
      <div className="flex-1 min-h-0">
        <div ref={questionListRef} role="region" aria-label="Review questions" className="max-w-4xl mx-auto scroll-mt-24 px-4 sm:px-6 py-4 space-y-8">
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
          ) : filtered.map((current, questionIndex) => {
            const currentQ = current.questions;
            const isBookmarked = bookmarks.has(current.question_id);
            return (
            <article key={current.question_id} aria-label={`Question ${questionIndex + 1} of ${filtered.length}`} className="space-y-4">
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground font-medium min-w-fit">
                  {questionIndex + 1} / {filtered.length}
                </span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${((questionIndex + 1) / filtered.length) * 100}%` }}
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
                        {questionIndex + 1}
                      </span>
                      <QuestionTypeTag type={currentQ.question_type} />
                      {!currentQ.marks_to_all && (current.numeric_answer == null && current.selected_option == null && !current.selected_options?.length) && (
                        <Badge variant="secondary" className="text-xs">Skipped</Badge>
                      )}
                      {current.is_correct === true && (
                        <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 border-green-500/20 text-xs">{currentQ.marks_to_all ? 'Marks to all' : 'Correct'}</Badge>
                      )}
                      {current.is_correct === false && (
                        <Badge variant="destructive" className="text-xs">Incorrect</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <ReportButton
                        questionId={currentQ.id}
                        questionText={currentQ.question_text}
                        questionNumber={questionIndex + 1}
                        className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => toggleBookmark(current.question_id)}
                        disabled={bookmarkPending}
                        aria-busy={bookmarkPending}
                        className={`inline-flex h-11 w-11 items-center justify-center p-2 rounded-md transition-colors disabled:opacity-50 ${
                          isBookmarked
                            ? "text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-950"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                        title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                        aria-label={isBookmarked ? "Remove bookmark" : "Bookmark question"}
                        aria-pressed={isBookmarked}
                      >
                        <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Question text */}
                  <div className="text-sm sm:text-base lg:text-lg leading-relaxed">
                    {isMatchingQuestion(currentQ.question_text) ? (
                      <MatchingQuestion text={currentQ.question_text} />
                    ) : (
                      <MathText text={currentQ.question_text} as="div" className="question-content" />
                    )}
                  </div>

                  {/* Image */}
                  {currentQ.image_url && <QuestionFigure image={{ url: currentQ.image_url, width: currentQ.image_width, height: currentQ.image_height }} />}

                  {/* Options */}
                  {currentQ.question_type === "NAT" ? (
                    <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
                      <p>Your numerical answer: <strong>{current.numeric_answer ?? "Unattempted"}</strong></p>
                      <p><strong>{numericAnswerLabel(currentQ.answer_min, currentQ.answer_max, currentQ.answer_ranges)}</strong></p>
                      <p className="text-xs text-muted-foreground">No negative marking or partial credit.</p>
                    </div>
                  ) : (
                  <>
                  {currentQ.question_type === "MSQ" && <p className="text-xs text-muted-foreground">Multiple select: the complete correct set is required. No partial credit or negative marking.</p>}
                  {currentQ.correct_option_sets && <p className="text-sm font-medium text-green-700 dark:text-green-300">{multipleAnswerLabel(currentQ.correct_option_sets)}</p>}
                  <div className="space-y-2.5">
                    {([1, 2, 3, 4] as const).map((idx) => {
                      const isSelected = current.selected_options?.includes(idx) || current.selected_option === idx;
                      const isCorrect = !!currentQ.marks_to_all || (currentQ.question_type === "MSQ" ? !!currentQ.correct_options?.includes(idx) : currentQ.correct_option_sets ? currentQ.correct_option_sets.some(set => set.length === 1 && set[0] === idx) : currentQ.correct_option === idx);
                      const showCorrect = !currentQ.marks_to_all && isCorrect && (!isSelected || current.is_correct === false);

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
                            <div className="min-w-0 flex-1 leading-relaxed break-words">
                              {(() => {
                                const optionText = currentQ[`option_${idx}` as keyof typeof currentQ] as string;
                                if (isMatchCodeOption(optionText || "")) {
                                  return <MatchOption text={optionText || ""} className="text-xs" />;
                                }
                                return <>
                                  <MathText text={optionText || ""} />
                                  {currentQ.option_images?.[idx - 1] && <QuestionFigure image={currentQ.option_images[idx - 1]} inline />}
                                </>;
                              })()}
                            </div>
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
                  </>
                  )}
                </div>
              </div>

              {/* Explanation */}
              {currentQ.explanation && (
                <div className="rounded-xl border bg-card overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={expandedExplanations.has(current.question_id)}
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
                        <QuestionExplanation text={currentQ.explanation} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
            );
          })}
        </div>
      </div>

    </div>
  );
}
