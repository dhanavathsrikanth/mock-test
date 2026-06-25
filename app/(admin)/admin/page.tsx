import { createClient } from "@/lib/supabase/server";
import { AdminDashboardClient } from "./dashboard-client";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [questionsCount, reportsCount, usersCount, dailyCount] = await Promise.all([
    supabase.from("questions").select("*", { count: "exact", head: true }),
    supabase.from("question_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("daily_questions").select("*", { count: "exact", head: true })
      .gte("assigned_date", new Date().toISOString().split("T")[0]),
  ]);

  const today = new Date().toISOString().split("T")[0];
  const { data: recentReports } = await supabase
    .from("question_reports")
    .select("id, report_type, status, created_at, question_id, questions(question_text)")
    .order("created_at", { ascending: false })
    .limit(5);

  const pendingReports = recentReports?.filter((r) => r.status === "pending").length || 0;

  return (
    <AdminDashboardClient
      stats={{
        totalQuestions: questionsCount.count || 0,
        pendingReports: reportsCount.count || 0,
        totalUsers: usersCount.count || 0,
        todayQuestions: dailyCount.count || 0,
        recentReports: (recentReports || []).map((r) => ({
          id: r.id,
          type: r.report_type,
          status: r.status,
          createdAt: r.created_at,
          questionText: (r as any).questions?.question_text || null,
        })),
      }}
    />
  );
}
