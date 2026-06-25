import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushNotificationToUser } from "@/lib/push";

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userIds, title, body } = await req.json();
  if (!Array.isArray(userIds) || userIds.length === 0 || !title) {
    return NextResponse.json({ error: "userIds array and title are required" }, { status: 400 });
  }

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    userIds.map((uid: string) =>
      sendPushNotificationToUser(uid, title, body || "", "/daily")
        .then(() => { sent++; })
        .catch(() => { failed++; })
    )
  );

  return NextResponse.json({ success: true, sent, failed });
}
