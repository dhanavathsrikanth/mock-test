import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNotificationService } from "@/lib/notifications";
import {
  NotificationType,
  NotificationPriority,
} from "@/types/notifications";
import { NOTIFICATION_PAGE_SIZE } from "@/lib/notifications/constants";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId");

  if (targetUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    parseInt(searchParams.get("limit") || String(NOTIFICATION_PAGE_SIZE), 10),
    50
  );
  const type = searchParams.get("type") as NotificationType | null;
  const isRead = searchParams.get("is_read");
  const search = searchParams.get("search");
  const priority = searchParams.get("priority") as NotificationPriority | null;
  const groupKey = searchParams.get("group_key");

  const service = getNotificationService();
  const result = await service.getUserNotifications(targetUserId || user.id, {
    page,
    limit,
    filters: {
      ...(type && { type }),
      ...(isRead !== null && isRead !== undefined && { is_read: isRead === "true" }),
      ...(search && { search }),
      ...(priority && { priority }),
      ...(groupKey && { group_key: groupKey }),
    },
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, type, title, message, link, deep_link_url, priority, group_key, metadata, expires_at } =
    body;

  if (!userId || !type || !title) {
    return NextResponse.json(
      { error: "Missing required fields: userId, type, title" },
      { status: 400 }
    );
  }

  const validTypes = Object.values(NotificationType);
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
  }

  const service = getNotificationService();
  const notification = await service.createNotification({
    user_id: userId,
    type,
    title,
    message,
    link,
    deep_link_url,
    priority: priority || NotificationPriority.Normal,
    group_key,
    metadata,
    expires_at,
  });

  if (!notification) {
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }

  return NextResponse.json({ notification }, { status: 201 });
}
