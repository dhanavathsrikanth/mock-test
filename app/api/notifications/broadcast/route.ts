import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNotificationService } from "@/lib/notifications";
import { NotificationType } from "@/types/notifications";
import { type AudienceType } from "@/lib/notifications/constants";

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
  const { type, title, message, link, audience } = body;

  if (!type || !title) {
    return NextResponse.json(
      { error: "Missing required fields: type, title" },
      { status: 400 }
    );
  }

  const userIds = await getAudienceUserIds(supabase, audience || "all", body.audience_filter);
  if (userIds.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const service = getNotificationService();
  const created = await service.createBulkNotifications(
    userIds,
    type as NotificationType,
    title,
    message,
    link
  );

  return NextResponse.json({ sent: created, total: userIds.length });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAudienceUserIds(supabase: any, type: AudienceType, filter?: Record<string, unknown>): Promise<string[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];

  switch (type) {
    case "all": {
      const { data } = await supabase.from("profiles").select("id");
      return (data || []).map((u: { id: string }) => u.id);
    }
    case "active_7d": {
      const { data } = await supabase
        .from("streaks")
        .select("user_id")
        .gte("last_activity_date", sevenDaysAgo);
      return (data || []).map((s: { user_id: string }) => s.user_id);
    }
    case "streak_gt_7": {
      const { data } = await supabase
        .from("streaks")
        .select("user_id")
        .gt("current_streak", 7);
      return (data || []).map((s: { user_id: string }) => s.user_id);
    }
    case "inactive_3d": {
      const { data } = await supabase
        .from("streaks")
        .select("user_id")
        .lt("last_activity_date", threeDaysAgo)
        .or("last_activity_date.is.null");
      return (data || []).map((s: { user_id: string }) => s.user_id);
    }
    case "custom": {
      if (filter?.minLevel !== undefined) {
        const { data } = await supabase
          .from("user_levels")
          .select("user_id")
          .gte("current_level", filter.minLevel);
        return (data || []).map((u: { user_id: string }) => u.user_id);
      }
      const { data } = await supabase.from("profiles").select("id");
      return (data || []).map((u: { id: string }) => u.id);
    }
    default:
      return [];
  }
}
