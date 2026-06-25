import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return user;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const user = await checkAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const reportType = searchParams.get("reportType");
  const subjectId = searchParams.get("subjectId");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  let query = supabase
    .from("question_reports")
    .select(`
      *,
      profiles!question_reports_reported_by_fkey(full_name, email),
      questions!inner(
        id, question_text, year, subject_id,
        subjects(name)
      )
    `, { count: "exact" });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (reportType) {
    query = query.eq("report_type", reportType);
  }
  if (subjectId) {
    query = query.eq("questions.subject_id", subjectId);
  }
  if (search) {
    query = query.ilike("questions.question_text", `%${search}%`);
  }

  const { data: stats } = await supabase.rpc("get_report_stats");

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data: reports, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .order("name");

  return NextResponse.json({
    reports: reports || [],
    total: count || 0,
    page,
    limit,
    stats: stats?.[0] || null,
    subjects: subjects || [],
  });
}
