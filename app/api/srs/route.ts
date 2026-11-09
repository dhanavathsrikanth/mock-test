import { NextRequest, NextResponse } from "next/server";
import { getExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import { getRevisionQueue, addToSRSQueue, updateSRSAfterAnswer, getRevisionDeck } from "@/lib/srs";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const action = req.nextUrl.searchParams.get("action");
  if (action !== "due" && action !== "summary" && action !== "deck") return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  try {
    if (action === "deck") {
      const deck = await getRevisionDeck();
      return NextResponse.json(deck, { headers: { "Cache-Control": "no-store" } });
    }
    const queue = await getRevisionQueue();
    return NextResponse.json(action === "summary" ? queue.summary : queue, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Revision queue failed", error);
    try {
      const deck = await getRevisionDeck();
      const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
      const queueQuestions = deck.questions.slice(0, 20).map(q => ({
        id: q.id,
        stage: q.stage,
        question: q.question,
      }));
      const fallbackQueue = {
        reviewDate: todayStr,
        questions: queueQuestions,
        summary: {
          dueCount: queueQuestions.length,
          deferredCount: Math.max(0, deck.totalCount - queueQuestions.length),
          completedCount: 0,
          dailyCap: 20,
          totalCount: queueQuestions.length,
          xpEarned: 0,
          queueComplete: queueQuestions.length === 0,
        },
      };
      return NextResponse.json(action === "summary" ? fallbackQueue.summary : fallbackQueue, { headers: { "Cache-Control": "no-store" } });
    } catch (fallbackError) {
      console.error("Revision fallback also failed", fallbackError);
      return NextResponse.json({ error: "Unable to load revision. Please try again." }, { status: 503 });
    }
  }
}

export async function POST(req: Request) {
  const { user, exam, stream } = await getExamContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!exam || (exam.requires_stream && !stream)) return NextResponse.json({ error: "Choose an exam first" }, { status: 409 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { action, questionId, result, reviewDate, sessionId } = body;
  // Process a completed test session: enroll all wrong answers into revision.
  if (action === "process-session") {
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: session } = await supabase
      .from("test_sessions")
      .select("id, user_id, status")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();
    if (!session || session.status !== "completed") {
      return NextResponse.json({ error: "Session not found or not completed" }, { status: 404 });
    }
    const { data: wrongAnswers } = await supabase
      .from("test_answers")
      .select("question_id")
      .eq("session_id", sessionId)
      .eq("is_correct", false);
    let enrolled = 0;
    for (const ans of (wrongAnswers || [])) {
      try {
        await addToSRSQueue(ans.question_id);
        enrolled++;
      } catch {
        // continue enrolling others
      }
    }
    return NextResponse.json({ success: true, enrolled });
  }
  if (action === "enroll-all-mistakes") {
    const supabase = await createClient();
    // Enroll wrong answers from completed sessions directly (does not depend on
    // the spaced_repetition SELECT that is permission-revoked).
    const { data: sessions } = await supabase
      .from("test_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .eq("exam_id", exam.id)
      .or(stream ? `stream_id.eq.${stream.id},stream_id.is.null` : "stream_id.is.null")
      .order("completed_at", { ascending: false })
      .limit(30);
    const sessionIds = (sessions || []).map(s => s.id);
    let enrolled = 0;
    if (sessionIds.length > 0) {
      const { data: wrongAnswers } = await supabase
        .from("test_answers")
        .select("question_id")
        .in("session_id", sessionIds)
        .eq("is_correct", false);
      for (const ans of (wrongAnswers || [])) {
        try {
          await addToSRSQueue(ans.question_id);
          enrolled++;
        } catch {
          // continue enrolling others
        }
      }
    }
    return NextResponse.json({ success: true, enrolled });
  }
  if (!["add", "answer"].includes(action) || typeof questionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(questionId))
    return NextResponse.json({ error: "Valid action and questionId required" }, { status: 400 });
  if (action === "answer" && (!["correct", "wrong"].includes(result) || typeof reviewDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(reviewDate)))
    return NextResponse.json({ error: "Valid result and reviewDate required" }, { status: 400 });
  const supabase = await createClient();
  const { data: question, error } = await supabase.from("questions").select("id")
    .eq("id", questionId).eq("exam_id", exam.id).eq("marks_to_all", false)
    .or(stream ? `stream_id.eq.${stream.id},stream_id.is.null` : "stream_id.is.null").maybeSingle();
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
