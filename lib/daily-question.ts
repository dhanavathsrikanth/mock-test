import { cache } from "react";
import { requireExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";

export interface DailyData {
  id: string;
  assignedDate: string;
  question: {
    id: string;
    text: string;
    options: string[];
    correctOption: number | null;
    explanation: string | null;
    year: number | null;
    subject: string | null;
  };
  userAnswer: { selectedOption: number; isCorrect: boolean } | null;
}

export const getDailyQuestion = cache(async (): Promise<DailyData | null> => {
  const { user, exam, stream } = await requireExamContext();
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  // Fetch today's question
  const { data: daily, error: dailyError } = await supabase
    .from("daily_questions")
    .select(`
      id,
      assigned_date,
      question_id,
      questions!inner (
        id,
        question_text,
        option_1,
        option_2,
        option_3,
        option_4,
        correct_option,
        explanation,
        year,
        subject_id,
        subjects ( name )
      )
    `)
    .eq("questions.exam_id", exam.id)
    .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null", { referencedTable: "questions" })
    .eq("assigned_date", today)
    .maybeSingle();

  if (dailyError) throw dailyError;
  if (!daily) {
    return null;
  }

  const { data: allAnswers, error: answerError } = await supabase
    .from("daily_question_answers")
    .select("selected_option, is_correct, user_id")
    .eq("daily_question_id", daily.id)
    .eq("user_id", user.id);

  if (answerError) throw answerError;

  const finalAnswer = allAnswers?.find(a => a.user_id === user.id) ?? null;

  const question = daily.questions as unknown as {
    id: string;
    question_text: string;
    option_1: string;
    option_2: string;
    option_3: string;
    option_4: string;
    correct_option: number | null;
    explanation: string | null;
    year: number | null;
    subjects?: { name: string } | null;
  };

  return {
    id: daily.id,
    assignedDate: daily.assigned_date,
    question: {
      id: question.id,
      text: question.question_text,
      options: [question.option_1, question.option_2, question.option_3, question.option_4],
      correctOption: finalAnswer ? question.correct_option : null,
      explanation: finalAnswer ? question.explanation : null,
      year: question.year,
      subject: question.subjects?.name || null,
    },
    userAnswer: finalAnswer
      ? {
          selectedOption: finalAnswer.selected_option,
          isCorrect: finalAnswer.is_correct,
        }
      : null,
  };
});
