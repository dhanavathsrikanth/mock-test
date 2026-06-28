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
import Image from "next/image";
import { MathText } from "@/components/MathText";
import { MatchingQuestion, isMatchingQuestion } from "@/components/MatchingQuestion";

interface Question {
  id: string;
  question_text: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  image_url?: string;
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
  initialAnswers: Record<string, number>;
  initialBookmarks: Set<string>;
}

async function triggerStreakUpdate() {
  try {
    await fetch("/api/streak", { method: "POST" });
  } catch {}
}

async function awardTestXP(sessionId: string) {
  try {
    const res = await fetch("/api/xp/award", {
      method: "POST",
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
      }
    }
  } catch {}
}

async function addWrongToSRS(sessionId: string) {
  try {
    await fetch("/api/srs", {
      method: "POST",
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved"
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswer] = useState<Record<string, number | null>>({});
  const [bookmarks, setBookmarks] = useState(new Set<string>());
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
  }, []);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const saveAnswer = useCallback(
    async (questionId: string, option: number | null) => {
      setSaveStatus("saving");

      // is_correct is computed server-side on submission — never sent to client
      const { error } = await createClient()
        .from("test_answers")
        .upsert(
          {
            session_id: session.id,
            question_id: questionId,
            selected_option: option,
          },
          { onConflict: "session_id, question_id" }
        );

      setSaveStatus(error ? "error" : "saved");
      if (!error) {
        saveTimerRef.current = setTimeout(
          () => setSaveStatus("saved"),
          2000
        );
      }
    },
    [session.id]
  );

  const handleOptionClick = (optionIndex: number) => {
    if (!currentQuestion) return;
    const newValue =
      answers[currentQuestion.id] === optionIndex ? null : optionIndex;
    setAnswer({ ...answers, [currentQuestion.id]: newValue });
    saveAnswer(currentQuestion.id, newValue);
  };

  const handleBookmarkToggle = async () => {
    if (!currentQuestion) return;
    const isBookmarked = bookmarks.has(currentQuestion.id);
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

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const { submitTest } = await import("./actions");
    const result = await submitTest(session.id, userId);

    if (result.error) {
      setIsSubmitting(false);
      return;
    }

    triggerStreakUpdate();
    awardTestXP(session.id);
    addWrongToSRS(session.id);
    router.push(`/result/${session.id}`);
  };

  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  // ---- Exit guard: warn on tab close, back button, or navigation away ----
  const [showExitDialog, setShowExitDialog] = useState(false);
  const pendingExitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
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

    router.push = (url: string, options?: any) => {
      if (shouldBlock(url)) {
        pendingExitRef.current = () => originalPush(url, options);
        setShowExitDialog(true);
        return;
      }
      originalPush(url, options);
    };

    router.replace = (url: string, options?: any) => {
      if (shouldBlock(url)) {
        pendingExitRef.current = () => originalReplace(url, options);
        setShowExitDialog(true);
        return;
      }
      originalReplace(url, options);
    };

    const handlePopState = () => {
      setShowExitDialog(true);
      window.history.pushState(null, "", window.location.href);
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      router.push = originalPush;
      router.replace = originalReplace;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router, session.id]);

  const confirmExit = async () => {
    setShowExitDialog(false);
    setIsSubmitting(true);
    const { submitTest } = await import("./actions");
    await submitTest(session.id, userId);
    pendingExitRef.current?.();
  };

  const cancelExit = () => {
    setShowExitDialog(false);
    pendingExitRef.current = null;
  };

  useEffect(() => {
    const startTime = new Date(session.started_at).getTime();
    const end = startTime + session.duration_minutes * 60 * 1000;
    const remaining = Math.max(
      0,
      Math.floor((end - Date.now()) / 1000)
    );
    setTimeRemaining(remaining);

    let count = remaining;
    const interval = setInterval(() => {
      count--;
      setTimeRemaining(count);
      if (count <= 0) {
        clearInterval(interval);
        handleSubmitRef.current();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session.id, session.started_at, session.duration_minutes]);

  const answeredCount = Object.values(answers).filter(
    (v) => v != null
  ).length;
  const isCurrentBookmarked = bookmarks.has(currentQuestion?.id || "");
  const isLowTime = timeRemaining > 0 && timeRemaining <= 300;
  const isTimeUp = timeRemaining <= 0 && session.duration_minutes > 0;

  currentIndexRef.current = currentIndex;

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* ===== TOP EXAM BAR ===== */}
      <header className="shrink-0 border-b bg-card">
        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Q
              </span>
              <span className="text-sm font-bold tabular-nums">
                {currentIndex + 1}
                <span className="text-muted-foreground font-normal">
                  /{totalQuestions}
                </span>
              </span>
            </div>
            <div className="h-5 w-px bg-border" />
            <div className="text-xs text-muted-foreground">
              {session.mode === "custom" ? "Custom Test" : "Practice"}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Save status */}
            <div className="flex items-center gap-1.5">
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
                {saveStatus === "saving"
                  ? "Saving..."
                  : saveStatus === "saved"
                  ? "Saved"
                  : "Error"}
              </span>
            </div>

            <div className="h-5 w-px bg-border" />

            {/* Timer */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-semibold tabular-nums ${
                isTimeUp
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : isLowTime
                  ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 animate-pulse"
                  : "bg-muted"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatTime(timeRemaining)}
            </div>

            <div className="h-5 w-px bg-border" />

            {/* Bookmark */}
            <button
              type="button"
              onClick={handleBookmarkToggle}
              className={`p-2 rounded-lg transition-colors ${
                isCurrentBookmarked
                  ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title={isCurrentBookmarked ? "Remove bookmark" : "Bookmark this question"}
            >
              <Bookmark
                className={`h-4 w-4 ${isCurrentBookmarked ? "fill-current" : ""}`}
              />
            </button>

            {/* Report */}
            <ReportButton
              questionId={currentQuestion?.id || ""}
              questionText={currentQuestion?.question_text}
              questionNumber={currentIndex + 1}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              isReported={currentQuestion ? reportedQuestions.has(currentQuestion.id) : false}
              onReported={(id) => {
                setReportedQuestions(new Set(reportedQuestions).add(id));
                useExamStore.getState().markReported(id);
              }}
            />

            <div className="h-5 w-px bg-border" />

            {/* Submit */}
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={isSubmitting}
              size="sm"
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Submit Test
            </Button>
          </div>
        </div>

        {/* Mobile top bar */}
        <div className="flex lg:hidden items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">
              Q {currentIndex + 1}/{totalQuestions}
            </span>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded font-mono text-xs font-semibold tabular-nums ${
                isLowTime
                  ? "bg-yellow-500/10 text-yellow-600"
                  : "bg-muted text-foreground"
              }`}
            >
              <Clock className="h-3 w-3" />
              {formatTime(timeRemaining)}
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-muted"
          >
            {sidebarOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
            }}
          />
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex flex-1 min-h-0">
        {/* Question area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
            {currentQuestion && (
              <div className="space-y-6">
                {/* Question number badge + mobile report */}
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center h-8 min-w-[2rem] px-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                    {currentIndex + 1}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Question {currentIndex + 1} of {totalQuestions}
                  </span>
                  {answeredCount > 0 && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      {answeredCount}/{totalQuestions} answered
                    </span>
                  )}
                  <div className="lg:hidden ml-auto">
                    <ReportButton
                      questionId={currentQuestion?.id || ""}
                      questionText={currentQuestion?.question_text}
                      questionNumber={currentIndex + 1}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      isReported={currentQuestion ? reportedQuestions.has(currentQuestion.id) : false}
                      onReported={(id) => {
                        setReportedQuestions(new Set(reportedQuestions).add(id));
                        useExamStore.getState().markReported(id);
                      }}
                    />
                  </div>
                </div>

                {/* Question text */}
                {isMatchingQuestion(currentQuestion.question_text) ? (
                  <MatchingQuestion questionText={currentQuestion.question_text} />
                ) : (
                  <MathText text={currentQuestion.question_text} className="text-base lg:text-lg leading-relaxed font-medium" as="p" />
                )}

                {/* Image */}
                {currentQuestion.image_url && (
                  <div className="relative w-full max-h-96 overflow-hidden rounded-xl border bg-muted/30">
                    <Image
                      src={currentQuestion.image_url}
                      alt="Question image"
                      width={800}
                      height={400}
                      className="object-contain w-full h-auto"
                      unoptimized
                    />
                  </div>
                )}

                {/* Options */}
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((n) => {
                    const isSelected = answers[currentQuestion.id] === n;
                    const optionLabel = String.fromCharCode(64 + n);
                    const optionText = currentQuestion[`option_${n}` as keyof Question] as string;
                    const isMatchingCode = isMatchingQuestion(currentQuestion.question_text) && /^[A-P]\s*[-–]\s*\d/.test(optionText || "");
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleOptionClick(n)}
                        className={`w-full text-left rounded-xl border-2 px-5 py-4 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-muted-foreground/30 hover:bg-accent/50"
                        }`}
                      >
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
                            <div className="flex flex-wrap gap-2">
                              {optionText!.split(/[,\s]+/).filter(Boolean).map((pair, i) => {
                                const [code, num] = pair.split(/[-–]/);
                                return (
                                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-sm font-medium">
                                    <span className="font-bold text-primary">{code?.trim()}</span>
                                    <span className="text-muted-foreground">→</span>
                                    <span className="font-bold text-primary">{num?.trim()}</span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-sm leading-relaxed">
                              {optionText}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
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
                const isAnswered = answers[q.id] != null;
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
      <footer className="shrink-0 border-t bg-card sticky bottom-0 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          <Button
            variant="outline"
            size="sm"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(currentIndex - 1)}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {/* Mobile: bookmark + submit */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={handleBookmarkToggle}
              className={`p-2 rounded-lg transition-colors ${
                isCurrentBookmarked
                  ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Bookmark
                className={`h-4 w-4 ${isCurrentBookmarked ? "fill-current" : ""}`}
              />
            </button>
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={isSubmitting}
              size="sm"
            >
              <Send className="h-4 w-4 mr-1.5" />
              Submit
            </Button>
          </div>

          {/* Desktop: page indicator */}
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
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? "w-6 bg-primary"
                      : answers[questions[idx].id] != null
                      ? "w-2 bg-green-500"
                      : "w-2 bg-muted"
                  }`}
                />
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={currentIndex >= totalQuestions - 1}
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="gap-1.5"
          >
            Next
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
                  const isAnswered = answers[q.id] != null;
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
