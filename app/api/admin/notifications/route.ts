import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [notifRes, subsRes] = await Promise.all([
    supabase.from("admin_notifications").select("*, profiles:profiles!sent_by(full_name)").order("created_at", { ascending: false }).limit(50),
    supabase.from("push_subscriptions").select("user_id"),
  ]);

  const notifications = (notifRes.data || []).map((n) => ({
    ...n,
    sent_by_name: n.profiles?.full_name || "Unknown",
    total_subscribers: subsRes.data?.length || 0,
  }));

  return NextResponse.json(notifications);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { title, body: notifBody, url, audience_type, audience_filter, scheduled_at } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const totalCount = await countAudience(supabase, audience_type || "all", audience_filter);

  if (scheduled_at) {
    const { data, error } = await supabase.from("admin_notifications").insert({
      title: title.trim(),
      body: notifBody?.trim() || null,
      url: url || "/daily",
      audience_type: audience_type || "all",
      audience_filter: audience_filter || {},
      status: "scheduled",
      scheduled_at,
      total_count: totalCount,
      sent_by: user.id,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase.from("admin_notifications").insert({
    title: title.trim(),
    body: notifBody?.trim() || null,
    url: url || "/daily",
    audience_type: audience_type || "all",
    audience_filter: audience_filter || {},
    status: "sending",
    total_count: totalCount,
    sent_by: user.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    const result = await sendPushToAudience(supabase, title.trim(), notifBody?.trim() || "", url || "/daily", audience_type || "all", audience_filter);
    const { error: updateError } = await supabase.from("admin_notifications").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_count: result.sent,
    }).eq("id", data.id);

    if (updateError) console.error("Failed to update notification status:", updateError);
    return NextResponse.json({ ...data, status: "sent", sent_count: result.sent, failed_count: result.failed });
  } catch (err) {
    await supabase.from("admin_notifications").update({ status: "failed" }).eq("id", data.id);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to send" }, { status: 500 });
  }
}

async function sendPushToAudience(supabase: any, title: string, body: string, url: string, audienceType: string, filter: any): Promise<{ sent: number; failed: number }> {
  const userIds = await getAudienceUserIds(supabase, audienceType, filter);
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("user_id, subscription")
    .in("user_id", userIds);

  if (!subscriptions || subscriptions.length === 0) return { sent: 0, failed: 0 };

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails("mailto:admin@tgpscprep.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "", process.env.VAPID_PRIVATE_KEY || "");

  let sent = 0;
  let failed = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub.subscription as any, JSON.stringify({ title, body, url }));
      sent++;
    } catch {
      failed++;
      await supabase.from("push_subscriptions").delete().eq("user_id", sub.user_id);
    }
  }
  return { sent, failed };
}

async function getAudienceUserIds(supabase: any, type: string, filter: any): Promise<string[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];

  switch (type) {
    case "all": {
      const { data } = await supabase.from("profiles").select("id");
      return (data || []).map((u: any) => u.id);
    }
    case "active_7d": {
      const { data } = await supabase.from("streaks").select("user_id").gte("last_activity_date", sevenDaysAgo);
      return (data || []).map((s: any) => s.user_id);
    }
    case "streak_gt_7": {
      const { data } = await supabase.from("streaks").select("user_id").gt("current_streak", 7);
      return (data || []).map((s: any) => s.user_id);
    }
    case "inactive_3d": {
      const { data } = await supabase.from("streaks").select("user_id").lt("last_activity_date", threeDaysAgo).or("last_activity_date.is.null");
      return (data || []).map((s: any) => s.user_id);
    }
    case "custom": {
      if (filter.minLevel !== undefined) {
        const { data } = await supabase.from("user_levels").select("user_id").gte("current_level", filter.minLevel);
        return (data || []).map((u: any) => u.user_id);
      }
      const { data } = await supabase.from("profiles").select("id");
      return (data || []).map((u: any) => u.id);
    }
    default: return [];
  }
}

async function countAudience(supabase: any, type: string, filter: any): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  switch (type) {
    case "all": {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count || 0;
    }
    case "active_7d": {
      const { data } = await supabase.from("streaks").select("user_id").gte("last_activity_date", sevenDaysAgo.split("T")[0]);
      return data?.length || 0;
    }
    case "streak_gt_7": {
      const { data } = await supabase.from("streaks").select("user_id").gt("current_streak", 7);
      return data?.length || 0;
    }
    case "inactive_3d": {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];
      const { data } = await supabase.from("streaks").select("user_id").lt("last_activity_date", threeDaysAgo).or("last_activity_date.is.null");
      return data?.length || 0;
    }
    case "custom": {
      let count = 0;
      if (filter.minLevel !== undefined) {
        const { data } = await supabase.from("user_levels").select("user_id").gte("current_level", filter.minLevel);
        count = data?.length || 0;
      }
      return count || 0;
    }
    default:
      return 0;
  }
}
