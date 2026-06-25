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

  const body = await req.json();
  const { action } = body;

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
