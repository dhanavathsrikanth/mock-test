"use client";
import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useExamStore } from "./exam-store";
import { Button } from "@/components/ui/button";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  Send,
  PanelRightOpen,
  PanelRightClose,
  AlertTriangle,
} from "lucide-react";
import { ReportButton } from "@/components/report/ReportButton";
import { QuestionFigure, type QuestionImage } from "@/components/QuestionFigure";
import { NumericAnswerInput } from "@/components/NumericAnswerInput";
import { QuestionTypeTag } from "@/components/QuestionTypeTag";
import { formatMarks, negativeMarkLabel, questionMarks } from "@/lib/marking";
import { hasResponse, numericResponse, selection, toggleResponse, type QuestionResponse } from "@/lib/question-response";
import { MathText } from "@/components/MathText";
import { MatchingQuestion } from "@/components/MatchingQuestion";
import { MatchOption } from "@/components/MatchOption";
import { isMatchingQuestion, isMatchCodeOption } from "@/lib/matching-question-utils";
import { useToast } from "@/components/ui/toast-provider";

interface Question {
  id: string;
  question_text: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  image_url?: string;
  image_width?: number;
  image_height?: number;
  option_images?: QuestionImage[];
  source_question_number?: number;
  year?: number;
  paper?: string;
  question_type?: "MCQ" | "MSQ" | "NAT";
  answer_decimal_places?: number | null;
  marks?: number;
  negative_marks?: number;
}

interface SessionData {
  id: string;
  total_questions: number;
  duration_minutes: number;
  started_at: string;
  mode: string;
}

interface ExamClientProps {
  userId: string;
  session: SessionData;
  questions: Question[];
  initialAnswers: Record<string, QuestionResponse>;
  initialBookmarks: Set<string>;
}

async function triggerStreakUpdate() {
  try {
    await fetch("/api/streak", { method: "POST", keepalive: true });
  } catch {}
}

async function awardTestXP(sessionId: string) {
  try {
    const res = await fetch("/api/xp/award", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof window !== "undefined") {
        const { useXPStore } = await import("@/lib/stores/xp-store");
        useXPStore.getState().addToast(data.xpAwarded, "Test completed");
        if (data.leveledUp) {
          useXPStore.getState().showLevelUp({
            levelName: data.newLevelName,
            levelNumber: data.newLevelNumber,
            xpGained: data.xpAwarded,
          });
        }
        if (data.newBadges && data.newBadges.length > 0) {
          for (const badge of data.newBadges) {
            useXPStore.getState().addToast(
              badge.xp_reward,
              `${badge.icon_emoji} Badge Earned: ${badge.name}`
            );
          }
        }
      }
    }
  } catch {}
}

async function addWrongToSRS(sessionId: string) {
  try {
    await fetch("/api/srs", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "process-session", sessionId }),
    });
  } catch {}
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ExamClient({
  userId,
  session,
  questions,
  initialAnswers,
  initialBookmarks,
}: ExamClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const advancingRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved"
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswer] = useState<Record<string, QuestionResponse>>(() => ({ ...initialAnswers }));
  const [bookmarks, setBookmarks] = useState(() => new Set(initialBookmarks));
  const [reportedQuestions, setReportedQuestions] = useState(new Set<string>());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentIndexRef = useRef(0);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    useExamStore.setState({
      answers: Object.fromEntries(
        Object.entries(initialAnswers).map(([k, v]) => [k, v])
      ),
      bookmarks: new Set(initialBookmarks),
    });
  }, [initialAnswers, initialBookmarks]);

  const currentQuestion = questions[currentIndex];
  const currentSourceLabel = currentQuestion
    ? [
        currentQuestion.year ? String(currentQuestion.year) : null,
        currentQuestion.paper || null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const totalQuestions = questions.length;
  const pendingSaves = useRef(new Set<Promise<unknown>>());
  const saveQueues = useRef(new Map<string, Promise<unknown>>());

  const saveAnswer = useCallback(
    async (questionId: string, option: QuestionResponse) => {
      setSaveStatus("saving");

      // is_correct is computed server-side on submission — never sent to client
      const previous = saveQueues.current.get(questionId) || Promise.resolve();
      const request = previous.catch(() => undefined).then(() => createClient()
        .from("test_answers")
        .upsert(
          {
            session_id: session.id,
            question_id: questionId,
            selected_option: typeof option === "number" ? option : null,
            selected_options: Array.isArray(option) ? option : null,
            numeric_answer: numericResponse(option),
          },
          { onConflict: "session_id, question_id" }
        ));
      saveQueues.current.set(questionId, request);
      pendingSaves.current.add(request);
      const { error } = await request.finally(() => pendingSaves.current.delete(request));

      setSaveStatus(error ? "error" : "saved");
      if (!error) {
        saveTimerRef.current = setTimeout(
          () => setSaveStatus("saved"),
          2000
        );
      }
      return !error;
    },
    [session.id]
  );

  const handleOptionClick = (optionIndex: number) => {
    if (!currentQuestion) return;
    const newValue = toggleResponse(answers[currentQuestion.id], optionIndex, currentQuestion.question_type === "MSQ");
    setAnswer({ ...answers, [currentQuestion.id]: newValue });
    saveAnswer(currentQuestion.id, newValue);
  };

  const handleSaveAndNext = async () => {
    if (!currentQuestion || advancingRef.current || currentIndex >= totalQuestions - 1) return;

    advancingRef.current = true;
    setIsAdvancing(true);
    try {
      const currentAnswer = answers[currentQuestion.id];
      if (hasResponse(currentAnswer)) {
        const saved = await saveAnswer(currentQuestion.id, currentAnswer);
        if (!saved) {
          toast("Your answer could not be saved. Please try again.", "error");
          return;
        }
      }

      const pendingResults = await Promise.all([...pendingSaves.current]);
      const hasPendingError = pendingResults.some(
        (result) => Boolean((result as { error?: unknown } | null)?.error)
      );
      if (hasPendingError) {
        setSaveStatus("error");
        toast("An answer could not be saved. Please try again.", "error");
        return;
      }

      setCurrentIndex((index) => Math.min(index + 1, totalQuestions - 1));
    } finally {
      advancingRef.current = false;
      setIsAdvancing(false);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!currentQuestion) return;
    const next = new Set(bookmarks);
    if (next.has(currentQuestion.id)) {
      next.delete(currentQuestion.id);
      await createClient()
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("question_id", currentQuestion.id);
    } else {
      next.add(currentQuestion.id);
      await createClient()
        .from("bookmarks")
        .insert({ user_id: userId, question_id: currentQuestion.id });
      await fetch("/api/srs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          questionId: currentQuestion.id,
        }),
      });
    }
    setBookmarks(next);
  };

  const submittedRef = useRef(false);

  const redirectToResults = () => {
    // Use window.location to bypass router push override (exit guard blocks navigation away from /test/)
    window.location.href = `/result/${session.id}`;
  };

  const handleSubmit = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    setShowConfirm(false);

    try {
      const { submitTest } = await import("./actions");
      await Promise.all([...pendingSaves.current]);
      const result = await submitTest(session.id, userId, answers);

      if (result?.error) {
        submittedRef.current = false;
        setIsSubmitting(false);
        toast(result.error, "error");
        return;
      }

      triggerStreakUpdate();
      void awardTestXP(session.id);
      addWrongToSRS(session.id);
      redirectToResults();
    } catch {
      submittedRef.current = false;
      setIsSubmitting(false);
      toast("Failed to submit test. Please try again.", "error");
    }
  };

  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  // ---- Exit guard: warn on tab close, back button, or navigation away ----
  const [showExitDialog, setShowExitDialog] = useState(false);
  const pendingExitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // The test has already been submitted (manually or by the timer); allow
      // the results redirect without showing the browser's native leave prompt.
      if (submittedRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const originalPush = router.push.bind(router);
    const originalReplace = router.replace.bind(router);

    const shouldBlock = (url: string) => {
      if (url.startsWith(`/test/${session.id}`)) return false;
      if (url === `/test/${session.id}`) return false;
      return true;
    };

    router.push = (url: string, options?: { scroll?: boolean }) => {
      if (shouldBlock(url)) {
        pendingExitRef.current = () => originalPush(url, options);
        setShowExitDialog(true);
        return;
      }
      originalPush(url, options);
    };

    router.replace = (url: string, options?: { scroll?: boolean }) => {
      if (shouldBlock(url)) {
        pendingExitRef.current = () => originalReplace(url, options);
        setShowExitDialog(true);
        return;
      }
      originalReplace(url, options);
    };

    return () => {
      router.push = originalPush;
      router.replace = originalReplace;
    };
  }, [router, session.id]);

  const confirmExit = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setShowExitDialog(false);
    setIsSubmitting(true);

    try {
      const { submitTest } = await import("./actions");
      await Promise.all([...pendingSaves.current]);
      const result = await submitTest(session.id, userId, answers);

      if (result?.error) {
        submittedRef.current = false;
        setIsSubmitting(false);
        toast(result.error, "error");
        return;
      }

      triggerStreakUpdate();
      void awardTestXP(session.id);
      addWrongToSRS(session.id);
      pendingExitRef.current?.();
    } catch {
      submittedRef.current = false;
      setIsSubmitting(false);
      toast("Failed to submit test. Please try again.", "error");
    }
  };

  const cancelExit = () => {
    setShowExitDialog(false);
    pendingExitRef.current = null;
  };

  // Wall-clock based timer — immune to browser throttling
  useEffect(() => {
    if (session.duration_minutes <= 0) return;
    const startTime = new Date(session.started_at).getTime();
    const endTime = startTime + session.duration_minutes * 60 * 1000;

    const calcRemaining = () => Math.max(0, Math.floor((endTime - Date.now()) / 1000));

    setTimeRemaining(calcRemaining());

    const interval = setInterval(() => {
      const remaining = calcRemaining();
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        handleSubmitRef.current();
      }
    }, 1000);

    // When user returns to tab, immediately recalculate (catches up after background throttling)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const remaining = calcRemaining();
        setTimeRemaining(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          handleSubmitRef.current();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [session.id, session.started_at, session.duration_minutes]);

  const answeredCount = Object.values(answers).filter(
    (v) => hasResponse(v)
  ).length;
  const isCurrentBookmarked = bookmarks.has(currentQuestion?.id || "");
  const isLowTime = timeRemaining > 0 && timeRemaining <= 300;
  const isTimeUp = timeRemaining <= 0 && session.duration_minutes > 0;

  currentIndexRef.current = currentIndex;

  return (
    <div className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
      {/* ===== MAIN CONTENT ===== */}
      <div className="flex flex-1 min-h-0">
        {/* Question area */}
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto overscroll-contain">
          <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
            <div className="max-w-2xl mx-auto flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Question {currentIndex + 1} of {totalQuestions}</div>
                {answeredCount > 0 && (
                  <div className="text-xs font-medium text-green-600 dark:text-green-400">
                    {answeredCount}/{totalQuestions} answered
                  </div>
                )}
              </div>

              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <div
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-mono text-xs font-semibold tabular-nums ${
                    isTimeUp
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : isLowTime
                      ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 animate-pulse"
                      : "bg-muted text-foreground"
                  }`}
                  aria-label="Time remaining"
                >
                  <Clock className="h-3.5 w-3.5" />
                  {session.duration_minutes > 0 ? formatTime(timeRemaining) : "Untimed"}
                </div>

                <div className="flex items-center gap-1.5" role="status" aria-live="polite">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      saveStatus === "saving"
                        ? "bg-yellow-500 animate-pulse"
                        : saveStatus === "saved"
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Save failed"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label={sidebarOpen ? "Close question palette" : "Open question palette"}
                    aria-expanded={sidebarOpen}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
                  >
                    {sidebarOpen ? (
                      <PanelRightClose className="h-4 w-4" />
                    ) : (
                      <PanelRightOpen className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleBookmarkToggle}
                    aria-label={isCurrentBookmarked ? "Remove bookmark" : "Bookmark this question"}
                    aria-pressed={isCurrentBookmarked}
                    title={isCurrentBookmarked ? "Remove bookmark" : "Bookmark this question"}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isCurrentBookmarked
                        ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${isCurrentBookmarked ? "fill-current" : ""}`} />
                  </button>
                  <ReportButton
                    questionId={currentQuestion?.id || ""}
                    questionText={currentQuestion?.question_text}
                    questionNumber={currentIndex + 1}
                    className="h-9 w-9 justify-center rounded-lg border border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    isReported={currentQuestion ? reportedQuestions.has(currentQuestion.id) : false}
                    onReported={(id) => {
                      setReportedQuestions(new Set(reportedQuestions).add(id));
                      useExamStore.getState().markReported(id);
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="h-1 bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 lg:py-7">
            {currentQuestion && (
              <div className="space-y-6">
                <QuestionTypeTag type={currentQuestion.question_type} />

                <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <span>Correct: +{formatMarks(questionMarks(currentQuestion).positive)}</span>
                  <span>Wrong: {questionMarks(currentQuestion).negative > 0 ? `−${negativeMarkLabel(currentQuestion)}` : "0"}</span>
                  <span>Unattempted: 0</span>
                  {currentSourceLabel && <span className="ml-auto font-medium">{currentSourceLabel}</span>}
                </div>

                {currentQuestion.question_type === "MSQ" && <p className="text-sm font-medium text-primary">Multiple select: choose all correct options. Full marks only for the exact set; no partial credit or negative marking.</p>}

                {/* Question text */}
                {isMatchingQuestion(currentQuestion.question_text) ? (
                  <MatchingQuestion text={currentQuestion.question_text} />
                ) : (
                  <MathText
                    text={currentQuestion.question_text}
                    className="question-content text-base lg:text-lg leading-relaxed font-medium"
                    as="div"
                  />
                )}

                {currentQuestion.image_url && <QuestionFigure image={{ url: currentQuestion.image_url, width: currentQuestion.image_width, height: currentQuestion.image_height, alt: `Original diagram for question ${currentQuestion.source_question_number || currentIndex + 1}` }} />}

                {/* NAT questions have no answer choices. */}
                {currentQuestion.question_type === "NAT" ? (
                  <NumericAnswerInput
                    value={typeof answers[currentQuestion.id] === "string" ? answers[currentQuestion.id] as string : ""}
                    decimalPlaces={currentQuestion.answer_decimal_places}
                    onChange={(value) => {
                      setAnswer(previous => ({ ...previous, [currentQuestion.id]: value }));
                      saveAnswer(currentQuestion.id, value);
                    }}
                  />
                ) : (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((n) => {
                    const isSelected = selection(answers[currentQuestion.id]).includes(n);
                    const optionLabel = String.fromCharCode(64 + n);
                    const optionText = currentQuestion[`option_${n}` as keyof Question] as string;
                    const isMatchingCode = isMatchCodeOption(optionText || "");
                    return (
                      <div
                        key={n}
                        className={`w-full rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-muted-foreground/30 hover:bg-accent/50"
                        }`}
                      >
                      <button type="button" onClick={() => handleOptionClick(n)} aria-pressed={isSelected} className="w-full rounded-xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <div className="flex items-center gap-4">
                          <span
                            className={`inline-flex items-center justify-center h-8 min-w-[2rem] px-2 rounded-lg text-sm font-bold ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {optionLabel}
                          </span>
                          {isMatchingCode ? (
                            <MatchOption text={optionText || ""} className="text-sm" />
                          ) : (
                            <div className="min-w-0 flex-1 space-y-2">
                              <MathText text={optionText || ""} className="text-base leading-relaxed" />
                              {currentQuestion.option_images?.[n - 1] && <QuestionFigure image={currentQuestion.option_images[n - 1]} inline />}
                            </div>
                          )}
                        </div>
                      </button>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== QUESTION PALETTE (Desktop) ===== */}
        <aside className="hidden lg:flex flex-col w-64 border-l bg-card shrink-0">
          <div className="p-4 border-b">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Question Palette
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = hasResponse(answers[q.id]);
                const isBookmarked = bookmarks.has(q.id);
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative h-10 rounded-lg text-sm font-semibold transition-all ${
                      isCurrent
                        ? "ring-2 ring-primary bg-primary text-primary-foreground shadow-sm"
                        : isAnswered
                        ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {idx + 1}
                    {isBookmarked && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-yellow-500 border-2 border-card" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="p-4 border-t space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-3 w-3 rounded bg-primary" />
              <span>Current</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-3 w-3 rounded bg-green-500/20 border border-green-500/40" />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-3 w-3 rounded bg-muted" />
              <span>Unanswered ({totalQuestions - answeredCount})</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative h-3 w-3">
                <span className="absolute inset-0 rounded bg-muted" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-yellow-500" />
              </span>
              <span>Bookmarked ({bookmarks.size})</span>
            </div>
          </div>
        </aside>
      </div>

      {/* ===== BOTTOM NAVIGATION BAR ===== */}
      <footer className="relative z-10 shrink-0 border-t bg-card shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-2 px-3 sm:px-6 h-16">
          <Button
            variant="outline"
            size="sm"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(currentIndex - 1)}
            className="shrink-0 gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
            <div className="hidden lg:flex items-center gap-1">
              {questions.slice(
                Math.max(0, currentIndex - 2),
                Math.min(totalQuestions, currentIndex + 3)
              ).map((_, i) => {
                const idx = Math.max(0, currentIndex - 2) + i;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Go to question ${idx + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentIndex
                        ? "w-6 bg-primary"
                        : hasResponse(answers[questions[idx].id])
                        ? "w-2 bg-green-500"
                        : "w-2 bg-muted"
                    }`}
                  />
                );
              })}
            </div>

            <Button
              variant="outline"
              onClick={() => setShowConfirm(true)}
              disabled={isSubmitting}
              size="sm"
              className="shrink-0 gap-1.5"
            >
              <Send className="h-4 w-4" />
              <span className="sm:hidden">Submit</span>
              <span className="hidden sm:inline">Submit Test</span>
            </Button>
          </div>

          <Button
            size="sm"
            disabled={currentIndex >= totalQuestions - 1 || isAdvancing || isSubmitting}
            onClick={handleSaveAndNext}
            className="shrink-0 gap-1 whitespace-nowrap"
          >
            {isAdvancing ? "Saving…" : "Save & Next"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>

      {/* ===== MOBILE QUESTION PALETTE (overlay) ===== */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="ml-auto relative w-72 bg-background border-l shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-semibold">Question Palette</h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md hover:bg-muted"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = hasResponse(answers[q.id]);
                  const isBookmarked = bookmarks.has(q.id);
                  const isCurrent = idx === currentIndex;

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setCurrentIndex(idx);
                        setSidebarOpen(false);
                      }}
                      className={`relative h-10 rounded-lg text-sm font-semibold transition-all ${
                        isCurrent
                          ? "ring-2 ring-primary bg-primary text-primary-foreground"
                          : isAnswered
                          ? "bg-green-500/10 text-green-700 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {idx + 1}
                      {isBookmarked && (
                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-yellow-500 border-2 border-background" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t">
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={isSubmitting}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-1.5" />
                {isSubmitting ? "Submitting..." : "Submit Test"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== SUBMIT CONFIRMATION DIALOG ===== */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowConfirm(false)}
          />
          <div className="relative bg-background rounded-xl shadow-2xl border w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Submit Test?</h2>
                <p className="text-sm text-muted-foreground">
                  You have answered {answeredCount} of {totalQuestions} questions.
                </p>
              </div>
            </div>
            {answeredCount < totalQuestions && (
              <p className="text-sm text-muted-foreground">
                You still have{" "}
                <span className="font-medium text-foreground">
                  {totalQuestions - answeredCount}
                </span>{" "}
                unanswered questions.
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={isSubmitting}
              >
                Continue Test
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Test"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EXIT TEST DIALOG ===== */}
      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={cancelExit}
          />
          <div className="relative bg-background rounded-xl shadow-2xl border w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Leave Test?</h2>
                <p className="text-sm text-muted-foreground">
                  Your test will be automatically submitted if you leave.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              You have answered{" "}
              <span className="font-medium text-foreground">{answeredCount}</span>{" "}
              of {totalQuestions} questions so far.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={cancelExit}
                disabled={isSubmitting}
              >
                Stay on Test
              </Button>
              <Button
                variant="destructive"
                onClick={confirmExit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit & Leave"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
