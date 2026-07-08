import { NextRequest, NextResponse } from "next/server";
import { getDeliveryService } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, title, body: notifBody, url } = await req.json();

  if (!userId || !title || !notifBody) {
    return NextResponse.json(
      { error: "userId, title, and body required" },
      { status: 400 }
    );
  }

  try {
    const delivery = getDeliveryService();
    const success = await delivery.sendPushNotification(userId, title, notifBody, url);
    if (!success) {
      return NextResponse.json({ error: "Failed to send push" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send" },
      { status: 500 }
    );
  }
}
