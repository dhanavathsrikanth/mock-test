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

  const sessions = sessionsRes.data || [];
  const answeredRes = await supabase
    .from("test_answers")
    .select("is_correct, session_id, question_id")
    .in("session_id", sessions.map((s) => s.id));

  const answers = answeredRes.data || [];
  const totalAttempted = answers.length;
  const correctCount = answers.filter((a) => a.is_correct).length;
  const accuracy = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;
  const scores = sessions.filter((s) => s.status === "completed");
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + (s.total_questions || 0), 0) / scores.length)
    : 0;

  const subjectBreakdown: Record<string, number> = {};
  (bookmarksRes.data || []).forEach((b) => {
    const q = b as any;
    const name = q.questions?.subjects?.name || "Unknown";
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
        totalXpEarned: xpRes.data?.reduce((sum, t) => sum + t.amount, 0) || 0,
        subjectBreakdown,
      }}
      sessions={sessions.map((s) => ({
        id: s.id,
        totalQuestions: s.total_questions || 0,
        mode: s.mode || "custom",
        status: s.status,
        startedAt: s.started_at,
        completedAt: s.completed_at,
        createdAt: s.created_at,
      }))}
      reports={(reportsRes.data || []).map((r) => ({
        id: r.id,
        reportType: r.report_type,
        status: r.status,
        createdAt: r.created_at,
      }))}
      transactions={(xpRes.data || []).map((t) => ({
        id: t.id,
        amount: t.amount,
        reason: t.reason,
        createdAt: t.created_at,
      }))}
      badges={(badgesRes.data || []).map((b) => ({
        badgeType: b.badge_type,
        unlockedAt: b.unlocked_at,
      }))}
    />
  );
}
