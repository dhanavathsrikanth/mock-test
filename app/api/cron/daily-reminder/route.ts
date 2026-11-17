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

  const { data: users } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .eq("daily_reminder", true);

  if (!users || users.length === 0) {
    return NextResponse.json({ message: "No users to notify", sent: 0 });
  }

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("user_id, subscription");

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ message: "No subscriptions", sent: 0 });
  }

  const prefUserIds = new Set(users.map((u) => u.user_id));

  const { data: allStreaks } = await supabase
    .from("streaks")
    .select("user_id, current_streak, last_activity_date");

  const streakMap = new Map(
    (allStreaks || []).map((s) => [s.user_id, s])
  );

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    if (!prefUserIds.has(sub.user_id)) continue;

    const streak = streakMap.get(sub.user_id);
    const hasPracticedToday = streak?.last_activity_date === today;

    if (hasPracticedToday) continue;

    const currentStreak = streak?.current_streak || 0;
    const body =
      currentStreak > 0
        ? `Keep your ${currentStreak}-day streak alive! Practice today's question.`
        : "Start your study streak today! Take a quick 5-minute practice.";

    try {
      await sendPushNotificationToUser(
        sub.user_id,
        "Time for Daily Practice!",
        body,
        "/dashboard"
      );
      sent++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ message: "Reminders processed", sent, failed });
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
