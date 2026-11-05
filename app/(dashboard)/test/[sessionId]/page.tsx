import type { QuestionResponse } from "@/lib/question-response";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import { getQuestionsForSession } from "@/lib/question-distribution";
import { ExamClient } from "./exam-client";
import { SprintClient } from "@/components/practice/SprintClient";
import Link from "next/link";
import { toQuestionPresentation } from "@/lib/question-contract";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
  const { sessionId } = await params;
  return {
    title: `Test ${sessionId.slice(0, 8)}... | Exam Prep`,
  };
}

async function ExamPageContent({
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
  if (session.status !== "in_progress")
    redirect(`/result/${sessionId}`);

  // Auto-submit if time expired while user was away
  if (session.mode !== "sprint" && session.duration_minutes > 0) {
    const startedAt = new Date(session.started_at).getTime();
    const endTime = startedAt + session.duration_minutes * 60 * 1000;
    if (Date.now() > endTime + 5000) {
      // Time expired — submit server-side and redirect to results
      const { submitTest } = await import("./actions");
      await submitTest(session.id, userId);
      redirect(`/result/${sessionId}`);
    }
  }

  const { data: existingAnswers } = await supabase.from("test_answers")
    .select("question_id, selected_option, selected_options, numeric_answer").eq("session_id", sessionId);

  let questionIds: string[] | null = session.question_ids;
  if (!questionIds) {
    const picked = await getQuestionsForSession(userId, {
      exam_id: session.exam_id, subject_id: session.subject_id,
      stream_id: session.stream_id, paper: session.paper, topic_id: session.topic_id, year: session.year, total_questions: session.total_questions,
    });
    const legacyIds = (existingAnswers || []).map(answer => answer.question_id);
    const selected = [...new Set([...legacyIds, ...picked.map(question => question.id)])].slice(0, session.total_questions);
    const { data: saved, error: saveError } = await supabase.from("test_sessions")
      .update({ question_ids: selected }).eq("id", sessionId).eq("user_id", userId)
      .is("question_ids", null).select("question_ids").maybeSingle();
    if (saveError) throw saveError;
    if (saved) questionIds = saved.question_ids;
    else {
      const { data: concurrent } = await supabase.from("test_sessions")
        .select("question_ids").eq("id", sessionId).single();
      questionIds = concurrent?.question_ids;
    }
  }
  const { data: savedQuestions, error: questionsError } = await supabase.from("questions")
    .select("*").eq("exam_id", exam.id)
    .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null").in("id", questionIds || []);
  if (questionsError) throw questionsError;
  const questionMap = new Map((savedQuestions || []).map(question => [question.id, question]));
  const questions = (questionIds || []).map(id => questionMap.get(id)).filter(question => question != null);

  // Sync session to actual question count (user may have requested more than available)
  if ((session.mode === "concept_fix" || (session.mode === "custom" && session.question_ids)) && questions.length !== session.total_questions) {
    return <div className="mx-auto max-w-lg space-y-3 p-6"><h1 className="text-xl font-semibold">This concept fix is no longer available</h1><p>A question could not be retrieved. Return to your dashboard to choose another concept fix.</p><Link href="/dashboard" className="underline">Open dashboard</Link></div>;
  }
  if (session.mode === "sprint" && questions.length !== 5) {
    return <div className="mx-auto max-w-lg space-y-3 p-6"><h1 className="text-xl font-semibold">This sprint is no longer available</h1><p>One of its questions has been removed. Start a new sprint from Quick Practice.</p><Link href="/practice" className="underline">Open Quick Practice</Link></div>;
  }
  if (questions.length !== session.total_questions) {
    await supabase
      .from("test_sessions")
      .update({
        total_questions: questions.length,
        duration_minutes:
          session.duration_minutes > 0
            ? Math.max(1, Math.min(session.duration_minutes, questions.length))
            : 0,
      })
      .eq("id", session.id);
    session.total_questions = questions.length;
    session.duration_minutes =
      session.duration_minutes > 0
        ? Math.max(1, Math.min(session.duration_minutes, questions.length))
        : 0;
  }

  // Send only presentation fields. Answers, explanations and import metadata stay server-side.
  const safeQuestions = questions.map(toQuestionPresentation);

  const { data: existingBookmarks } = await supabase
    .from("bookmarks")
    .select("question_id")
    .eq("user_id", userId);

  const initialAnswers: Record<string, QuestionResponse> = {};
  existingAnswers?.forEach((a) => {
    initialAnswers[a.question_id] = a.numeric_answer ?? (a.selected_options?.length ? a.selected_options : a.selected_option);
  });

  const initialBookmarks = new Set(
    existingBookmarks?.map((b) => b.question_id) || []
  );

  if (session.mode === "sprint") return <SprintClient userId={userId} session={session} questions={safeQuestions} initialAnswers={initialAnswers} />;

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
