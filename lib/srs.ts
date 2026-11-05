import { getExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import type { RevisionQueue } from "@/lib/revision";

export async function getRevisionQueue(): Promise<RevisionQueue> {
  const { user, exam, stream } = await getExamContext();
  if (!user || !exam || (exam.requires_stream && !stream)) throw new Error("Choose an exam first");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("revision_queue", { p_exam: exam.id, p_stream: stream?.id ?? null });
  if (error) throw error;
  return data as RevisionQueue;
}

export async function addToSRSQueue(questionId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revision_add", { p_question: questionId });
  if (error) throw error;
}

export async function updateSRSAfterAnswer(questionId: string, result: "correct" | "wrong", reviewDate: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("revision_answer", {
    p_question: questionId, p_correct: result === "correct", p_day: reviewDate,
  });
  if (error) throw error;
  return data;
}
