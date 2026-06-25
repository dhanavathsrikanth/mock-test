import { createClient } from "@/lib/supabase/server";
import { UsersClient } from "./users-client";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [profilesRes, activeToday, newThisWeek, avgStreakRes, sessionsRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, xp, role, created_at, avatar_url", { count: "exact" }).order("created_at", { ascending: false }),
    supabase.from("test_sessions").select("user_id", { count: "exact", head: true }).gte("started_at", today),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("streaks").select("current_streak"),
    supabase.from("test_sessions").select("user_id, count:user_id", { count: "exact", head: true }),
  ]);

  const profiles = profilesRes.data || [];
  const avgStreakArr = avgStreakRes.data || [];
  const avgStreak = avgStreakArr.length > 0
    ? Math.round(avgStreakArr.reduce((sum: number, s: any) => sum + (s.current_streak || 0), 0) / avgStreakArr.length)
    : 0;

  return (
    <UsersClient
      users={profiles.map((p) => ({
        id: p.id,
        fullName: p.full_name || "Unnamed",
        email: p.email || "",
        xp: p.xp || 0,
        role: p.role || "user",
        createdAt: p.created_at,
      }))}
      stats={{
        totalUsers: profilesRes.count || 0,
        activeToday: activeToday.count || 0,
        newThisWeek: newThisWeek.count || 0,
        avgStreak,
        totalSessions: sessionsRes.count || 0,
      }}
    />
  );
}
