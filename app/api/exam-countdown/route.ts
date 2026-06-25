import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("exam_countdown")
    .select("id, label, exam_date, is_official")
    .eq("is_active", true)
    .order("exam_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({
      id: null,
      label: "TGPSC AEE 2026 Exam",
      examDate: "2026-11-15",
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
