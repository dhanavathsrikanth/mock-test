import { cache } from "react";
import { getExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import { DAILY_REVISION_CAP, type RevisionQueue, type RevisionQuestion } from "@/lib/revision";

export interface DeckQuestion {
  id: string;
  stage: number;
  nextReviewDate?: string | null;
  source: "srs" | "mistake" | "bookmark";
  question: RevisionQuestion["question"];
}

export interface DeckInfo {
  totalCount: number;
  scheduledTomorrow: number;
  stageCounts: Record<number, number>;
  masteredCount: number;
  questions: DeckQuestion[];
  /** True when direct SELECT on spaced_repetition is permission-blocked. */
  srsSelectFailed?: boolean;
}

function getStageFromInterval(days: number): number {
  if (days >= 30) return 5;
  if (days >= 14) return 4;
  if (days >= 7) return 3;
  if (days >= 3) return 2;
  return 1;
}

export async function getRevisionQueue(): Promise<RevisionQueue> {
  const { user, exam, stream } = await getExamContext();
  if (!user || !exam || (exam.requires_stream && !stream)) throw new Error("Choose an exam first");
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("revision_queue", { p_exam: exam.id, p_stream: stream?.id ?? null });
    if (!error && data && Array.isArray((data as RevisionQueue).questions)) {
      const qData = data as RevisionQueue;
      if (qData.questions.length > 0) {
        return qData;
      }
      return qData;
    }
  } catch (rpcErr) {
    console.warn("revision_queue RPC exception, using fallback deck query:", rpcErr);
  }

  // Fallback: Build queue from deck (test mistakes, bookmarks, and spaced_repetition)
  const deck = await getRevisionDeck();
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

  const sorted = [...deck.questions].sort((a, b) => a.stage - b.stage);
  const queueQuestions: RevisionQuestion[] = sorted.slice(0, DAILY_REVISION_CAP).map(q => ({
    id: q.id,
    stage: q.stage,
    question: q.question,
  }));

  return {
    reviewDate: todayStr,
    questions: queueQuestions,
    summary: {
      dueCount: queueQuestions.length,
      deferredCount: Math.max(0, sorted.length - queueQuestions.length),
      completedCount: 0,
      dailyCap: DAILY_REVISION_CAP,
      totalCount: queueQuestions.length,
      xpEarned: 0,
      queueComplete: queueQuestions.length === 0,
    },
  };
}

export async function addToSRSQueue(questionId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revision_add", { p_question: questionId });
  if (error) {
    console.error("SRS enrollment failed via revision_add RPC:", error);
    throw new Error("Unable to enroll question into revision. Please try again.");
  }
}

export async function addBatchToSRSQueue(questionIds: string[]): Promise<void> {
  if (questionIds.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("revision_add_batch", { p_questions: questionIds });
  if (error) {
    // Fallback to parallel single adds if batch RPC is pending deployment
    const results = await Promise.allSettled(
      questionIds.map((qid) => supabase.rpc("revision_add", { p_question: qid }))
    );
    const hasSuccess = results.some(
      (r) => r.status === "fulfilled" && !(r.value as any).error
    );
    if (!hasSuccess) {
      console.error("SRS batch enrollment failed:", error);
      throw new Error("Unable to enroll questions into revision. Please try again.");
    }
  }
}

export async function updateSRSAfterAnswer(
  questionId: string,
  result: "correct" | "wrong",
  reviewDate: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("revision_answer", {
    p_question: questionId,
    p_correct: result === "correct",
    p_day: reviewDate,
  });
  if (error || !data) {
    console.error("revision_answer RPC failed:", error);
    throw new Error("Unable to save revision progress. Please try again.");
  }
  return data;
}

export const getRevisionDeck = cache(async (): Promise<DeckInfo> => {
  const { user, exam, stream } = await getExamContext();
  if (!user || !exam) throw new Error("Choose an exam first");
  const supabase = await createClient();

  // 1. Query spaced_repetition. Direct SELECT on this table is permission
  //    revoked by migration 20261104161916 (no SELECT grant, no RLS policy).
  //    If it fails, degrade gracefully: SRS items come from the RPC queue
  //    instead, and the deck shows bookmarks + whatever the RPC returns.
  let srsData: any[] | null = null;
  let srsSelectFailed = false;
  const [fullQuery, { data: sessions }, { data: bookmarks }] = await Promise.all([
    supabase
    .from("spaced_repetition")
    .select("id, question_id, stage, interval_days, next_review_date, repetition_count, mastered_at, questions(id, question_text, question_type, option_1, option_2, option_3, option_4, correct_option, correct_options, correct_option_sets, answer_min, answer_max, answer_ranges, answer_decimal_places, explanation, year, image_url, image_width, image_height, option_images, exam_id, stream_id, marks_to_all)")
    .eq("user_id", user.id),
    supabase
    .from("test_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .eq("exam_id", exam.id)
    .or(stream ? `stream_id.eq.${stream.id},stream_id.is.null` : "stream_id.is.null")
    .order("completed_at", { ascending: false })
    .limit(30),
    supabase
    .from("bookmarks")
    .select("question_id, questions(id, question_text, question_type, option_1, option_2, option_3, option_4, correct_option, correct_options, correct_option_sets, answer_min, answer_max, answer_ranges, answer_decimal_places, explanation, year, image_url, image_width, image_height, option_images, exam_id, stream_id, marks_to_all)")
    .eq("user_id", user.id)
    .limit(50),
  ]);

  if (!fullQuery.error && fullQuery.data) {
    srsData = fullQuery.data;
  } else {
    srsSelectFailed = true;
    console.warn("spaced_repetition SELECT unavailable; deck will exclude SRS items:", fullQuery.error);
    const baseQuery = await supabase
      .from("spaced_repetition")
      .select("id, question_id, interval_days, next_review_date, repetition_count, questions(id, question_text, question_type, option_1, option_2, option_3, option_4, correct_option, correct_options, correct_option_sets, answer_min, answer_max, answer_ranges, answer_decimal_places, explanation, year, image_url, image_width, image_height, option_images, exam_id, stream_id, marks_to_all)")
      .eq("user_id", user.id);
    if (!baseQuery.error) {
      srsData = baseQuery.data;
      srsSelectFailed = false;
    }
  }

  const sessionIds = (sessions || []).map(s => s.id);
  const { data: wrongAnswers } = sessionIds.length > 0 ? await supabase
    .from("test_answers")
    .select("question_id, questions(id, question_text, question_type, option_1, option_2, option_3, option_4, correct_option, correct_options, correct_option_sets, answer_min, answer_max, answer_ranges, answer_decimal_places, explanation, year, image_url, image_width, image_height, option_images, exam_id, stream_id, marks_to_all)")
    .in("session_id", sessionIds)
    .eq("is_correct", false)
    .limit(100) : { data: [] };

  const questionsMap = new Map<string, DeckQuestion>();
  const stageCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let masteredCount = 0;
  let scheduledTomorrow = 0;
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

  for (const row of (srsData || []) as any[]) {
    const rawQ = Array.isArray(row.questions) ? row.questions[0] : row.questions;
    if (!rawQ || typeof rawQ !== "object" || rawQ.marks_to_all) continue;
    if (rawQ.exam_id && rawQ.exam_id !== exam.id) continue;
    if (stream && rawQ.stream_id && rawQ.stream_id !== stream.id) continue;

    const stage = Number(row.stage ?? getStageFromInterval(row.interval_days || 0));
    if (row.mastered_at) {
      masteredCount++;
    } else {
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      if (row.next_review_date && row.next_review_date > todayStr) {
        scheduledTomorrow++;
      }
    }
    const q = rawQ as unknown as RevisionQuestion["question"];
    questionsMap.set(q.id, {
      id: row.id,
      stage,
      nextReviewDate: row.next_review_date,
      source: "srs",
      question: q,
    });
  }

  for (const ans of wrongAnswers || []) {
    const rawQ = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions;
    if (!rawQ || typeof rawQ !== "object" || rawQ.marks_to_all) continue;
    if (rawQ.exam_id && rawQ.exam_id !== exam.id) continue;
    if (stream && rawQ.stream_id && rawQ.stream_id !== stream.id) continue;

    const q = rawQ as unknown as RevisionQuestion["question"];
    if (q && !questionsMap.has(q.id)) {
      stageCounts[1] = (stageCounts[1] || 0) + 1;
      scheduledTomorrow++;
      questionsMap.set(q.id, {
        id: `mistake-${q.id}`,
        stage: 1,
        source: "mistake",
        question: q,
      });
    }
  }

  for (const bm of bookmarks || []) {
    const rawQ = Array.isArray(bm.questions) ? bm.questions[0] : bm.questions;
    if (!rawQ || typeof rawQ !== "object" || rawQ.marks_to_all) continue;
    if (rawQ.exam_id && rawQ.exam_id !== exam.id) continue;
    if (stream && rawQ.stream_id && rawQ.stream_id !== stream.id) continue;

    const q = rawQ as unknown as RevisionQuestion["question"];
    if (q && !questionsMap.has(q.id)) {
      stageCounts[1] = (stageCounts[1] || 0) + 1;
      questionsMap.set(q.id, {
        id: `bm-${q.id}`,
        stage: 1,
        source: "bookmark",
        question: q,
      });
    }
  }

  const allQuestions = Array.from(questionsMap.values());

  return {
    totalCount: allQuestions.length,
    scheduledTomorrow: srsSelectFailed ? 0 : scheduledTomorrow,
    stageCounts,
    masteredCount,
    questions: allQuestions,
    srsSelectFailed,
  };
});
