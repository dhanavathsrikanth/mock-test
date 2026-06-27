import { createClient } from "@/lib/supabase/server";

interface Question {
  id: string;
  exam_id: string;
  subject_id: string;
  year: number | null;
  paper: string | null;
  question_text: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_option: number;
  explanation: string | null;
  difficulty: string | null;
  created_at: string;
}

/**
 * Fisher-Yates shuffle — mutates and returns the array.
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Selects questions for a test session using the hybrid approach:
 * 1. Prioritizes unseen questions (randomized)
 * 2. Falls back to seen questions if pool is exhausted
 * 3. Shuffles the final list so the test order is random
 *
 * Also records the selected questions in user_question_history
 * so they won't appear as often in future tests.
 */
export async function getQuestionsForSession(
  userId: string,
  session: {
    exam_id: string;
    subject_id: string | null;
    year: number | null;
    total_questions: number;
  }
): Promise<Question[]> {
  const supabase = await createClient();

  // 1. Fetch ALL question IDs matching the session filters
  let poolQuery = supabase
    .from("questions")
    .select("id")
    .eq("exam_id", session.exam_id);

  if (session.subject_id) {
    poolQuery = poolQuery.eq("subject_id", session.subject_id);
  }
  if (session.year) {
    poolQuery = poolQuery.eq("year", session.year);
  }

  const { data: allPool } = await poolQuery;
  const allIds: string[] = (allPool || []).map((q) => q.id);

  if (allIds.length === 0) return [];

  // 2. Fetch user's seen question IDs from history
  const { data: seenRows } = await supabase
    .from("user_question_history")
    .select("question_id")
    .eq("user_id", userId)
    .in("question_id", allIds);

  const seenSet = new Set(
    (seenRows || []).map((r) => r.question_id)
  );

  // 3. Split into unseen and seen pools
  const unseen = allIds.filter((id) => !seenSet.has(id));
  const seen = allIds.filter((id) => seenSet.has(id));

  // 4. Shuffle both pools
  shuffle(unseen);
  shuffle(seen);

  // 5. Take from unseen first, then fill with seen
  const selected: string[] = [];
  const needed = Math.min(session.total_questions, allIds.length);

  for (const id of unseen) {
    if (selected.length >= needed) break;
    selected.push(id);
  }

  // If we still need more, pull from seen pool
  for (const id of seen) {
    if (selected.length >= needed) break;
    selected.push(id);
  }

  // 6. Shuffle the final combined list so test order is random
  shuffle(selected);

  // 7. Record selected questions in history for future dedup
  //    Use upsert with on conflict do nothing to avoid duplicates
  const historyRows = selected.map((questionId) => ({
    user_id: userId,
    question_id: questionId,
  }));

  // Batch insert — ignore duplicates
  await supabase.from("user_question_history").upsert(historyRows, {
    onConflict: "user_id,question_id",
    ignoreDuplicates: true,
  });

  // 8. Fetch full question data for the selected IDs
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .in("id", selected);

  // 9. Preserve the randomized order (Supabase returns in DB order)
  const questionMap = new Map(
    (questions || []).map((q) => [q.id, q])
  );

  return selected
    .map((id) => questionMap.get(id))
    .filter(Boolean) as Question[];
}
