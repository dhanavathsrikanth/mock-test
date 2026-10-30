import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import { calculateMarks } from "@/lib/marking";
import { ResultContent } from "./result-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
  const { sessionId } = await params;
  return {
    title: `Results ${sessionId.slice(0, 8)}... | Exam Prep`,
  };
}

async function ResultPageContent({
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
  if (session.status === "in_progress")
    redirect(`/test/${sessionId}`);

  const { data: answers } = await supabase
    .from("test_answers")
    .select("*, questions(*)")
    .eq("session_id", sessionId);

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("exam_id", session.exam_id)
    .or(stream ? `stream_id.eq.${stream.id},stream_id.is.null` : "stream_id.is.null");

  const subjectNameMap = new Map(
    (subjects || []).map((s) => [s.id, s.name])
  );

  const answerList = answers || [];
  const correctCount = answerList.filter((a) => a.is_correct === true).length;
  const wrongCount = answerList.filter((a) => a.is_correct === false).length;
  const skippedCount = Math.max(0, (session.question_ids?.length || session.total_questions) - correctCount - wrongCount);
  const totalQuestions = session.question_ids?.length || session.total_questions;
  const questionIds: string[] = session.question_ids || answerList.map(answer => answer.question_id);
  const { data: markedQuestions } = await supabase.from("questions").select("id, marks, negative_marks, marks_to_all")
    .eq("exam_id", session.exam_id).in("id", questionIds);
  const marks = calculateMarks(markedQuestions || [], answerList);
  const accuracy =
    totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

  const subjectMap = new Map<
    string,
    { name: string; total: number; correct: number; wrong: number }
  >();
  answerList.forEach((a: { questions?: { subject_id: string }; is_correct: boolean | null }) => {
    const subjectId = a.questions?.subject_id || "unknown";
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
      marks={marks}
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
