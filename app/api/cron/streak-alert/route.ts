import { NextResponse } from "next/server";
import { createCronClient } from "@/lib/supabase/cron";
import { sendPushNotificationToUser } from "@/lib/push";
import { authorizedCron } from "@/lib/engagement/security";

export const maxDuration = 120;

async function handleCron(req: Request) {
  if (!authorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createCronClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: prefUsers } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .eq("streak_alert", true);

  if (!prefUsers || prefUsers.length === 0) {
    return NextResponse.json({ message: "No users opted in", sent: 0 });
  }

  const prefUserIds = new Set(prefUsers.map((u) => u.user_id));

  const { data: streaks } = await supabase
    .from("streaks")
    .select("user_id, current_streak, last_activity_date")
    .in("user_id", Array.from(prefUserIds))
    .gt("current_streak", 2);

  if (!streaks || streaks.length === 0) {
    return NextResponse.json({ message: "No streaks to protect", sent: 0 });
  }

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("user_id, subscription");

  const subMap = new Map(
    (subscriptions || []).map((s) => [s.user_id, s.subscription])
  );

  let sent = 0;
  let failed = 0;

  for (const streak of streaks) {
    if (streak.last_activity_date === today) continue;
    if (!subMap.has(streak.user_id)) continue;

    try {
      await sendPushNotificationToUser(
        streak.user_id,
        "Your Streak is in Danger! 🔥",
        `You have a ${streak.current_streak}-day streak! Answer 1 question before midnight to keep it alive.`,
        "/dashboard"
      );
      sent++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ message: "Streak alerts sent", sent, failed });
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
