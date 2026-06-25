import { createClient } from "@/lib/supabase/server";

const MIN_EASE = 1.3;
const MAX_EASE = 2.5;
const EASE_INCORRECT_PENALTY = 0.2;
const EASE_CORRECT_BONUS = 0.1;

export interface SRSRecord {
  id: string;
  user_id: string;
  question_id: string;
  interval_days: number;
  ease_factor: number;
  repetition_count: number;
  next_review_date: string;
  last_reviewed_at: string | null;
  created_at: string;
}

export interface SRSResult {
  nextReviewDate: Date;
  intervalDays: number;
  easeFactor: number;
  repetitionCount: number;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export function calculateNextReview(
  result: "correct" | "wrong" | "skipped",
  currentInterval: number,
  easeFactor: number,
  repetitionCount: number
): SRSResult {
  let newInterval: number;
  let newEase = easeFactor;
  let newReps = repetitionCount;

  if (result === "wrong" || result === "skipped") {
    newInterval = 1;
    newEase = Math.max(MIN_EASE, easeFactor - EASE_INCORRECT_PENALTY);
    newReps = 0;
  } else {
    newEase = Math.min(MAX_EASE, easeFactor + EASE_CORRECT_BONUS);

    if (repetitionCount === 0) {
      newInterval = 1;
    } else if (repetitionCount === 1) {
      newInterval = 3;
    } else {
      newInterval = Math.round(currentInterval * easeFactor);
    }

    newReps = repetitionCount + 1;
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
  nextReviewDate.setHours(0, 0, 0, 0);

  return {
    nextReviewDate,
    intervalDays: newInterval,
    easeFactor: newEase,
    repetitionCount: newReps,
  };
}

export async function addToSRSQueue(
  userId: string,
  questionId: string
): Promise<void> {
  const supabase = await createClient();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: existing } = await supabase
    .from("spaced_repetition")
    .select("id")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from("spaced_repetition").insert({
    user_id: userId,
    question_id: questionId,
    interval_days: 0,
    ease_factor: 2.5,
    repetition_count: 0,
    next_review_date: tomorrow.toISOString().split("T")[0],
  });

  if (error) throw error;
}

export async function updateSRSAfterAnswer(
  userId: string,
  questionId: string,
  result: "correct" | "wrong" | "skipped"
): Promise<SRSResult> {
  const supabase = await createClient();

  const { data: record } = await supabase
    .from("spaced_repetition")
    .select("*")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (!record) throw new Error("SRS record not found");

  const srsResult = calculateNextReview(
    result,
    record.interval_days,
    record.ease_factor,
    record.repetition_count
  );

  const nextReviewStr = srsResult.nextReviewDate.toISOString().split("T")[0];

  const { error } = await supabase
    .from("spaced_repetition")
    .update({
      interval_days: srsResult.intervalDays,
      ease_factor: srsResult.easeFactor,
      repetition_count: srsResult.repetitionCount,
      next_review_date: nextReviewStr,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("question_id", questionId);

  if (error) throw error;

  return srsResult;
}

export async function getTodaysSRSQuestions(userId: string, limit = 20) {
  const supabase = await createClient();
  const today = getToday();

  const { data, error } = await supabase
    .from("spaced_repetition")
    .select(`
      id,
      interval_days,
      ease_factor,
      repetition_count,
      next_review_date,
      last_reviewed_at,
      question_id,
      questions (
        id,
        question_text,
        option_1,
        option_2,
        option_3,
        option_4,
        correct_option,
        explanation,
        year,
        subject_id,
        subjects ( name )
      )
    `)
    .eq("user_id", userId)
    .lte("next_review_date", today)
    .order("next_review_date", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((item) => {
    const q = item as any;
    return {
      srsId: item.id,
      intervalDays: item.interval_days,
      easeFactor: item.ease_factor,
      repetitionCount: item.repetition_count,
      nextReviewDate: item.next_review_date,
      lastReviewedAt: item.last_reviewed_at,
      question: {
        id: q.questions.id,
        text: q.questions.question_text,
        options: [
          q.questions.option_1,
          q.questions.option_2,
          q.questions.option_3,
          q.questions.option_4,
        ],
        correctOption: q.questions.correct_option,
        explanation: q.questions.explanation,
        year: q.questions.year,
        subject: q.questions.subjects?.name || null,
      },
    };
  });
}

export async function addWrongAnswersFromSession(
  sessionId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  const { data: wrongAnswers } = await supabase
    .from("test_answers")
    .select("question_id")
    .eq("session_id", sessionId)
    .eq("is_correct", false);

  if (!wrongAnswers || wrongAnswers.length === 0) return;

  for (const answer of wrongAnswers) {
    const { data: existing } = await supabase
      .from("spaced_repetition")
      .select("id")
      .eq("user_id", userId)
      .eq("question_id", answer.question_id)
      .maybeSingle();

    if (existing) continue;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await supabase.from("spaced_repetition").insert({
      user_id: userId,
      question_id: answer.question_id,
      interval_days: 0,
      ease_factor: 2.5,
      repetition_count: 0,
      next_review_date: tomorrow.toISOString().split("T")[0],
    });
  }
}

export async function getSRSSummary(userId: string) {
  const supabase = await createClient();
  const today = getToday();

  const { data: due } = await supabase
    .from("spaced_repetition")
    .select("id, next_review_date, last_reviewed_at")
    .eq("user_id", userId)
    .lte("next_review_date", today);

  const dueCount = due?.length || 0;
  const overdueCount =
    due?.filter((d) => {
      const diff = Math.floor(
        (new Date(today).getTime() - new Date(d.next_review_date).getTime()) /
          86400000
      );
      return diff > 2;
    }).length || 0;

  return { dueCount, overdueCount };
}
