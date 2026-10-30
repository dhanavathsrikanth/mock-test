import { requireExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import { ProfileContent } from "./profile-content";

export const metadata = { title: "Profile | Exam Prep" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { user, exam, stream } = await requireExamContext();

  const userId = user.id;

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    const { data: newProfile } = await supabase
      .from("profiles")
      .upsert({ id: userId, full_name: user.email?.split("@")[0] || "User", email: user.email || "" })
      .select()
      .single();
    profile = newProfile;
  }

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  // Fetch XP level data
  const { data: levelData } = await supabase
    .from("user_levels")
    .select("total_xp, current_level, level_name")
    .eq("user_id", userId)
    .maybeSingle();

  // Fetch recent XP transactions
  const { data: xpTransactions } = await supabase
    .from("xp_transactions")
    .select("id, amount, reason, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch badges
  const { data: badges } = await supabase
    .from("user_badges")
    .select("id, badge_type, unlocked_at, streak_at_unlock")
    .eq("user_id", userId);

  // Fetch test stats
  const { count: totalTests } = await supabase
    .from("test_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("exam_id", exam.id)
    .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null")
    .eq("status", "completed");

  const { count: totalBookmarks } = await supabase
    .from("bookmarks")
    .select("id, questions!inner(exam_id)", { count: "exact", head: true })
    .eq("questions.exam_id", exam.id)
    .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null", { referencedTable: "questions" })
    .eq("user_id", userId);

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
