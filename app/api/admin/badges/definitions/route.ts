import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: badges, error } = await supabase
    .from("badge_definitions")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: earnCounts } = await supabase
    .from("user_badges")
    .select("badge_type");

  const countMap: Record<string, number> = {};
  (earnCounts || []).forEach((b) => {
    countMap[b.badge_type] = (countMap[b.badge_type] || 0) + 1;
  });

  const result = (badges || []).map((b) => ({
    ...b,
    earned_count: countMap[b.slug] || 0,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, description, icon_emoji, condition_type, condition_value, xp_reward, slug, is_active } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("badge_definitions")
    .insert({
      name,
      description: description || "",
      icon_emoji: icon_emoji || "🏆",
      condition_type: condition_type || "streak_days",
      condition_value: condition_value || 0,
      xp_reward: xp_reward || 0,
      slug,
      is_active: is_active !== false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A badge with this slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ...data, earned_count: 0 });
}
