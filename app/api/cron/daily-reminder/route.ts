import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: users } = await supabase
    .from("notification_preferences")
    .select("user_id, user_id_for_join")
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

  for (const sub of subscriptions) {
    if (!prefUserIds.has(sub.user_id)) continue;

    const streak = streakMap.get(sub.user_id);
    const practicedToday = streak?.last_activity_date === today;

    if (practicedToday) continue;

    const streakCount = streak?.current_streak || 0;

    try {
      await sendPushNotificationToUser(
        sub.user_id,
        "Daily practice time!",
        `Keep your ${streakCount} day streak alive. Take a test now!`,
        "/test/select"
      );
      sent++;
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ message: "Daily reminders sent", sent });
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
