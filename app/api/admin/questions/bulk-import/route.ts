import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return user;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const user = await checkAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questions } = await req.json();

  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "No questions provided" }, { status: 400 });
  }

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, slug");

  const SLUG_ALIASES: Record<string, string> = {
    "som": "solid-mechanics",
    "rcc": "rcc-design",
    "hydraulics": "fluid-mechanics",
    "estimation": "estimation-costing",
    "hydrology": "water-resources-engg",
    "environmental": "environmental-engg",
    "transportation": "transportation-engg",
    "soil-mechanics": "geotechnical-engg",
  };

  const subjectMap = new Map((subjects || []).map((s) => [s.slug, s.id]));
  const resolveSlug = (slug: string) => {
    const normalized = slug.toLowerCase().trim();
    return subjectMap.get(normalized) || subjectMap.get(SLUG_ALIASES[normalized] || "");
  };

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name")
    .eq("is_active", true);

  const defaultExamId = exams?.[0]?.id;
  if (!defaultExamId) {
    return NextResponse.json({ error: "No active exam found" }, { status: 500 });
  }

  const imported: any[] = [];
  const skipped: { row: number; error: string }[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const rowNum = i + 2;

    if (!q.question_text?.trim()) {
      skipped.push({ row: rowNum, error: "Empty question text" });
      continue;
    }

    const subjectId = q.subject_slug
      ? resolveSlug(q.subject_slug)
      : null;

    if (!subjectId) {
      skipped.push({ row: rowNum, error: `Invalid subject_slug: "${q.subject_slug}"` });
      continue;
    }

    const correctOption = parseInt(q.correct_option);
    if (isNaN(correctOption) || correctOption < 1 || correctOption > 4) {
      skipped.push({ row: rowNum, error: `Invalid correct_option: "${q.correct_option}"` });
      continue;
    }

    if (!q.option_1?.trim() || !q.option_2?.trim() || !q.option_3?.trim() || !q.option_4?.trim()) {
      skipped.push({ row: rowNum, error: "Missing one or more options" });
      continue;
    }

    const difficulty = q.difficulty && ["easy", "medium", "hard"].includes(q.difficulty)
      ? q.difficulty
      : null;

    imported.push({
      exam_id: defaultExamId,
      subject_id: subjectId,
      year: q.year ? parseInt(q.year) || null : null,
      paper: q.paper?.trim() || null,
      question_text: q.question_text.trim(),
      option_1: q.option_1.trim(),
      option_2: q.option_2.trim(),
      option_3: q.option_3.trim(),
      option_4: q.option_4.trim(),
      correct_option: correctOption,
      explanation: q.explanation?.trim() || null,
      difficulty,
    });
  }

  let inserted = 0;
  if (imported.length > 0) {
    const { error } = await supabase.from("questions").insert(imported);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    inserted = imported.length;
  }

  return NextResponse.json({
    imported: inserted,
    skipped: skipped.length,
    errors: skipped,
    total: questions.length,
  });
}
