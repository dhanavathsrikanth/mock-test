import { createClient } from "@/lib/supabase/server";
import { DailyClient } from "./daily-client";

export default async function AdminDailyPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  const [dqRes, questionsCountRes, answersRes] = await Promise.all([
    supabase
      .from("daily_questions")
      .select(`
        id, assigned_date, question_id, created_at,
        questions ( id, question_text, subject_id, year, difficulty, subjects ( name ) )
      `)
      .order("assigned_date", { ascending: false }),
    supabase.from("questions").select("*", { count: "exact", head: true }),
    supabase.from("daily_question_answers").select("id, daily_question_id, is_correct, created_at"),
  ]);

  const allDaily = dqRes.data || [];
  const allAnswers = answersRes.data || [];
  const totalQuestions = questionsCountRes.count || 0;

  const usedQuestionIds = new Set(allDaily.map((d) => d.question_id));
  const neverUsed = totalQuestions - usedQuestionIds.size;

  const todayAnswers = allAnswers.filter(
    (a) => a.created_at?.startsWith(today)
  );
  const answeredToday = todayAnswers.length;

  const correctCount = allAnswers.filter((a) => a.is_correct).length;
  const avgAccuracy = allAnswers.length > 0
    ? Math.round((correctCount / allAnswers.length) * 100)
    : 0;

  const answerMap: Record<string, { total: number; correct: number }> = {};
  allAnswers.forEach((a) => {
    const dqId = a.daily_question_id;
    if (!answerMap[dqId]) answerMap[dqId] = { total: 0, correct: 0 };
    answerMap[dqId].total++;
    if (a.is_correct) answerMap[dqId].correct++;
  });

  const subjectAnswerMap: Record<string, { total: number; correct: number }> = {};
  allDaily.forEach((d) => {
    const q = d as any;
    const subj = q.questions?.subjects?.name || "Unknown";
    const dqId = d.id;
    const stats = answerMap[dqId];
    if (stats) {
      if (!subjectAnswerMap[subj]) subjectAnswerMap[subj] = { total: 0, correct: 0 };
      subjectAnswerMap[subj].total += stats.total;
      subjectAnswerMap[subj].correct += stats.correct;
    }
  });

  const mapItem = (d: typeof allDaily[number]) => {
    const q = d as any;
    const stats = answerMap[d.id];
    return {
      id: d.id,
      date: d.assigned_date,
      questionId: d.question_id,
      questionText: q.questions?.question_text || null,
      subject: q.questions?.subjects?.name || null,
      year: q.questions?.year || null,
      difficulty: q.questions?.difficulty || null,
      userAnswers: stats?.total || 0,
      accuracy: stats ? Math.round((stats.correct / stats.total) * 100) : null,
    };
  };

  const upcoming = allDaily
    .filter((d) => d.assigned_date >= today)
    .sort((a, b) => a.assigned_date.localeCompare(b.assigned_date))
    .map(mapItem);

  const past = allDaily
    .filter((d) => d.assigned_date < today)
    .sort((a, b) => b.assigned_date.localeCompare(a.assigned_date))
    .map(mapItem);

  const subjectAccuracy = Object.entries(subjectAnswerMap).map(([name, s]) => ({
    name,
    accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    total: s.total,
  }));

  return (
    <DailyClient
      today={today}
      stats={{
        scheduledAhead: upcoming.length,
        answeredToday,
        avgAccuracy,
        neverUsed,
        totalQuestions,
      }}
      upcoming={upcoming}
      past={past}
      subjectAccuracy={subjectAccuracy}
    />
  );
}
