import { NextResponse } from "next/server";
import { createCronClient } from "@/lib/supabase/cron";

export const maxDuration = 60;

async function handleCron(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createCronClient();
  const today = new Date().toISOString().split("T")[0];
  const { data: exams, error } = await supabase.from("exams").select("id,requires_stream").eq("is_active", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let assigned = 0;
  const emptyExams: string[] = [];
  const {data: streams,error:streamError}=await supabase.from('exam_streams').select('id,exam_id').eq('is_active',true);
  if(streamError) return NextResponse.json({error:streamError.message},{status:500});
  const scopes=(exams||[]).flatMap(exam=>exam.requires_stream ? (streams||[]).filter(stream=>stream.exam_id===exam.id).map(stream=>({id:exam.id,streamId:stream.id})) : [{id:exam.id,streamId:null}]);
  for (const exam of scopes) {
    const { data: existing, error: existingError } = await supabase.from("daily_questions").select("id")
      .eq("exam_id", exam.id).or(exam.streamId ? `stream_id.eq.${exam.streamId}` : "stream_id.is.null").eq("assigned_date", today).maybeSingle();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
    if (existing) continue;
    const { data: used, error: usedError } = await supabase.from("daily_questions").select("question_id").eq("exam_id", exam.id).or(exam.streamId ? `stream_id.eq.${exam.streamId}` : "stream_id.is.null");
    if (usedError) return NextResponse.json({ error: usedError.message }, { status: 500 });
    let query = supabase.from("questions").select("id").eq("exam_id", exam.id).or(exam.streamId ? `stream_id.eq.${exam.streamId}` : "stream_id.is.null").eq("question_type", "MCQ").eq("marks_to_all", false);
    if (used?.length) query = query.not("id", "in", `(${used.map(q => q.question_id).join(",")})`);
    const { data: available, error: questionError } = await query.limit(50);
    if (questionError) return NextResponse.json({ error: questionError.message }, { status: 500 });
    if (!available?.length) { emptyExams.push(exam.id); continue; }
    const pick = available[Math.floor(Math.random() * available.length)];
    const { error: insertError } = await supabase.from("daily_questions").insert({
      exam_id: exam.id, question_id: pick.id, assigned_date: today,
    });
    if (insertError && insertError.code !== "23505") return NextResponse.json({ error: insertError.message }, { status: 500 });
    if (!insertError) assigned++;
  }
  return NextResponse.json({ message: "Daily questions assigned per exam and stream", assigned, emptyExams });
}

export const GET = handleCron;
export const POST = handleCron;
