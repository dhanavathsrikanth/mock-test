"use client";

import { createBookmarkTest } from "../test/select/actions";
import { useState, useMemo, useRef } from "react";
import { PageHeading } from '@/components/workspace/PageHeading';
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
  ArrowDownAZ,
} from "lucide-react";
import Link from "next/link";
import { ReportButton } from "@/components/report/ReportButton";
import { MathText } from "@/components/MathText";
import { QuestionExplanation } from "@/components/QuestionExplanation";
import { numericAnswerLabel, multipleAnswerLabel } from "@/lib/question-response";
import { MatchingQuestion } from "@/components/MatchingQuestion";
import { MatchOption } from "@/components/MatchOption";
import { isMatchingQuestion, isMatchCodeOption } from "@/lib/matching-question-utils";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { QuestionFigure, type QuestionImage } from "@/components/QuestionFigure";
import { CheckCircle2, Circle } from "lucide-react";

export interface BookmarkItem {
  question_id: string;
  created_at: string;
  mastered_at?: string | null;
  answered?: boolean;
  questions: {
    id: string;
    question_text: string;
    image_url?: string | null;
    image_width?: number | null;
    image_height?: number | null;
    option_images?: (QuestionImage | null)[] | null;
    option_1: string;
    option_2: string;
    option_3: string;
    option_4: string;
    correct_option: number | null;
    marks_to_all?: boolean;
    correct_options?: number[] | null;
    correct_option_sets?: number[][] | null;
    question_type?: string;
    answer_min?: number | string | null;
    answer_max?: number | string | null;
    answer_ranges?: { min: number; max: number }[] | null;
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
  answerHistoryAvailable: boolean;
}

export function BookmarksContent({
  bookmarks: initialBookmarks,
  subjects,
  userId,
  reportedQuestionIds,
  answerHistoryAvailable,
}: BookmarksContentProps) {
  const router = useRouter();
  const getSupabase = () => createClient();
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"recent" | "oldest" | "subject" | "year-newest" | "year-oldest">("recent");
  const [unansweredOnly, setUnansweredOnly] = useState(false);
  const [unmasteredOnly, setUnmasteredOnly] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [startError, setStartError] = useState("");
  const removing = useRef(new Set<string>());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [masterySavingIds, setMasterySavingIds] = useState<Set<string>>(new Set());
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set(reportedQuestionIds));

  const filtered = useMemo(() => {
    let list = bookmarks;
    if (subjectFilter) {
      list = list.filter(
        (b) => b.questions.subjects?.name === subjectFilter
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((b) =>
        b.questions.question_text.toLowerCase().includes(q)
      );
    }
    if (unansweredOnly) list = list.filter(b => !b.answered);
    if (unmasteredOnly) list = list.filter(b => !b.mastered_at);
    return [...list].sort((a, b) => {
      if (sortMode === "subject") return (a.questions.subjects?.name || "General").localeCompare(b.questions.subjects?.name || "General") || b.created_at.localeCompare(a.created_at);
      if (sortMode === "year-newest") return (b.questions.year ?? -Infinity) - (a.questions.year ?? -Infinity) || b.created_at.localeCompare(a.created_at);
      if (sortMode === "year-oldest") return (a.questions.year ?? Infinity) - (b.questions.year ?? Infinity) || b.created_at.localeCompare(a.created_at);
      return sortMode === "recent" ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at);
    });
  }, [bookmarks, subjectFilter, searchQuery, sortMode, unansweredOnly, unmasteredOnly]);

  const toggleExpand = (questionId: string) => {
    const next = new Set(expandedIds);
    if (next.has(questionId)) next.delete(questionId);
    else next.add(questionId);
    setExpandedIds(next);
  };

  const removeBookmark = async (questionId: string) => {
    if (removing.current.has(questionId)) return;
    removing.current.add(questionId); setRemovingIds(new Set(removing.current)); setStartError('');
    try {
      const { error } = await getSupabase()
      .from("bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("question_id", questionId);
      if (error) throw error;
      setBookmarks(prev => prev.filter(bookmark => bookmark.question_id !== questionId));
    } catch { setStartError('Unable to remove this bookmark. It is still saved; please retry.'); }
    finally { removing.current.delete(questionId); setRemovingIds(new Set(removing.current)); }
  };

  const startTest = async (onlyUnanswered = false) => {
    const practiceCount = onlyUnanswered ? bookmarks.filter(b => !b.answered).length : bookmarks.length;
    if (!practiceCount || creating) return;
    setCreating(true); setStartError("");
    try {
      const result=await createBookmarkTest({ unansweredOnly: onlyUnanswered });
      if ('error' in result) setStartError(result.error);
      else router.push('/test/'+result.sessionId);
    } catch { setStartError('Unable to start bookmark practice. Please try again.'); }
    finally { setCreating(false); }
  };

  const toggleMastered = async (questionId: string) => {
    if (masterySavingIds.has(questionId)) return;
    const bookmark = bookmarks.find(item => item.question_id === questionId);
    if (!bookmark) return;
    const masteredAt = bookmark.mastered_at ? null : new Date().toISOString();
    setMasterySavingIds(prev => new Set(prev).add(questionId));
    setStartError("");
    try {
      const { error } = await getSupabase()
        .from("bookmarks")
        .update({ mastered_at: masteredAt })
        .eq("user_id", userId)
        .eq("question_id", questionId);
      if (error) throw error;
      setBookmarks(prev => prev.map(item => item.question_id === questionId ? { ...item, mastered_at: masteredAt } : item));
    } catch {
      setStartError("Unable to update mastery. Your bookmark is still saved; please retry.");
    } finally {
      setMasterySavingIds(prev => { const next = new Set(prev); next.delete(questionId); return next; });
    }
  };

  return (
    <div className="space-y-6 py-6">
      {startError && <p role="alert" className="text-sm text-destructive">{startError}</p>}
      <PageHeading title="Bookmarks" icon={<Bookmark />} description={`${bookmarks.length} saved questions. Keep useful questions close and revisit them at your pace.`} actions={bookmarks.length > 0 && (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button onClick={() => startTest(false)} disabled={creating} variant="outline" className="w-full sm:w-auto">
            <Play className="h-4 w-4" />
            Practise all
          </Button>
          <Button onClick={() => startTest(true)} disabled={creating || !answerHistoryAvailable || bookmarks.every(b => b.answered)} size="lg" className="w-full sm:w-auto">
            <Play className="h-4 w-4" />
            {creating ? "Creating…" : `Practise unanswered (${bookmarks.filter(b => !b.answered).length})`}
          </Button>
        </div>
      )} />
      {!answerHistoryAvailable && bookmarks.length > 0 && <p role="status" className="text-sm text-muted-foreground">Answer history is temporarily unavailable, so unanswered practice is disabled.</p>}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 sm:flex-1">
          <button
            type="button"
            onClick={() => setSubjectFilter(null)}
            className={`min-h-11 shrink-0 px-3 py-1.5 text-sm font-medium rounded-full border whitespace-nowrap transition-colors ${
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
              className={`min-h-11 shrink-0 px-3 py-1.5 text-sm font-medium rounded-full border whitespace-nowrap transition-colors ${
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
            aria-label="Search saved questions"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          <label className="inline-flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" checked={unansweredOnly} onChange={event => setUnansweredOnly(event.target.checked)} className="h-4 w-4 rounded accent-primary" />
            Unanswered only ({bookmarks.filter(b => !b.answered).length})
          </label>
          <label className="inline-flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" checked={unmasteredOnly} onChange={event => setUnmasteredOnly(event.target.checked)} className="h-4 w-4 rounded accent-primary" />
            Not mastered ({bookmarks.filter(b => !b.mastered_at).length})
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <ArrowDownAZ aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">Sort bookmarks</span>
          <select aria-label="Sort bookmarks" value={sortMode} onChange={event => setSortMode(event.target.value as typeof sortMode)} className="min-h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="recent">Recently saved</option>
            <option value="oldest">Oldest saved</option>
            <option value="subject">Subject A–Z</option>
            <option value="year-newest">Year: newest first</option>
            <option value="year-oldest">Year: oldest first</option>
          </select>
        </label>
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
          const q = b.questions;
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
                      {q.question_type && (
                        <Badge variant="outline" className="text-xs">
                          {q.marks_to_all ? "Marks to all" : q.question_type === "MSQ" ? "Select all that apply" : q.question_type === "NAT" ? "Numerical answer" : "Single choice"}
                        </Badge>
                      )}
                      {b.mastered_at && <Badge className="bg-emerald-600 text-white">Mastered</Badge>}
                    </div>

                    <div className="space-y-4">
                      {isMatchingQuestion(q.question_text) ? (
                        <>
                          <MatchingQuestion text={q.question_text} />
                          {q.image_url && <QuestionFigure image={{ url: q.image_url, width: q.image_width ?? undefined, height: q.image_height ?? undefined, alt: "Question diagram" }} />}
                        </>
                      ) : (
                        <QuestionPrompt
                          text={q.question_text}
                          image={q.image_url ? { url: q.image_url, width: q.image_width ?? undefined, height: q.image_height ?? undefined, alt: "Question diagram" } : undefined}
                        />
                      )}

                      {q.marks_to_all && isExpanded && (
                        <p className="text-sm text-green-700 dark:text-green-300">Official key: Marks to all. Full marks apply even when skipped; no option is designated correct.</p>
                      )}
                      {q.question_type === "NAT" ? (
                        <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                          Numerical answer
                          {isExpanded && <p className="mt-2 font-semibold text-green-700 dark:text-green-300">{numericAnswerLabel(q.answer_min, q.answer_max, q.answer_ranges)}</p>}
                        </div>
                      ) : (
                        <div className="space-y-2.5" aria-label="Answer options">
                          {[1, 2, 3, 4].map((idx) => {
                            const text = [q.option_1, q.option_2, q.option_3, q.option_4][idx - 1];
                            const image = q.option_images?.[idx - 1];
                            if (!text && !image) return null;
                            const isCorrect = !q.marks_to_all && (q.question_type === "MSQ"
                              ? !!q.correct_options?.includes(idx)
                              : q.correct_option_sets
                                ? q.correct_option_sets.some(set => set.length === 1 && set[0] === idx)
                                : idx === q.correct_option);
                            return (
                              <div key={idx} className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm ${isExpanded && isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-border bg-background"}`}>
                                <span aria-hidden="true" className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${isExpanded && isCorrect ? "border-green-600 text-green-700 dark:text-green-300" : "border-muted-foreground/40 text-muted-foreground"}`}>
                                  {String.fromCharCode(64 + idx)}
                                </span>
                                <div className="min-w-0 flex-1 space-y-2 leading-relaxed">
                                  {isMatchCodeOption(String(text ?? "")) ? (
                                    <MatchOption text={String(text)} />
                                  ) : text ? (
                                    <MathText text={String(text)} className="text-sm leading-relaxed" />
                                  ) : null}
                                  {image && <QuestionFigure image={image} inline />}
                                </div>
                                {isExpanded && isCorrect && <span className="shrink-0 text-xs font-medium text-green-700 dark:text-green-300">Correct</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Revealed answer */}
                      {isExpanded && (
                        <div className="space-y-3 border-t pt-4">
                          {q.correct_option_sets && <p className="text-sm font-medium text-green-700 dark:text-green-300">{multipleAnswerLabel(q.correct_option_sets)}</p>}
                          {q.explanation && (
                            <div className="space-y-2">
                              <span className="font-medium text-foreground">Explanation:</span>
                              <QuestionExplanation text={q.explanation} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    <button
                      type="button"
                      onClick={() => toggleMastered(b.question_id)}
                      disabled={masterySavingIds.has(b.question_id)}
                      aria-label={b.mastered_at ? "Mark as not mastered" : "Mark as mastered"}
                      aria-pressed={!!b.mastered_at}
                      aria-busy={masterySavingIds.has(b.question_id)}
                      title={b.mastered_at ? "Mark as not mastered" : "Mark as mastered"}
                      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {b.mastered_at ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <ReportButton
                      questionId={q.id}
                      questionText={q.question_text}
                      subjectName={q?.subjects?.name}
                      year={q.year ?? undefined}
                      isReported={reportedIds.has(q.id)}
                      onReported={(id) => setReportedIds((prev) => new Set(prev).add(id))}
                      className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => toggleExpand(b.question_id)}
                      aria-label={isExpanded ? 'Hide answer' : 'Reveal answer'}
                      aria-expanded={isExpanded}
                      className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted transition-colors"
                      title={isExpanded ? "Hide answer" : "Reveal answer"}
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
                      disabled={removingIds.has(b.question_id)}
                      aria-label="Remove bookmark"
                      aria-busy={removingIds.has(b.question_id)}
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
