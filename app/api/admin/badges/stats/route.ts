import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: definitions } = await supabase.from("badge_definitions").select("id, slug, name, xp_reward");
  const { data: userBadges } = await supabase.from("user_badges").select("badge_type");
  const { data: xpTransactions } = await supabase
    .from("xp_transactions")
    .select("amount, metadata")
    .or("reason.ilike.%streak milestone%,reason.ilike.%badge%");

  const earnedMap: Record<string, number> = {};
  (userBadges || []).forEach((b) => {
    earnedMap[b.badge_type] = (earnedMap[b.badge_type] || 0) + 1;
  });

  let mostEarned = { name: "None", count: 0 };
  let rarest = { name: "None", count: Infinity };
  let totalXpViaBadges = 0;

  (definitions || []).forEach((d) => {
    const count = earnedMap[d.slug] || 0;
    if (count > mostEarned.count) mostEarned = { name: d.name, count };
    if (count < rarest.count) rarest = { name: d.name, count };
  });

  (xpTransactions || []).forEach((t) => {
    totalXpViaBadges += t.amount;
  });

  if (rarest.count === Infinity) rarest = { name: "None", count: 0 };

  return NextResponse.json({ mostEarned, rarest, totalXpViaBadges });
}
