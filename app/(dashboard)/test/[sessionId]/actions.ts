"use server";

import { createClient } from "@/lib/supabase/server";
import { gradeResponse, numericResponse, selection, type QuestionResponse } from "@/lib/question-response";

/** Grade the persisted question set on the server, including unanswered questions. */
export async function submitTest(sessionId: string, userId: string, responses?: Record<string, QuestionResponse>, activeSeconds?: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return { error: "Unauthorized" };
  const { data: session, error: sessionError } = await supabase.from("test_sessions")
    .select("id, user_id, exam_id, question_ids, started_at, duration_minutes, status, mode")
    .eq("id", sessionId).eq("user_id", user.id).single();
  if (sessionError || !session) return { error: "Session not found" };
  if (session.status !== "in_progress") return { success: true };
  if (session.mode === "sprint" && (typeof activeSeconds !== "number" || !Number.isInteger(activeSeconds) || activeSeconds < 0 || activeSeconds > session.duration_minutes * 60))
    return { error: "Invalid sprint timer. Reload your saved sprint and try again." };

  const { data: answers, error: answersError } = await supabase.from("test_answers")
    .select("question_id, selected_option, selected_options, numeric_answer").eq("session_id", sessionId);
  if (answersError) return { error: "Unable to load saved answers" };
  const questionIds: string[] = session.question_ids || (answers || []).map(answer => answer.question_id);
  const { data: questions, error: questionsError } = await supabase.from("questions")
    .select("id, correct_option, correct_options, correct_option_sets, question_type, marks_to_all, answer_min, answer_max, answer_ranges, answer_decimal_places").eq("exam_id", session.exam_id).in("id", questionIds);
  if (questionsError || !questions?.length || questions.length !== new Set(questionIds).size) return { error: "Unable to load all test questions. Please retry." };

  const expired = session.mode !== "sprint" && session.duration_minutes > 0 && Date.now() >
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
    .update({ status: "completed", completed_at: new Date().toISOString(), ...(session.mode === "sprint" ? { sprint_active_seconds: activeSeconds } : {}) })
    .eq("id", sessionId).eq("user_id", user.id);
  if (updateError) return { error: "Failed to complete test" };

  // Auto-enroll wrong answers into the spaced-repetition revision queue.
  // This is an application-level backup to the database trigger
  // (revision_on_test_completed) so the improvement loop works even if the
  // trigger is not deployed.
  const wrongQuestionIds = graded
    .filter((g) => g.is_correct === false)
    .map((g) => g.question_id);
  if (wrongQuestionIds.length > 0) {
    for (const qid of wrongQuestionIds) {
      try {
        await supabase.rpc("revision_add", { p_question: qid });
      } catch (err) {
        console.error(`Failed to enroll question ${qid} into revision:`, err);
      }
    }
  }

  return { success: true, wrongEnrolled: wrongQuestionIds.length };
}
