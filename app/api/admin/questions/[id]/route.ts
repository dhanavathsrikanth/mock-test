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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const user = await checkAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { question_text, option_1, option_2, option_3, option_4, correct_option, explanation, image_url, reportId } = body;

  const { data: existing } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const changedFields: { field: string; old: string; new: string }[] = [];
  const updateData: Record<string, string | number | null> = {};

  const fieldsToCheck: [string, string | undefined][] = [
    ["question_text", question_text],
    ["option_1", option_1],
    ["option_2", option_2],
    ["option_3", option_3],
    ["option_4", option_4],
    ["explanation", explanation ?? null],
    ["image_url", image_url ?? null],
  ];

  for (const [field, value] of fieldsToCheck) {
    if (value !== undefined && String(existing[field as keyof typeof existing]) !== String(value)) {
      changedFields.push({
        field,
        old: String(existing[field as keyof typeof existing] ?? ""),
        new: String(value ?? ""),
      });
      (updateData as any)[field] = value;
    }
  }

  if (correct_option !== undefined && existing.correct_option !== correct_option) {
    changedFields.push({
      field: "correct_option",
      old: String(existing.correct_option),
      new: String(correct_option),
    });
    updateData.correct_option = correct_option;
  }

  if (changedFields.length === 0) {
    return NextResponse.json({ error: "No changes detected" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("questions")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const corrections = changedFields.map((cf) => ({
    question_id: id,
    report_id: reportId,
    corrected_by: user.id,
    field_changed: cf.field,
    old_value: cf.old,
    new_value: cf.new,
  }));

  const { error: correctionError } = await supabase
    .from("question_corrections")
    .insert(corrections);

  if (correctionError) {
    return NextResponse.json({ error: correctionError.message }, { status: 500 });
  }

  if (reportId) {
    await supabase
      .from("question_reports")
      .update({
        status: "resolved",
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);
  }

  return NextResponse.json({
    success: true,
    corrections: changedFields.length,
  });
}
