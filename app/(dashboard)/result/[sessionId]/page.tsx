import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import {
  recordsForQuestions,
  summarizeAttempts,
  type MetricsAnswer,
  type MetricsQuestion,
} from "@/lib/test-metrics";
import { ResultContent, type QuestionTypeStats, type MarksTierStats, type SubjectBreakdown } from "./result-content";
import { SessionConcepts } from "@/components/smart-tags/SessionConcepts";
import { Suspense } from "react";

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

  const { data: session, error: sessionError } = await supabase
    .from("test_sessions")
    .select("*")
    .eq("exam_id", exam.id)
    .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (sessionError || !session) {
    notFound();
  }
  if (session.status === "in_progress")
    redirect(`/test/${sessionId}`);

  const { data: answers, error: answersError } = await supabase
    .from("test_answers")
    .select("*, questions(*)")
    .eq("session_id", sessionId);

  if (answersError) {
    throw new Error("Unable to load the saved answers for this session. Please retry.");
  }

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("exam_id", session.exam_id)
    .or(stream ? `stream_id.eq.${stream.id},stream_id.is.null` : "stream_id.is.null");

  const subjectNameMap = new Map(
    (subjects || []).map((subject) => [subject.id, subject.name])
  );

  const subjectIds = [...new Set((subjects || []).map((subject) => subject.id).filter(Boolean))] as string[];
  const { data: topicRows } = subjectIds.length > 0
    ? await supabase
        .from("topics")
        .select("id, name, subject_id")
        .in("subject_id", subjectIds)
    : { data: [] };
  const topicNameMap = new Map(
    (topicRows || []).map((topic) => [topic.id, topic.name])
  );

  const answerList = (answers || []) as (MetricsAnswer & {
    questions?: MetricsQuestion | MetricsQuestion[] | null;
  })[];
  const declaredQuestionIds = Array.isArray(session.question_ids) && session.question_ids.length > 0
    ? session.question_ids
    : [];
  const answerQuestionIds = answerList.map((answer) => answer.question_id);
  const questionIds = declaredQuestionIds.length > 0 ? declaredQuestionIds : answerQuestionIds;
  const recordedQuestionCount = Math.max(questionIds.length, Number(session.total_questions ?? 0));

  let markedQuestions: MetricsQuestion[] = [];
  if (questionIds.length > 0) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, marks, negative_marks, marks_to_all, question_type, subject_id, topic_id")
      .eq("exam_id", session.exam_id)
      .in("id", questionIds);
    if (error) {
      throw new Error("Unable to load the question set for this session. Please retry.");
    }
    markedQuestions = (data || []) as MetricsQuestion[];
  }

  // Keep the persisted question order and use the joined row as a fallback for
  // older sessions whose question record could not be fetched directly.
  const questionMap = new Map<string, MetricsQuestion>();
  for (const question of markedQuestions) questionMap.set(question.id, question);
  for (const answer of answerList) {
    const joined = Array.isArray(answer.questions) ? answer.questions[0] : answer.questions;
    if (joined?.id && !questionMap.has(joined.id)) {
      questionMap.set(joined.id, joined);
    }
  }

  const answerMap = new Map(answerList.map((answer) => [answer.question_id, answer]));
  const built = recordsForQuestions(questionIds, questionMap, answerMap);
  const summary = summarizeAttempts(built.records, {
    session,
    subjectNames: subjectNameMap,
    topicNames: topicNameMap,
  });

  const missingQuestionCount = Math.max(
    0,
    recordedQuestionCount - summary.stats.total,
    built.missingQuestionCount,
  );
  const dataCaveats: string[] = [];
  if (missingQuestionCount > 0) {
    dataCaveats.push(
      `${missingQuestionCount} question${missingQuestionCount === 1 ? "" : "s"} in this session could not be loaded. The figures below cover the ${summary.stats.total} loaded question${summary.stats.total === 1 ? "" : "s"}.`
    );
  }
  if (summary.stats.ungraded > 0) {
    dataCaveats.push(
      `${summary.stats.ungraded} saved response${summary.stats.ungraded === 1 ? "" : "s"} did not have a trusted grading result and are not counted as correct or incorrect.`
    );
  }

  const questionTypeBreakdown: QuestionTypeStats[] = (["MCQ", "MSQ", "NAT"] as const).map((type) => ({
    type,
    ...summary.byType[type],
  }));

  const marksTierBreakdown: MarksTierStats[] = ([1, 2] as const).map((tier) => ({
    tier,
    ...summary.byTier[String(tier) as "1" | "2"],
  }));

  const subjectBreakdown: SubjectBreakdown[] = summary.bySubject.map((subject) => ({
    id: subject.id,
    name: subject.name,
    total: subject.total,
    graded: subject.graded,
    attempted: subject.attempted,
    gradedAttempts: subject.gradedAttempts,
    correct: subject.correct,
    wrong: subject.wrong,
    skipped: subject.skipped,
    ungraded: subject.ungraded,
    marksToAll: subject.marksToAll,
    earnedMarks: subject.earnedMarks,
    deductedMarks: subject.deductedMarks,
    netMarks: subject.netMarks,
    maximumMarks: subject.maximumMarks,
    skippedMarks: subject.skippedMarks,
    correctRate: subject.correctRate,
    attemptAccuracy: subject.attemptAccuracy,
    netMarkRate: subject.netMarkRate,
  }));

  let message: { title: string; subtitle: string; icon: string };
  if (summary.stats.graded === 0) {
    message = {
      title: "Marks awarded",
      subtitle: "No ordinarily graded questions in this session",
      icon: "🧾",
    };
  } else if (summary.stats.gradedAttempts === 0) {
    message = {
      title: "No graded attempts",
      subtitle: "Review the paper before trying the next one",
      icon: "📋",
    };
  } else if (summary.stats.graded < 10) {
    message = {
      title: "Session complete",
      subtitle: "Short practice — use the breakdown to choose the next step",
      icon: "✅",
    };
  } else if ((summary.stats.correctRate ?? 0) >= 70) {
    message = {
      title: "Strong session",
      subtitle: "Good coverage and accuracy in this test",
      icon: "🏆",
    };
  } else if ((summary.stats.correctRate ?? 0) >= 45) {
    message = {
      title: "Solid base",
      subtitle: "Review the misses and skipped questions next",
      icon: "📊",
    };
  } else {
    message = {
      title: "Review next",
      subtitle: "Use the breakdown below to choose what to revisit",
      icon: "📚",
    };
  }

  return (
    <ResultContent
      diagnosticPanel={
        <Suspense fallback={<section role="status" className="rounded-xl border p-4 text-sm text-muted-foreground">Analysing your answers…</section>}>
          <SessionConcepts userId={userId} examId={exam.id} streamId={stream?.id ?? null} sessionId={sessionId} />
        </Suspense>
      }
      marks={{
        earned: summary.stats.earnedMarks,
        deducted: summary.stats.deductedMarks,
        maximum: summary.stats.maximumMarks,
        net: summary.stats.netMarks,
      }}
      correctCount={summary.stats.correct}
      wrongCount={summary.stats.wrong}
      skippedCount={summary.stats.skipped}
      marksToAllCount={summary.stats.marksToAll}
      gradedQuestionCount={summary.stats.graded}
      attemptedCount={summary.stats.gradedAttempts}
      accuracy={summary.stats.attemptAccuracy}
      correctRate={summary.stats.correctRate}
      skippedMarks={summary.stats.skippedMarks}
      totalQuestions={Math.max(summary.stats.total, recordedQuestionCount)}
      timing={summary.timing}
      hasQuestionTiming={summary.hasQuestionTiming}
      pacing={summary.pacing}
      subjectBreakdown={subjectBreakdown}
      message={message}
      sessionId={sessionId}
      isSprint={session.mode === "sprint"}
      sourceYear={session.year}
      sourcePaper={session.paper}
      examName={exam.name}
      streamName={stream?.name ?? null}
      questionTypeBreakdown={questionTypeBreakdown}
      marksTierBreakdown={marksTierBreakdown}
      dataCaveats={dataCaveats}
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
