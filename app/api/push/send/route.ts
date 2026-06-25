import { NextRequest, NextResponse } from "next/server";
import { sendPushNotificationToUser } from "@/lib/push";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, title, body, url } = await req.json();

  if (!userId || !title || !body) {
    return NextResponse.json(
      { error: "userId, title, and body required" },
      { status: 400 }
    );
  }

  try {
    await sendPushNotificationToUser(userId, title, body, url);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send" },
      { status: 500 }
    );
  }
}
