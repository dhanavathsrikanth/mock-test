import { getDailyQuestion } from "@/lib/daily-question";
import { getExamContext } from "@/lib/exam-context";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateStreak } from "@/lib/streak";
import { XP_REWARDS, awardXP } from "@/lib/xp";
import { checkAndAwardBadges } from "@/lib/badges";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, exam, stream } = await getExamContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!exam || (exam.requires_stream && !stream)) return NextResponse.json({ error: "Choose an exam first" }, { status: 409 });

  const url = new URL(req.url);
  const isHistory = url.searchParams.get("history") === "true";

  // Fetch history
  if (isHistory) {
    const { data: allDaily } = await supabase
      .from("daily_questions")
      .select(`
        id,
        assigned_date,
        question_id,
        questions!inner ( subject_id, subjects ( name ) )
      `)
      .eq("questions.exam_id", exam.id)
    .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null", { referencedTable: "questions" })
      .order("assigned_date", { ascending: false });

    const { data: answers } = await supabase
      .from("daily_question_answers")
      .select("daily_question_id, selected_option, is_correct")
      .eq("user_id", user.id);

    const answerMap = new Map(
      (answers || []).map((a) => [a.daily_question_id, a])
    );

    const history = (allDaily || []).map((d) => {
      const q = d as any;
      const ans = answerMap.get(d.id);
      return {
        id: d.id,
        assignedDate: d.assigned_date,
        question: { subject: q.questions?.subjects?.name || null },
        userAnswer: ans
          ? {
              selectedOption: ans.selected_option,
              isCorrect: ans.is_correct,
            }
          : null,
      };
    });

    return NextResponse.json({ history });
  }

  return NextResponse.json(await getDailyQuestion() ?? { question: null, message: "No question assigned for today yet" });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { user, exam, stream } = await getExamContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!exam || (exam.requires_stream && !stream)) return NextResponse.json({ error: "Choose an exam first" }, { status: 409 });

  const body = await req.json();
  const { dailyQuestionId, selectedOption } = body;

  if (!dailyQuestionId || !selectedOption) {
    return NextResponse.json({ error: "dailyQuestionId and selectedOption required" }, { status: 400 });
  }

  if (selectedOption < 1 || selectedOption > 4) {
    return NextResponse.json({ error: "Invalid option" }, { status: 400 });
  }

  const { data: daily } = await supabase
    .from("daily_questions")
    .select("id, question_id, questions!inner(correct_option, explanation)")
    .eq("questions.question_type", "MCQ")
    .eq("questions.exam_id", exam.id)
    .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null", { referencedTable: "questions" })
    .eq("id", dailyQuestionId)
    .single();

  if (!daily) {
    return NextResponse.json({ error: "Daily question not found" }, { status: 404 });
  }

  // Check for existing answer - fetch all for this daily question and filter in JS
  // Avoids RLS user_id text/uuid type mismatch issues
  const { data: allExisting } = await supabase
    .from("daily_question_answers")
    .select("id, user_id")
    .eq("daily_question_id", dailyQuestionId);

  const existing = (allExisting || []).find((a: any) => a.user_id === user.id) || null;

  if (existing) {
    return NextResponse.json({ error: "Already answered" }, { status: 409 });
  }

  const q = daily as any;
  const correctOption = q.questions.correct_option;
  const isCorrect = selectedOption === correctOption;

  const { error: insertError } = await supabase
    .from("daily_question_answers")
    .insert({
      daily_question_id: dailyQuestionId,
      user_id: user.id,
      selected_option: selectedOption,
      is_correct: isCorrect,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const xpAmount = isCorrect
    ? XP_REWARDS.DAILY_QUESTION_CORRECT
    : XP_REWARDS.DAILY_QUESTION_ATTEMPTED;

  const xpResult = await awardXP(
    user.id,
    xpAmount,
    isCorrect ? "Daily question correct" : "Daily question attempted"
  );

  await updateStreak(user.id);

  let newBadges: { slug: string; name: string; icon_emoji: string }[] = [];
  try {
    const badgeResults = await checkAndAwardBadges(user.id);
    newBadges = badgeResults
      .filter((r) => r.awarded)
      .map((r) => ({
        slug: r.badge.slug,
        name: r.badge.name,
        icon_emoji: r.badge.icon_emoji,
      }));
  } catch {
    // Badge check failure should not block daily question response
  }

  return NextResponse.json({
    isCorrect,
    correctOption,
    explanation: q.questions.explanation,
    xpAwarded: xpResult.xpAwarded,
    leveledUp: xpResult.leveledUp,
    newLevelName: xpResult.newLevelName,
    newLevelNumber: xpResult.newLevelNumber,
    newBadges,
  });
}
