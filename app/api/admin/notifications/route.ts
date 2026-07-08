import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNotificationService, getDeliveryService } from "@/lib/notifications";
import { NOTIFICATION_BATCH_SIZE } from "@/lib/notifications/constants";
import { AUDIENCE_TYPES, type AudienceType } from "@/lib/notifications/constants";
import { NotificationType, NotificationPriority } from "@/types/notifications";

export async function GET() {
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

  const [notifRes, subsRes] = await Promise.all([
    supabase
      .from("admin_notifications")
      .select("*, profiles:profiles!sent_by(full_name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("push_subscriptions").select("user_id"),
  ]);

  const notifications = (notifRes.data || []).map((n: any) => ({
    ...n,
    sent_by_name: n.profiles?.full_name || "Unknown",
    total_subscribers: subsRes.data?.length || 0,
  }));

  return NextResponse.json(notifications);
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
  const {
    title,
    body: notifBody,
    url,
    type,
    audience_type,
    audience_filter,
    scheduled_at,
    push_enabled,
  } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const userIds = await getAudienceUserIds(supabase, audience_type || "all", audience_filter);

  if (scheduled_at) {
    const { data, error } = await supabase
      .from("admin_notifications")
      .insert({
        title: title.trim(),
        body: notifBody?.trim() || null,
        url: url || "/dashboard",
        audience_type: audience_type || "all",
        audience_filter: audience_filter || {},
        status: "scheduled",
        scheduled_at,
        total_count: userIds.length,
        sent_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("admin_notifications")
    .insert({
      title: title.trim(),
      body: notifBody?.trim() || null,
      url: url || "/dashboard",
      audience_type: audience_type || "all",
      audience_filter: audience_filter || {},
      status: "sending",
      total_count: userIds.length,
      sent_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    let pushResult = { sent: 0, failed: 0 };

    if (push_enabled) {
      const delivery = getDeliveryService();
      pushResult = await delivery.sendBulkPush(
        userIds,
        title.trim(),
        notifBody?.trim() || "",
        url || "/dashboard"
      );
    }

    const service = getNotificationService();
    const created = await service.createBulkNotifications(
      userIds,
      (type as NotificationType) || NotificationType.Announcement,
      title.trim(),
      notifBody?.trim() || undefined,
      url || "/dashboard"
    );

    await supabase
      .from("admin_notifications")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_count: created,
      })
      .eq("id", data.id);

    return NextResponse.json({
      ...data,
      status: "sent",
      sent_count: created,
      push_sent: pushResult.sent,
      push_failed: pushResult.failed,
    });
  } catch (err) {
    await supabase.from("admin_notifications").update({ status: "failed" }).eq("id", data.id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send" },
      { status: 500 }
    );
  }
}

async function getAudienceUserIds(
  supabase: any,
  type: AudienceType,
  filter?: any
): Promise<string[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];

  switch (type) {
    case "all": {
      const { data } = await supabase.from("profiles").select("id");
      return (data || []).map((u: any) => u.id);
    }
    case "active_7d": {
      const { data } = await supabase
        .from("streaks")
        .select("user_id")
        .gte("last_activity_date", sevenDaysAgo);
      return (data || []).map((s: any) => s.user_id);
    }
    case "streak_gt_7": {
      const { data } = await supabase
        .from("streaks")
        .select("user_id")
        .gt("current_streak", 7);
      return (data || []).map((s: any) => s.user_id);
    }
    case "inactive_3d": {
      const { data } = await supabase
        .from("streaks")
        .select("user_id")
        .lt("last_activity_date", threeDaysAgo)
        .or("last_activity_date.is.null");
      return (data || []).map((s: any) => s.user_id);
    }
    case "custom": {
      if (filter?.minLevel !== undefined) {
        const { data } = await supabase
          .from("user_levels")
          .select("user_id")
          .gte("current_level", filter.minLevel);
        return (data || []).map((u: any) => u.user_id);
      }
      const { data } = await supabase.from("profiles").select("id");
      return (data || []).map((u: any) => u.id);
    }
    default:
      return [];
  }
}
