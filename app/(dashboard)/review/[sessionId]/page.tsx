import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import { ReviewContent } from "./review-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
  const { sessionId } = await params;
  return {
    title: `Review ${sessionId.slice(0, 8)}... | Exam Prep`,
  };
}

async function ReviewPageContent({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const { user, exam, stream } = await requireExamContext();
  const supabase = await createClient();

  const userId = user.id;

  const { data: session } = await supabase
    .from("test_sessions")
    .select("*")
    .eq("exam_id", exam.id)
    .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (!session) {
    notFound();
  }

  const { data: answers } = await supabase
    .from("test_answers")
    .select("*, questions(*)")
    .eq("session_id", sessionId);

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("question_id")
    .eq("user_id", userId);

  const bookmarkedIds = new Set(
    (bookmarks || []).map((b) => b.question_id)
  );

  const questionOrder = new Map<string, number>(
    (session.question_ids || []).map((id: string, index: number) => [id, index])
  );
  const orderedAnswers = [...(answers || [])].sort(
    (a, b) => (questionOrder.get(a.question_id) ?? Infinity) - (questionOrder.get(b.question_id) ?? Infinity)
  );

  return <ReviewContent answers={orderedAnswers} bookmarkedIds={bookmarkedIds} userId={userId} sessionId={sessionId} />;
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  return <ReviewPageContent params={params} />;
}

export { ReviewContent };
