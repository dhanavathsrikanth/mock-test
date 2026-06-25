import { createClient } from "@/lib/supabase/server";
import { awardXP, XP_REWARDS } from "@/lib/xp";

export interface StreakRecord {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  freeze_tokens: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  freezeTokens: number;
  lastActivityDate: string | null;
  practicedToday: boolean;
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export async function updateStreak(userId: string): Promise<StreakRecord> {
  const supabase = await createClient();

  const today = getTodayDate();

  const { data: existing, error: fetchError } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  let streak: StreakRecord;
  let isNew = false;

  if (!existing) {
    streak = {
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      freeze_tokens: 1,
      last_activity_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    isNew = true;
  } else {
    streak = existing;
  }

  if (streak.last_activity_date === today) {
    return streak;
  }

  let newStreak = streak.current_streak;
  let newFreezeTokens = streak.freeze_tokens;
  let milestoneAwarded: "Week Warrior" | "Iron Will" | null = null;

  if (streak.last_activity_date === getYesterdayDate()) {
    newStreak = streak.current_streak + 1;
  } else if (streak.last_activity_date && streak.last_activity_date < today) {
    if (newFreezeTokens > 0) {
      newFreezeTokens -= 1;
    } else {
      newStreak = 1;
    }
  }

  const newLongest = Math.max(newStreak, streak.longest_streak);

  if (newStreak === 7) {
    milestoneAwarded = "Week Warrior";
  } else if (newStreak === 30) {
    milestoneAwarded = "Iron Will";
  }

  let result: StreakRecord;

  if (isNew) {
    const { data: inserted, error: insertError } = await supabase
      .from("streaks")
      .insert({
        user_id: userId,
        current_streak: newStreak,
        longest_streak: newLongest,
        freeze_tokens: newFreezeTokens,
        last_activity_date: today,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;
    result = inserted as StreakRecord;
  } else {
    const { data: updated, error: updateError } = await supabase
      .from("streaks")
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        freeze_tokens: newFreezeTokens,
        last_activity_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) throw updateError;
    result = updated as StreakRecord;
  }

  if (milestoneAwarded) {
    await awardMilestone(userId, milestoneAwarded, newStreak);
  }

  return result;
}

export async function getStreakStatus(userId: string): Promise<StreakStatus> {
  const supabase = await createClient();

  const { data: streak, error } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  const today = getTodayDate();

  if (!streak) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      freezeTokens: 1,
      lastActivityDate: null,
      practicedToday: false,
    };
  }

  return {
    currentStreak: streak.current_streak,
    longestStreak: streak.longest_streak,
    freezeTokens: streak.freeze_tokens,
    lastActivityDate: streak.last_activity_date,
    practicedToday: streak.last_activity_date === today,
  };
}

export async function checkAndAwardStreakBadges(
  userId: string,
  streak: number
): Promise<void> {
  const supabase = await createClient();

  let badgeType: "Week Warrior" | "Iron Will" | null = null;

  if (streak === 7) {
    badgeType = "Week Warrior";
  } else if (streak === 30) {
    badgeType = "Iron Will";
  }

  if (!badgeType) return;

  const { data: existing } = await supabase
    .from("user_badges")
    .select("id")
    .eq("user_id", userId)
    .eq("badge_type", badgeType.toLowerCase())
    .maybeSingle();

  if (existing) return;

  await supabase.from("user_badges").insert({
    user_id: userId,
    badge_type: badgeType.toLowerCase(),
    unlocked_at: new Date().toISOString(),
    streak_at_unlock: streak,
  });

  const xpAmount =
    badgeType === "Week Warrior"
      ? XP_REWARDS.WEEK_WARRIOR_STREAK
      : XP_REWARDS.IRON_WILL_STREAK;

  await awardXP(
    userId,
    xpAmount,
    `${streak}-day streak milestone: ${badgeType}`,
    { badge_type: badgeType.toLowerCase(), streak_at_unlock: streak }
  );
}

async function awardMilestone(
  userId: string,
  milestone: "Week Warrior" | "Iron Will",
  streak: number
): Promise<void> {
  await checkAndAwardStreakBadges(userId, streak);
}
