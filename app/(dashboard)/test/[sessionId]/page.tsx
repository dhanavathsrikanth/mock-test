import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExamClient } from "./exam-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
  const { sessionId } = await params;
  return {
    title: `Test ${sessionId.slice(0, 8)}... | TGPSC AEE Civil Prep`,
  };
}

async function ExamPageContent({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  const userId = user.id;

  const { data: session } = await supabase
    .from("test_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (!session) {
    notFound();
  }
  if (session.status !== "in_progress")
    redirect(`/result/${sessionId}`);

  let query = supabase
    .from("questions")
    .select("*")
    .eq("exam_id", session.exam_id);

  if (session.subject_id) {
    query = query.eq("subject_id", session.subject_id);
  }
  if (session.year) {
    query = query.eq("year", session.year);
  }

  const { data: questions } = await query
    .limit(session.total_questions)
    .order("created_at");

  const { data: existingAnswers } = await supabase
    .from("test_answers")
    .select("question_id, selected_option")
    .eq("session_id", sessionId);

  const { data: existingBookmarks } = await supabase
    .from("bookmarks")
    .select("question_id")
    .eq("user_id", userId);

  const initialAnswers: Record<string, number> = {};
  existingAnswers?.forEach((a) => {
    if (a.selected_option != null) initialAnswers[a.question_id] = a.selected_option;
  });

  const initialBookmarks = new Set(
    existingBookmarks?.map((b) => b.question_id) || []
  );

  return (
    <ExamClient
      userId={userId}
      session={session}
      questions={questions || []}
      initialAnswers={initialAnswers}
      initialBookmarks={initialBookmarks}
    />
  );
}

export default function ExamPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  return <ExamPageContent params={params} />;
}

export { ExamClient };
