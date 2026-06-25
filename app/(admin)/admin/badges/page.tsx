import { createClient } from "@/lib/supabase/server";
import { BadgesClient } from "./badges-client";

export default async function BadgesPage() {
  const supabase = await createClient();

  const [badgeDefsRes, levelThresholdsRes, xpRulesRes] = await Promise.all([
    supabase.from("badge_definitions").select("*").order("created_at", { ascending: true }),
    supabase.from("level_thresholds").select("*").order("level", { ascending: true }),
    supabase.from("xp_rules").select("*").order("label", { ascending: true }),
  ]);

  const { data: userBadges } = await supabase.from("user_badges").select("badge_type");

  const countMap: Record<string, number> = {};
  (userBadges || []).forEach((b) => {
    countMap[b.badge_type] = (countMap[b.badge_type] || 0) + 1;
  });

  const definitions = (badgeDefsRes.data || []).map((d) => ({
    ...d,
    earned_count: countMap[d.slug] || 0,
  }));

  return (
    <BadgesClient
      initialBadges={definitions}
      initialThresholds={levelThresholdsRes.data || []}
      initialXpRules={xpRulesRes.data || []}
    />
  );
}
