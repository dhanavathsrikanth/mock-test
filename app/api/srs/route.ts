import { getExamContext } from "@/lib/exam-context";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getTodaysSRSQuestions,
  updateSRSAfterAnswer,
  addToSRSQueue,
  getSRSSummary,
  addWrongAnswersFromSession,
} from "@/lib/srs";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "due") {
    const questions = await getTodaysSRSQuestions(user.id);
    const summary = await getSRSSummary(user.id);
    return NextResponse.json({ questions, summary });
  }

  if (action === "summary") {
    const summary = await getSRSSummary(user.id);
    return NextResponse.json(summary);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { exam, stream } = await getExamContext();
  if (!exam || (exam.requires_stream && !stream)) return NextResponse.json({ error: "Choose an exam first" }, { status: 409 });
  const body = await req.json();
  const { action } = body;
  if (action === "answer" || action === "add") {
    const { data: question } = await supabase.from("questions").select("id")
      .eq("id", body.questionId).eq("exam_id", exam.id)
    .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null").maybeSingle();
    if (!question) return NextResponse.json({ error: "Question not found for your exam" }, { status: 404 });
  }
  if (action === "process-session") {
    const { data: session } = await supabase.from("test_sessions").select("id")
      .eq("id", body.sessionId).eq("user_id", user.id).eq("exam_id", exam.id)
    .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null").maybeSingle();
    if (!session) return NextResponse.json({ error: "Session not found for your exam" }, { status: 404 });
  }

  if (action === "answer") {
    const { questionId, result } = body;
    if (!questionId || !result) {
      return NextResponse.json(
        { error: "questionId and result required" },
        { status: 400 }
      );
    }
    if (!["correct", "wrong", "skipped"].includes(result)) {
      return NextResponse.json({ error: "Invalid result" }, { status: 400 });
    }

    const srsResult = await updateSRSAfterAnswer(user.id, questionId, result);
    return NextResponse.json(srsResult);
  }

  if (action === "add") {
    const { questionId } = body;
    if (!questionId) {
      return NextResponse.json(
        { error: "questionId required" },
        { status: 400 }
      );
    }

    await addToSRSQueue(user.id, questionId);
    return NextResponse.json({ success: true });
  }

  if (action === "process-session") {
    const { sessionId } = body;
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId required" },
        { status: 400 }
      );
    }

    await addWrongAnswersFromSession(sessionId, user.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
