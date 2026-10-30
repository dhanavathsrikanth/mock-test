"use server";

import { createClient } from "@/lib/supabase/server";
import { gradeResponse, numericResponse, selection, type QuestionResponse } from "@/lib/question-response";

/** Grade the persisted question set on the server, including unanswered questions. */
export async function submitTest(sessionId: string, userId: string, responses?: Record<string, QuestionResponse>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return { error: "Unauthorized" };
  const { data: session, error: sessionError } = await supabase.from("test_sessions")
    .select("id, user_id, exam_id, question_ids, started_at, duration_minutes, status")
    .eq("id", sessionId).eq("user_id", user.id).single();
  if (sessionError || !session) return { error: "Session not found" };
  if (session.status !== "in_progress") return { success: true };

  const { data: answers, error: answersError } = await supabase.from("test_answers")
    .select("question_id, selected_option, selected_options, numeric_answer").eq("session_id", sessionId);
  if (answersError) return { error: "Unable to load saved answers" };
  const questionIds: string[] = session.question_ids || (answers || []).map(answer => answer.question_id);
  const { data: questions, error: questionsError } = await supabase.from("questions")
    .select("id, correct_option, correct_options, correct_option_sets, question_type, marks_to_all, answer_min, answer_max, answer_ranges, answer_decimal_places").eq("exam_id", session.exam_id).in("id", questionIds);
  if (questionsError || !questions?.length) return { error: "Unable to load test questions" };

  const expired = session.duration_minutes > 0 && Date.now() >
    new Date(session.started_at).getTime() + session.duration_minutes * 60000 + 60000;
  const saved = new Map((answers || []).map(answer => [answer.question_id, answer.numeric_answer ?? (answer.selected_options?.length ? answer.selected_options : answer.selected_option)]));
  const graded = questions.map(question => {
    const submitted = !expired && responses && Object.prototype.hasOwnProperty.call(responses, question.id)
      ? responses[question.id] : saved.get(question.id) ?? null;
    const choices = selection(submitted);
    const multiple = question.question_type === "MSQ";
    const selected = question.question_type === "NAT" ? numericResponse(submitted) : multiple ? (choices.length ? choices : null) : (choices.length === 1 ? choices[0] : null);
    return {
      session_id: sessionId, question_id: question.id,
      selected_option: typeof selected === "number" ? selected : null,
      selected_options: Array.isArray(selected) ? selected : null,
      numeric_answer: typeof selected === "string" ? selected : null,
      is_correct: gradeResponse(question, selected),
    };
  });
  const { error: gradeError } = await supabase.from("test_answers")
    .upsert(graded, { onConflict: "session_id,question_id" });
  if (gradeError) return { error: "Failed to save graded answers" };
  const { error: updateError } = await supabase.from("test_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId).eq("user_id", user.id);
  if (updateError) return { error: "Failed to complete test" };
  return { success: true };
}
