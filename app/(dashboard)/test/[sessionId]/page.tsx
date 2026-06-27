import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getQuestionsForSession } from "@/lib/question-distribution";
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

  const questions = await getQuestionsForSession(userId, {
    exam_id: session.exam_id,
    subject_id: session.subject_id,
    year: session.year,
    total_questions: session.total_questions,
  });

  // Strip correct_option — never send correct answers to the client
  const safeQuestions = questions.map(({ correct_option, ...rest }) => rest);

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
      questions={safeQuestions || []}
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
