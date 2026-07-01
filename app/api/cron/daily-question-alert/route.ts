import { NextResponse } from "next/server";
import { createCronClient } from "@/lib/supabase/cron";
import { sendPushNotificationToUser } from "@/lib/push";

export const maxDuration = 120;

async function handleCron(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createCronClient();

  const today = new Date().toISOString().split("T")[0];

  const { data: dailyQ } = await supabase
    .from("daily_questions")
    .select("id, questions(id, option_1)")
    .eq("assigned_date", today)
    .maybeSingle();

  if (!dailyQ) {
    return NextResponse.json({ message: "No daily question for today yet" });
  }

  const { data: prefUsers } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .eq("daily_question_alert", true);

  if (!prefUsers || prefUsers.length === 0) {
    return NextResponse.json({ message: "No users opted in", sent: 0 });
  }

  const prefUserIds = new Set(prefUsers.map((u) => u.user_id));

  const { data: alreadyAnswered } = await supabase
    .from("daily_question_answers")
    .select("user_id")
    .eq("daily_question_id", dailyQ.id);

  const answeredUsers = new Set(
    (alreadyAnswered || []).map((a) => a.user_id)
  );

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("user_id, subscription");

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions || []) {
    if (!prefUserIds.has(sub.user_id)) continue;
    if (answeredUsers.has(sub.user_id)) continue;

    try {
      await sendPushNotificationToUser(
        sub.user_id,
        "Daily Question is live!",
        "Answer today's TSPSC AEE question and earn +15 XP.",
        "/daily"
      );
      sent++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ message: "Daily question alerts sent", sent, failed });
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
