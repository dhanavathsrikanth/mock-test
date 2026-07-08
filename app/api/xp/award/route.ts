import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardTestXP } from "@/lib/xp";
import { checkAndAwardBadges } from "@/lib/badges";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sessionId } = body;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    const result = await awardTestXP(user.id, sessionId);

    let newBadges: { slug: string; name: string; icon_emoji: string; xp_reward: number }[] = [];
    try {
      const badgeResults = await checkAndAwardBadges(user.id);
      newBadges = badgeResults
        .filter((r) => r.awarded)
        .map((r) => ({
          slug: r.badge.slug,
          name: r.badge.name,
          icon_emoji: r.badge.icon_emoji,
          xp_reward: r.badge.xp_reward,
        }));
    } catch {
      // Badge check failure should not block XP award
    }

    return NextResponse.json({ ...result, newBadges });
  } catch (err) {
    console.error("XP award error:", err);
    return NextResponse.json({ error: "Failed to award XP" }, { status: 500 });
  }
}
