import { requireExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import { ProfileContent } from "./profile-content";

export const metadata = { title: "Profile | Exam Prep" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { user, exam, stream } = await requireExamContext();

  const userId = user.id;

  const [profileResult, examsResult, levelResult, transactionsResult, badgesResult, testsResult, bookmarksResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("exams").select("id, name").eq("is_active", true).order("name"),
    supabase.from("user_levels").select("total_xp, current_level, level_name").eq("user_id", userId).maybeSingle(),
    supabase.from("xp_transactions").select("id, amount, reason, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("user_badges").select("id, badge_type, unlocked_at, streak_at_unlock").eq("user_id", userId),
    supabase.from("test_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId)
      .eq("exam_id", exam.id).or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null").eq("status", "completed"),
    supabase.from("bookmarks").select("id, questions!inner(exam_id)", { count: "exact", head: true })
      .eq("questions.exam_id", exam.id).or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null", { referencedTable: "questions" }).eq("user_id", userId),
  ]);
  let profile = profileResult.data;
  if (!profile) {
    const { data: newProfile } = await supabase.from("profiles")
      .upsert({ id: userId, full_name: user.email?.split("@")[0] || "User", email: user.email || "" }).select().single();
    profile = newProfile;
  }
  const exams = examsResult.data;
  const levelData = levelResult.data;
  const xpTransactions = transactionsResult.data;
  const badges = badgesResult.data;
  const totalTests = testsResult.count;
  const totalBookmarks = bookmarksResult.count;

  return (
    <ProfileContent
      profile={profile}
      exams={exams || []}
      levelData={levelData}
      xpTransactions={xpTransactions || []}
      badges={badges || []}
      totalTests={totalTests || 0}
      totalBookmarks={totalBookmarks || 0}
    />
  );
}
