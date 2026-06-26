import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { UserDetailClient } from "./user-detail-client";

export default async function UserDetailPage(props: { params: Promise<{ userId: string }> }) {
  const { userId } = await props.params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) notFound();

  const [levelRes, streakRes, sessionsRes, bookmarksRes, reportsRes, xpRes, badgesRes] = await Promise.all([
    supabase.from("user_levels").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("streaks").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("test_sessions").select("id, total_questions, duration_minutes, mode, status, started_at, completed_at, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("bookmarks").select("id, question_id, created_at, questions(subject_id, subjects(name))")
      .eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("question_reports").select("id, report_type, status, created_at, question_id")
      .eq("reported_by", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("xp_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("user_badges").select("*").eq("user_id", userId),
  ]);

  const { data: notifsRes } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const sessions = sessionsRes.data || [];
  const sessionIds = sessions.map((s: any) => s.id);

  const [answeredRes, subjectAccRes, dqRes] = await Promise.all([
    supabase.from("test_answers")
      .select("is_correct, session_id, question_id, selected_option")
      .in("session_id", sessionIds),
    sessionIds.length > 0
      ? supabase.from("test_answers")
          .select("is_correct, questions(subject_id, subjects(name))")
          .in("session_id", sessionIds)
      : { data: [] },
    supabase.from("daily_question_answers")
      .select("is_correct, selected_option, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const answers = answeredRes.data || [];
  const subjectAnswers = subjectAccRes.data || [];
  const dailyAnswers = dqRes.data || [];

  const totalAttempted = answers.length;
  const correctCount = answers.filter((a: any) => a.is_correct).length;
  const accuracy = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;
  const scores = sessions.filter((s: any) => s.status === "completed");
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum: number, s: any) => sum + (s.total_questions || 0), 0) / scores.length)
    : 0;

  // Per-session stats
  const sessionStatsMap: Record<string, { correct: number; wrong: number; skipped: number; total: number }> = {};
  answers.forEach((a: any) => {
    if (!sessionStatsMap[a.session_id]) {
      sessionStatsMap[a.session_id] = { correct: 0, wrong: 0, skipped: 0, total: 0 };
    }
    sessionStatsMap[a.session_id].total++;
    if (a.is_correct) sessionStatsMap[a.session_id].correct++;
    else if (a.selected_option == null) sessionStatsMap[a.session_id].skipped++;
    else sessionStatsMap[a.session_id].wrong++;
  });

  // Subject-wise accuracy
  const subjectAccMap: Record<string, { correct: number; total: number }> = {};
  subjectAnswers.forEach((a: any) => {
    const subj = a.questions?.subjects?.name || "Unknown";
    if (!subjectAccMap[subj]) subjectAccMap[subj] = { correct: 0, total: 0 };
    subjectAccMap[subj].total++;
    if (a.is_correct) subjectAccMap[subj].correct++;
  });
  const subjectAccuracy = Object.entries(subjectAccMap)
    .map(([name, d]) => ({ name, accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0, attempts: d.total }))
    .sort((a, b) => b.attempts - a.attempts);

  // Accuracy trend (per completed session, sorted chronologically)
  const completedSessions = sessions
    .filter((s: any) => s.status === "completed" && s.completed_at)
    .sort((a: any, b: any) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());
  const accuracyTrend = completedSessions.map((s: any) => {
    const st = sessionStatsMap[s.id];
    return {
      date: s.completed_at.slice(0, 10),
      accuracy: st && st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0,
    };
  });

  // XP timeline (daily totals)
  const xpByDay: Record<string, number> = {};
  (xpRes.data || []).forEach((t: any) => {
    if (t.created_at) {
      const d = t.created_at.slice(0, 10);
      xpByDay[d] = (xpByDay[d] || 0) + (t.amount || 0);
    }
  });
  const xpTimeline = Object.entries(xpByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, xp]) => ({ date, xp }));

  // Daily question stats
  const dailyQTotal = dailyAnswers.length;
  const dailyQCorrect = dailyAnswers.filter((a: any) => a.is_correct).length;
  const dailyQAccuracy = dailyQTotal > 0 ? Math.round((dailyQCorrect / dailyQTotal) * 100) : 0;

  const subjectBreakdown: Record<string, number> = {};
  (bookmarksRes.data || []).forEach((b: any) => {
    const name = b.questions?.subjects?.name || "Unknown";
    subjectBreakdown[name] = (subjectBreakdown[name] || 0) + 1;
  });

  const level = levelRes ? (levelRes as any).current_level ?? 0 : 0;
  const levelName = levelRes ? (levelRes as any).level_name ?? "Trainee" : "Trainee";
  const streak = streakRes ? (streakRes as any).current_streak ?? 0 : 0;
  const longestStreak = streakRes ? (streakRes as any).longest_streak ?? 0 : 0;
  const lastActiveDate = streakRes ? (streakRes as any).last_activity_date ?? null : null;

  return (
    <UserDetailClient
      user={{
        id: profile.id,
        fullName: profile.full_name || "Unnamed",
        email: profile.email || "",
        avatarUrl: profile.avatar_url,
        role: profile.role || "user",
        xp: profile.xp || 0,
        banned: profile.banned || false,
        createdAt: profile.created_at,
        level,
        levelName,
        streak,
        longestStreak,
        lastActiveDate,
      }}
      stats={{
        totalTests: sessions.length,
        completedTests: scores.length,
        avgScore,
        totalAttempted,
        correctCount,
        accuracy,
        bookmarks: bookmarksRes.data?.length || 0,
        reports: reportsRes.data?.length || 0,
        totalXpEarned: xpRes.data?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0,
        subjectBreakdown,
        dailyQTotal,
        dailyQCorrect,
        dailyQAccuracy,
      }}
      sessions={sessions.map((s: any) => ({
        id: s.id,
        totalQuestions: s.total_questions || 0,
        mode: s.mode || "custom",
        status: s.status,
        startedAt: s.started_at,
        completedAt: s.completed_at,
        createdAt: s.created_at,
        sessionStats: sessionStatsMap[s.id] || { correct: 0, wrong: 0, skipped: 0, total: 0 },
      }))}
      reports={(reportsRes.data || []).map((r: any) => ({
        id: r.id,
        reportType: r.report_type,
        status: r.status,
        createdAt: r.created_at,
      }))}
      transactions={(xpRes.data || []).map((t: any) => ({
        id: t.id,
        amount: t.amount,
        reason: t.reason,
        createdAt: t.created_at,
      }))}
      badges={(badgesRes.data || []).map((b: any) => ({
        badgeType: b.badge_type,
        unlockedAt: b.unlocked_at,
      }))}
      subjectAccuracy={subjectAccuracy}
      accuracyTrend={accuracyTrend}
      xpTimeline={xpTimeline}
      notifications={(notifsRes || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: n.is_read,
        createdAt: n.created_at,
      }))}
    />
  );
}
