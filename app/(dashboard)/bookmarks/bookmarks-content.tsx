"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bookmark,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Play,
} from "lucide-react";
import Link from "next/link";
import { ReportButton } from "@/components/report/ReportButton";
import { MathText } from "@/components/MathText";
import { MatchingQuestion } from "@/components/MatchingQuestion";
import { MatchOption } from "@/components/MatchOption";
import { isMatchingQuestion, isMatchCodeOption } from "@/lib/matching-question-utils";

interface BookmarkItem {
  question_id: string;
  created_at: string;
  questions: {
    id: string;
    question_text: string;
    option_1: string;
    option_2: string;
    option_3: string;
    option_4: string;
    correct_option: number;
    year: number | null;
    subject_id: string;
    exam_id: string;
    explanation: string | null;
    subjects: { name: string } | null;
  };
}

interface BookmarksContentProps {
  bookmarks: BookmarkItem[];
  subjects: string[];
  userId: string;
  reportedQuestionIds: string[];
}

export function BookmarksContent({
  bookmarks: initialBookmarks,
  subjects,
  userId,
  reportedQuestionIds,
}: BookmarksContentProps) {
  const router = useRouter();
  const getSupabase = () => createClient();
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set(reportedQuestionIds));

  const filtered = useMemo(() => {
    let list = bookmarks;
    if (subjectFilter) {
      list = list.filter(
        (b) => (b.questions as any)?.subjects?.name === subjectFilter
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((b) =>
        b.questions.question_text.toLowerCase().includes(q)
      );
    }
    return list;
  }, [bookmarks, subjectFilter, searchQuery]);

  const toggleExpand = (questionId: string) => {
    const next = new Set(expandedIds);
    if (next.has(questionId)) next.delete(questionId);
    else next.add(questionId);
    setExpandedIds(next);
  };

  const removeBookmark = async (questionId: string) => {
    setBookmarks((prev) => prev.filter((b) => b.question_id !== questionId));
    await getSupabase()
      .from("bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("question_id", questionId);
  };

  const startTest = async () => {
    if (bookmarks.length === 0) return;
    setCreating(true);

    const examId = (bookmarks[0].questions as any).exam_id;
    const totalQ = bookmarks.length;

    const { data: session, error } = await getSupabase()
      .from("test_sessions")
      .insert({
        user_id: userId,
        exam_id: examId,
        mode: "custom",
        total_questions: totalQ,
        duration_minutes: totalQ,
        status: "in_progress",
      })
      .select()
      .single();

    setCreating(false);

    if (error) return;
    router.push(`/test/${session.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Your Bookmarks{" "}
            <span className="text-muted-foreground font-normal">
              ({bookmarks.length})
            </span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review and practice your saved questions
          </p>
        </div>
        {bookmarks.length > 0 && (
          <Button onClick={startTest} disabled={creating} size="lg">
            <Play className="h-4 w-4" />
            {creating ? "Creating..." : "Start Test from Bookmarks"}
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
          <button
            type="button"
            onClick={() => setSubjectFilter(null)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border whitespace-nowrap transition-colors ${
              subjectFilter === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-input hover:bg-accent"
            }`}
          >
            All
          </button>
          {subjects.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setSubjectFilter(name)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full border whitespace-nowrap transition-colors ${
                subjectFilter === name
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-input hover:bg-accent"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Empty state */}
      {bookmarks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Bookmark className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h2 className="text-lg font-semibold">No bookmarks yet</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Bookmark questions during tests to review them later. Come back
                here to practice your saved questions.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/test/select">
                <Play className="h-4 w-4" />
                Take a test
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filter empty state */}
      {bookmarks.length > 0 && filtered.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No bookmarks match this filter.
          </CardContent>
        </Card>
      )}

      {/* Question cards */}
      <div className="space-y-3">
        {filtered.map((b) => {
          const q = b.questions as any;
          const subjectName = q?.subjects?.name || "General";
          const isExpanded = expandedIds.has(b.question_id);

          return (
            <Card key={b.question_id} className="overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {subjectName}
                      </Badge>
                      {q.year && (
                        <Badge variant="outline" className="text-xs">
                          {q.year}
                        </Badge>
                      )}
                    </div>

                    {/* Question text */}
                    <div
                      className={`text-sm leading-relaxed ${
                        !isExpanded ? "line-clamp-2" : ""
                      }`}
                    >
                      {isMatchingQuestion(q.question_text) ? (
                        <MatchingQuestion text={q.question_text} />
                      ) : (
                        <MathText text={q.question_text} />
                      )}
                    </div>

                    {/* Expanded answer */}
                    {isExpanded && (
                      <div className="mt-4 space-y-2 border-t pt-4">
                        {(
                          [
                            [1, q.option_1],
                            [2, q.option_2],
                            [3, q.option_3],
                            [4, q.option_4],
                          ] as const
                        ).map(([idx, text]) => {
                          const isCorrect = idx === q.correct_option;
                          return (
                            <div
                              key={idx}
                              className={`rounded-lg border px-3 py-2 text-sm ${
                                isCorrect
                                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                                  : "border-border"
                              }`}
                            >
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border text-xs font-medium mr-2">
                                {String.fromCharCode(64 + idx)}
                              </span>
                              {isMatchCodeOption(String(text)) ? (
                                <MatchOption text={String(text)} className="text-xs" />
                              ) : (
                                text
                              )}
                              {isCorrect && (
                                <span className="ml-2 text-xs text-green-600 font-medium">
                                  Correct Answer
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {q.explanation && (
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                            <span className="font-medium text-foreground">
                              Explanation:
                            </span>{" "}
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    <ReportButton
                      questionId={q.id}
                      questionText={q.question_text}
                      subjectName={q?.subjects?.name}
                      year={q.year}
                      isReported={reportedIds.has(q.id)}
                      onReported={(id) => setReportedIds((prev) => new Set(prev).add(id))}
                      className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => toggleExpand(b.question_id)}
                      className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted transition-colors"
                      title={isExpanded ? "Hide answer" : "Show answer"}
                    >
                      {isExpanded ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBookmark(b.question_id)}
                      className="inline-flex items-center justify-center p-2 rounded-md hover:bg-destructive/10 transition-colors"
                      title="Remove bookmark"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
