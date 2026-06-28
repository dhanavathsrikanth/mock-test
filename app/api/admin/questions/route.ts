import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const subjectId = searchParams.get("subject_id") || "";
  const topicId = searchParams.get("topic_id") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase
    .from("questions")
    .select("id, question_text, year, difficulty, subject_id, topic_id, subjects(name), topics(name)", { count: "exact" });

  if (search) {
    query = query.ilike("question_text", `%${search}%`);
  }

  if (subjectId) {
    query = query.eq("subject_id", subjectId);
  }

  if (topicId) {
    query = query.eq("topic_id", topicId);
  }

  query = query.order("created_at", { ascending: false });

  const from = offset;
  const to = offset + limit - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    questions: data || [],
    total: count || 0,
    limit,
    offset,
  });
}
