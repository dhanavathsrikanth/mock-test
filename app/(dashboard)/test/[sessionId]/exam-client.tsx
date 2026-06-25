"use client";
import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useExamStore } from "./exam-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Bookmark, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Send, 
  PanelRightOpen, 
  PanelRightClose, 
} from "lucide-react";
import { ReportButton } from "@/components/report/ReportButton";
import Image from "next/image";

interface Question {
  id: string;
  question_text: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_option: number;
  image_url?: string; // Added for image support
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
  } catch {
    // Silently fail - streak update should not block navigation
  }
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
  } catch {
    // Silently fail
  }
}

async function addWrongToSRS(sessionId: string) {
  try {
    await fetch("/api/srs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "process-session", sessionId }),
    });
  } catch {
    // Silently fail
  }
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
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswer] = useState<Record<string, number | null>>({});
  const [bookmarks, setBookmarks] = useState(new Set<string>());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentIndexRef = useRef(0);

  const getSupabase = useCallback(() => createClient(), []);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const initialAnswersMap = Object.fromEntries(
      Object.entries(initialAnswers).map(([k, v]) => [k, v])
    );
    useExamStore.setState({
      answers: Object.fromEntries(Object.entries(initialAnswers).map(([k, v]) => [k, v])),
      bookmarks: new Set(initialBookmarks),
    });
  }, []);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const saveAnswer = useCallback(async (questionId: string, option: number | null) => {
    setSaveStatus("saving");
    const question = questions.find((q) => q.id === questionId);
    const isCorrect = option != null && question 
      ? option === question.correct_option 
        : null;
    
    const { error } = await createClient().from("test_answers").upsert({
      session_id: session.id,
      question_id: questionId,
      selected_option: option,
      is_correct: isCorrect,
    }, { onConflict: "session_id, question_id" });

    setSaveStatus(error ? "error" : "saved");
    if (!error) {
      saveTimerRef.current = setTimeout(() => setSaveStatus("saved"), 2000);
    }
  }, [session.id, questions]);

  const handleOptionClick = (optionIndex: number) => {
    if (!currentQuestion) return;
    const newValue = answers[currentQuestion.id] === optionIndex ? null : optionIndex;
    setAnswer({ ...answers, [currentQuestion.id]: newValue });
    saveAnswer(currentQuestion.id, newValue);
  };

  const handleBookmarkToggle = async () => {
    if (!currentQuestion) return;
    const isBookmarked = bookmarks.has(currentQuestion.id);
    const next = new Set(bookmarks);
    if (next.has(currentQuestion.id)) {
      next.delete(currentQuestion.id);
      await createClient().from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("question_id", currentQuestion.id);
    } else {
      next.add(currentQuestion.id);
      await createClient().from("bookmarks")
        .insert({ user_id: userId, question_id: currentQuestion.id });
      await fetch("/api/srs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", questionId: currentQuestion.id }),
      });
    }
    setBookmarks(next);
  };

  const handleSubmit = async () => {
    if (useExamStore.getState().isSubmitting) return;
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("test_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", session.id);
    
    if (!error) {
      triggerStreakUpdate();
      awardTestXP(session.id);
      addWrongToSRS(session.id);
      router.push(`/result/${session.id}`);
    }
  };

  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  useEffect(() => {
    const startTime = new Date(session.started_at).getTime();
    const end = startTime + session.duration_minutes * 60 * 1000;
    const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
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

  const answeredCount = Object.values(answers).filter(v => v != null).length;
  const counts = {
    answered: answeredCount,
    bookmarked: bookmarks.size,
    total: totalQuestions,
  };

  currentIndexRef.current = currentIndex;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col bg-background">
      {/* Sidebar toggle + save status */}
      <div className="flex items-center justify-between border-b px-4 py-2 lg:hidden">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Q {currentIndex + 1} of {totalQuestions}</span>
          {saveStatus === "saving" && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-green-600">Saved</span>
          )}
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

      <div className="flex flex-1">
        {/* Question display */}
        <div className="flex-1">
          {currentQuestion && (
            <div className="space-y-4 max-w-3xl">
              <p className="text-base lg:text-lg leading-relaxed">
                {currentQuestion.question_text}
              </p>
              
              {/* Image display for question */}
              {currentQuestion.image_url && (
                <div className="relative w-full max-h-80 mb-4 overflow-hidden rounded-lg border">
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
              
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleOptionClick(n)}
                    className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-all ${ 
                      answers[currentQuestion.id] === n 
                        ? "border-primary bg-primary/10 ring-1 ring-primary" 
                        : "border-border hover:border-muted-foreground/40 hover:bg-accent/50"
                    }`}
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-medium mr-3 shrink-0">
                      {String.fromCharCode(64 + n)}
                    </span>
                    {currentQuestion[`option_${n}` as keyof Question]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(currentIndex - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={currentIndex >= totalQuestions - 1}
            onClick={() => setCurrentIndex(currentIndex + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Bookmark toggle */}
        <div className="flex items-center gap-1">
          <Button 
            onClick={handleBookmarkToggle}
            className={`inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md transition-colors ${
              bookmarks.has(currentQuestion?.id || '') 
                ? "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Bookmark 
              className={`h-4 w-4 ${bookmarks.has(currentQuestion?.id || '') ? "fill-current" : ""}`}
            />
          </Button>
          {bookmarks.has(currentQuestion?.id || '') ? "Bookmarked" : "Bookmark"}
        </div>
      </div>

      {/* Submit button */}
      <Button 
        onClick={() => setShowConfirm(true)} 
        disabled={isSubmitting}
        size="lg"
        className="w-full mt-2"
      >
        {isSubmitting ? "Submitting..." : answers[currentQuestion?.id] 
          ? "Submit Answer" 
          : "Select an option"}
      </Button>
    </div>
  );
}
