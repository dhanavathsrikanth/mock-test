import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getExamContext } from "@/lib/exam-context";

export async function GET() {
  const { user, exam } = await getExamContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!exam) return NextResponse.json({ error: "Choose an exam first" }, { status: 409 });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("exam_countdown")
    .select("id, label, exam_date, is_official")
    .eq("is_active", true)
    .eq("exam_id", exam.id)
    .gte("exam_date", new Date().toISOString().split("T")[0])
    .order("exam_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({
      id: null,
      label: exam.name,
      examDate: null,
      isOfficial: false,
    });
  }

  return NextResponse.json({
    id: data.id,
    label: data.label,
    examDate: data.exam_date,
    isOfficial: data.is_official,
  });
}
