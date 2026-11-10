import type { createClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/** Returns bookmarked questions with a real answer in one of the user's completed tests. */
export async function getAnsweredBookmarkIds(
  supabase: ServerSupabase,
  userId: string,
  questionIds: string[],
): Promise<Set<string>> {
  const chunks: string[][] = [];
  for (let index = 0; index < questionIds.length; index += 100) {
    chunks.push(questionIds.slice(index, index + 100));
  }

  const results = await Promise.all(chunks.map((ids) =>
    supabase
      .from("test_answers")
      .select("question_id, test_sessions!inner(user_id, status)")
      .in("question_id", ids)
      .eq("test_sessions.user_id", userId)
      .eq("test_sessions.status", "completed")
      .or("selected_option.not.is.null,selected_options.not.is.null,numeric_answer.not.is.null")
  ));

  const answeredIds = new Set<string>();
  for (const { data, error } of results) {
    if (error) throw error;
    for (const answer of data ?? []) answeredIds.add(answer.question_id);
  }
  return answeredIds;
}
