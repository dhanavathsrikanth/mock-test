import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { audience_type, audience_filter } = body;

  let count = 0;

  switch (audience_type) {
    case "all": {
      const { count: c } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      count = c || 0;
      break;
    }
    case "active_7d": {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const { data } = await supabase.from("streaks").select("user_id").gte("last_activity_date", sevenDaysAgo);
      count = data?.length || 0;
      break;
    }
    case "streak_gt_7": {
      const { data } = await supabase.from("streaks").select("user_id").gt("current_streak", 7);
      count = data?.length || 0;
      break;
    }
    case "inactive_3d": {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];
      const { data } = await supabase.from("streaks").select("user_id").lt("last_activity_date", threeDaysAgo).or("last_activity_date.is.null");
      count = data?.length || 0;
      break;
    }
    case "custom": {
      if (audience_filter?.minLevel !== undefined) {
        const { data } = await supabase.from("user_levels").select("user_id").gte("current_level", audience_filter.minLevel);
        count = data?.length || 0;
      }
      break;
    }
  }

  return NextResponse.json({ count });
}
