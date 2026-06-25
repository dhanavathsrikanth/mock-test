import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewContent } from "./review-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
  const { sessionId } = await params;
  return {
    title: `Review ${sessionId.slice(0, 8)}... | TGPSC AEE Civil Prep`,
  };
}

async function ReviewPageContent({
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

  return <ReviewContent answers={answers || []} bookmarkedIds={bookmarkedIds} userId={userId} sessionId={sessionId} />;
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  return <ReviewPageContent params={params} />;
}

export { ReviewContent };
