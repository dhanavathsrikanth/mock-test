import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

async function handleCron(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("daily_questions")
    .select("id")
    .eq("assigned_date", today)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: "Already assigned for today" });
  }

  const { data: usedIds } = await supabase
    .from("daily_questions")
    .select("question_id");

  const usedQuestionIds = (usedIds || []).map((dq) => dq.question_id);

  let query = supabase.from("questions").select("id");

  if (usedQuestionIds.length > 0) {
    query = query.not("id", "in", `(${usedQuestionIds.join(",")})`);
  }

  const { data: available } = await query.limit(50);

  if (!available || available.length === 0) {
    return NextResponse.json(
      { error: "No unused questions available" },
      { status: 500 }
    );
  }

  const pick = available[Math.floor(Math.random() * available.length)];

  const { error: insertError } = await supabase
    .from("daily_questions")
    .insert({
      question_id: pick.id,
      assigned_date: today,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Daily question assigned",
    questionId: pick.id,
  });
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
