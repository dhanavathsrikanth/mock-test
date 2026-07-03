"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Finalize a test session:
 * 1. Validate that the submission is within the allowed time window
 * 2. Compute is_correct for all answers server-side (correct_option never sent to client)
 * 3. Mark the session as completed
 */
export async function submitTest(sessionId: string, userId: string) {
  const supabase = await createClient();

  // 1. Fetch session data
  const { data: session, error: sessionError } = await supabase
    .from("test_sessions")
    .select("id, user_id, started_at, duration_minutes, status")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (sessionError || !session) {
    return { error: "Session not found" };
  }

  if (session.status !== "in_progress") {
    return { error: "Test already submitted" };
  }

  // 2. Server-side timer validation (only if timed test)
  if (session.duration_minutes > 0) {
    const startedAt = new Date(session.started_at).getTime();
    const endTime = startedAt + session.duration_minutes * 60 * 1000;
    const now = Date.now();
    // Allow 60s grace period for network latency
    if (now > endTime + 60_000) {
      return { error: "Time limit exceeded" };
    }
  }

  // 3. Compute is_correct for all answers server-side
  const { data: answers } = await supabase
    .from("test_answers")
    .select("id, question_id, selected_option")
    .eq("session_id", sessionId);

  if (answers && answers.length > 0) {
    const questionIds = answers.map((a) => a.question_id);
    const { data: questions } = await supabase
      .from("questions")
      .select("id, correct_option")
      .in("id", questionIds);

    const correctMap = new Map(
      (questions || []).map((q) => [q.id, q.correct_option])
    );

    const updates = answers.map((answer) => {
      const correctOption = correctMap.get(answer.question_id);
      const isCorrect =
        answer.selected_option != null && correctOption != null
          ? answer.selected_option === correctOption
          : null;
      return {
        id: answer.id,
        is_correct: isCorrect,
      };
    });

    // Batch update all answers at once
    for (const update of updates) {
      await supabase
        .from("test_answers")
        .update({ is_correct: update.is_correct })
        .eq("id", update.id);
    }
  }

  // 4. Mark session as completed
  const { error: updateError } = await supabase
    .from("test_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (updateError) {
    return { error: "Failed to complete test" };
  }

  return { success: true };
}
