import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { questionId, reportType, description, suggestedCorrectOption } = body;

  if (!questionId || !reportType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validTypes = ["wrong_answer", "unclear_question", "typo_error", "wrong_options", "outdated_content", "other"];
  if (!validTypes.includes(reportType)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }

  if (description && description.length > 500) {
    return NextResponse.json({ error: "Description too long" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("question_reports")
    .select("id")
    .eq("question_id", questionId)
    .eq("reported_by", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You have already reported this question" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("question_reports")
    .insert({
      question_id: questionId,
      reported_by: user.id,
      report_type: reportType,
      description: description || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Report insert error:", error);
    return NextResponse.json({ 
      error: "Failed to submit report", 
      details: error.message, 
      code: error.code 
    }, { status: 500 });
  }

  return NextResponse.json({ success: true, reportId: data.id });
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get("questionId");

  if (!questionId) {
    return NextResponse.json({ error: "Missing questionId" }, { status: 400 });
  }

  const { data: report } = await supabase
    .from("question_reports")
    .select("id, status")
    .eq("question_id", questionId)
    .eq("reported_by", user.id)
    .maybeSingle();

  const { data: correction } = await supabase
    .from("question_corrections")
    .select("field_changed, old_value, new_value, created_at")
    .eq("question_id", questionId)
    .order("created_at", { ascending: false })
    .maybeSingle();

  return NextResponse.json({
    report: report || null,
    correction: correction || null,
  });
}
