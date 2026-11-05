import { NextRequest, NextResponse } from "next/server";
import { getExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import { getRevisionQueue, addToSRSQueue, updateSRSAfterAnswer } from "@/lib/srs";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const action = req.nextUrl.searchParams.get("action");
  if (action !== "due" && action !== "summary") return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  try {
    const queue = await getRevisionQueue();
    return NextResponse.json(action === "summary" ? queue.summary : queue, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Revision queue failed", error);
    return NextResponse.json({ error: "Unable to load revision. Please try again." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const { user, exam, stream } = await getExamContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!exam || (exam.requires_stream && !stream)) return NextResponse.json({ error: "Choose an exam first" }, { status: 409 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { action, questionId, result, reviewDate } = body;
  // Older exam clients notify after submission; the completion trigger handles enrollment.
  if (action === "process-session") return NextResponse.json({ success: true });
  if (!["add", "answer"].includes(action) || typeof questionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(questionId))
    return NextResponse.json({ error: "Valid action and questionId required" }, { status: 400 });
  if (action === "answer" && (!["correct", "wrong"].includes(result) || typeof reviewDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(reviewDate)))
    return NextResponse.json({ error: "Valid result and reviewDate required" }, { status: 400 });
  const supabase = await createClient();
  const { data: question, error } = await supabase.from("questions").select("id")
    .eq("id", questionId).eq("exam_id", exam.id).eq("marks_to_all", false)
    .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null").maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to verify question" }, { status: 503 });
  if (!question) return NextResponse.json({ error: "Question unavailable for your exam" }, { status: 404 });
  try {
    if (action === "add") {
      await addToSRSQueue(questionId);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(await updateSRSAfterAnswer(questionId, result, reviewDate));
  } catch (error) {
    console.error("Revision update failed", error);
    return NextResponse.json({ error: "Unable to save review. Retry, or reload if the day has changed." }, { status: 409 });
  }
}
