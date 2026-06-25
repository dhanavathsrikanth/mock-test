"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Bookmark, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { ReportButton } from "@/components/report/ReportButton";

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

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "wrong", label: "Wrong" },
  { key: "skipped", label: "Skipped" },
  { key: "bookmarked", label: "Bookmarked" },
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
  const getSupabase = () => createClient();

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

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/result/${sessionId}`}>
              <ArrowLeft className="h-4 w-4" />
              Results
            </Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Review Answers</h1>
        </div>

        <div className="flex gap-2 border-b pb-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f.key 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
              {f.key === "bookmarked" && bookmarks.size > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({bookmarks.size})</span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            No questions match this filter.
          </p>
        ) : current && currentQ ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Q {currentIndex + 1} of {filtered.length}
              </span>
              <button 
                type="button" 
                onClick={() => toggleBookmark(current.question_id)}
                className={`inline-flex items-center gap-1 text-sm px-2 py-1 rounded-md transition-colors ${
                  isBookmarked 
                    ? "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Bookmark 
                  className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`}
                />
                {isBookmarked ? "Bookmarked" : "Bookmark"}
              </button>
            </div>

            <div className="flex items-start justify-between gap-3">
              <p className="text-base lg:text-lg leading-relaxed">
                {currentQ.question_text}
              </p>

              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((idx) => (
                  <div 
                    key={idx} 
                    className={`border rounded-lg px-4 py-3 text-sm ${
                      current.selected_option === idx && currentQ.correct_option === idx
                        ? "border-green-500 bg-green-50 dark:bg-green-950/20" 
                        : current.selected_option === idx
                          ? "border-red-500 bg-red-50 dark:bg-red-950/20" 
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-medium mr-3">
                          {String.fromCharCode(64 + idx)}
                        </span>
                        {currentQ[`option_${idx}` as keyof typeof currentQ]}
                        {current.selected_option === idx && currentQ.correct_option === idx 
                          ? <Check className="h-4 w-4 text-green-600 inline ml-2" />
                          : current.selected_option === idx 
                            ? <span className="text-xs text-red-600">✗</span> 
                            : ""
                        }
                      </div>
                    </div>
                ))} 
              </div>

              {currentQ.explanation && (
                <div className="border rounded-lg overflow-hidden">
                  <button 
                    type="button" 
                    onClick={() => toggleExplanation(current.question_id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
                  >
                    <span>Explanation</span>
                    <span className="text-muted-foreground">
                      {expandedExplanations.has(current.question_id) ? "▲" : "▼"}
                    </span>
                  </button>
                  {expandedExplanations.has(current.question_id) && (
                    <div className="px-4 pb-3 pt-3 text-sm text-muted-foreground border-t">
                      {currentQ.explanation}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(currentIndex - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1} / {filtered.length}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentIndex >= filtered.length - 1}
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
