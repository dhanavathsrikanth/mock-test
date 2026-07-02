import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResultContent } from "./result-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
  const { sessionId } = await params;
  return {
    title: `Results ${sessionId.slice(0, 8)}... | TGPSC AEE Civil Prep`,
  };
}

async function ResultPageContent({
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
  if (session.status === "in_progress")
    redirect(`/test/${sessionId}`);

  const { data: answers } = await supabase
    .from("test_answers")
    .select("*, questions(*)")
    .eq("session_id", sessionId);

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("exam_id", session.exam_id);

  const subjectNameMap = new Map(
    (subjects || []).map((s) => [s.id, s.name])
  );

  const answerList = answers || [];
  const correctCount = answerList.filter((a) => a.is_correct === true).length;
  const wrongCount = answerList.filter((a) => a.is_correct === false).length;
  const skippedCount = answerList.filter((a) => a.is_correct === null).length;
  const totalQuestions = answerList.length || session.total_questions;
  const accuracy =
    totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

  const subjectMap = new Map<
    string,
    { name: string; total: number; correct: number; wrong: number }
  >();
  answerList.forEach((a: any) => {
    const subjectId = a.questions?.subject_id;
    const subjectName = subjectNameMap.get(subjectId) || "Unknown";
    const entry = subjectMap.get(subjectId) || {
      name: subjectName,
      total: 0,
      correct: 0,
      wrong: 0,
    };
    entry.total++;
    if (a.is_correct === true) entry.correct++;
    else if (a.is_correct === false) entry.wrong++;
    subjectMap.set(subjectId, entry);
  });
  const subjectBreakdown = Array.from(subjectMap.values());

  const startedAt = new Date(session.started_at).getTime();
  const completedAt = session.completed_at
    ? new Date(session.completed_at).getTime()
    : Date.now();
  const timeTakenSeconds = Math.floor(
    (completedAt - startedAt) / 1000
  );

  let message: { title: string; subtitle: string; icon: string };
  if (accuracy >= 80)
    message = {
      title: "Excellent!",
      subtitle: "You're exam ready",
      icon: "🏆",
    };
  else if (accuracy >= 60)
    message = {
      title: "Good effort!",
      subtitle: "Keep practicing",
      icon: "💪",
    };
  else
    message = {
      title: "Keep going!",
      subtitle: "Review weak topics",
      icon: "📚",
    };

  return (
    <ResultContent
      correctCount={correctCount}
      wrongCount={wrongCount}
      skippedCount={skippedCount}
      accuracy={accuracy}
      totalQuestions={totalQuestions}
      timeTakenSeconds={timeTakenSeconds}
      subjectBreakdown={subjectBreakdown}
      message={message}
      sessionId={sessionId}
    />
  );
}

export default function ResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  return <ResultPageContent params={params} />;
}

export { ResultContent };
