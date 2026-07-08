import { createClient } from "@/lib/supabase/server";
import { awardXP } from "@/lib/xp";
import { getNotificationService } from "@/lib/notifications";
import { NotificationEventType } from "@/types/notifications";

interface BadgeDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_emoji: string;
  condition_type: string;
  condition_value: number;
  xp_reward: number;
  is_active: boolean;
}

interface BadgeCheckResult {
  badge: BadgeDefinition;
  awarded: boolean;
  alreadyHad: boolean;
}

const MIN_QUESTIONS_PER_SUBJECT = 5;

export async function checkAndAwardBadges(userId: string): Promise<BadgeCheckResult[]> {
  const supabase = await createClient();

  const { data: activeBadges } = await supabase
    .from("badge_definitions")
    .select("*")
    .eq("is_active", true);

  if (!activeBadges || activeBadges.length === 0) return [];

  const { data: earnedBadges } = await supabase
    .from("user_badges")
    .select("badge_type")
    .eq("user_id", userId);

  const earnedSlugs = new Set((earnedBadges || []).map((b) => b.badge_type));

  const results: BadgeCheckResult[] = [];

  for (const badge of activeBadges) {
    if (earnedSlugs.has(badge.slug)) {
      results.push({ badge, awarded: false, alreadyHad: true });
      continue;
    }

    const meetsCondition = await evaluateCondition(
      supabase,
      userId,
      badge.condition_type,
      badge.condition_value
    );

    if (meetsCondition) {
      await awardBadge(supabase, userId, badge);
      results.push({ badge, awarded: true, alreadyHad: false });
    } else {
      results.push({ badge, awarded: false, alreadyHad: false });
    }
  }

  return results;
}

async function evaluateCondition(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  conditionType: string,
  conditionValue: number
): Promise<boolean> {
  switch (conditionType) {
    case "streak_days":
      return checkStreakDays(supabase, userId, conditionValue);
    case "questions_correct":
      return checkQuestionsCorrect(supabase, userId, conditionValue);
    case "tests_completed":
      return checkTestsCompleted(supabase, userId, conditionValue);
    case "daily_questions":
      return checkDailyQuestions(supabase, userId, conditionValue);
    case "perfect_scores":
      return checkPerfectScores(supabase, userId, conditionValue);
    case "all_subjects_mastered":
      return checkAllSubjectsMastered(supabase, userId, conditionValue);
    default:
      return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkStreakDays(supabase: any, userId: string, requiredDays: number): Promise<boolean> {
  const { data: streak } = await supabase
    .from("streaks")
    .select("longest_streak")
    .eq("user_id", userId)
    .maybeSingle();

  return (streak?.longest_streak || 0) >= requiredDays;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkQuestionsCorrect(supabase: any, userId: string, requiredCorrect: number): Promise<boolean> {
  const { count } = await supabase
    .from("test_answers")
    .select("*", { count: "exact", head: true })
    .eq("is_correct", true)
    .in(
      "session_id",
      (
        await supabase
          .from("test_sessions")
          .select("id")
          .eq("user_id", userId)
      ).data?.map((s: { id: string }) => s.id) || []
    );

  return (count || 0) >= requiredCorrect;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkTestsCompleted(supabase: any, userId: string, requiredTests: number): Promise<boolean> {
  const { count } = await supabase
    .from("test_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed");

  return (count || 0) >= requiredTests;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkDailyQuestions(supabase: any, userId: string, requiredAnswers: number): Promise<boolean> {
  const { count } = await supabase
    .from("daily_question_answers")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  return (count || 0) >= requiredAnswers;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkPerfectScores(supabase: any, userId: string, requiredPerfect: number): Promise<boolean> {
  const { data: sessions } = await supabase
    .from("test_sessions")
    .select("id, total_questions")
    .eq("user_id", userId)
    .eq("status", "completed");

  if (!sessions || sessions.length === 0) return false;

  let perfectCount = 0;

  for (const session of sessions) {
    const { count: correctCount } = await supabase
      .from("test_answers")
      .select("*", { count: "exact", head: true })
      .eq("session_id", session.id)
      .eq("is_correct", true);

    if ((correctCount || 0) === session.total_questions && session.total_questions > 0) {
      perfectCount++;
    }
  }

  return perfectCount >= requiredPerfect;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkAllSubjectsMastered(supabase: any, userId: string, requiredAccuracy: number): Promise<boolean> {
  const { data: allSubjects } = await supabase
    .from("subjects")
    .select("id");

  if (!allSubjects || allSubjects.length === 0) return false;

  const { data: sessions } = await supabase
    .from("test_sessions")
    .select("id, subject_id")
    .eq("user_id", userId)
    .eq("status", "completed");

  if (!sessions || sessions.length === 0) return false;

  const sessionIds = sessions.map((s: { id: string }) => s.id);

  if (sessionIds.length === 0) return false;

  const { data: answers } = await supabase
    .from("test_answers")
    .select("session_id, is_correct, questions(subject_id)")
    .in("session_id", sessionIds);

  if (!answers || answers.length === 0) return false;

  const subjectStats: Record<string, { correct: number; total: number }> = {};

  for (const answer of answers) {
    const subjectId = answer.questions?.subject_id;
    if (!subjectId) continue;

    if (!subjectStats[subjectId]) {
      subjectStats[subjectId] = { correct: 0, total: 0 };
    }
    subjectStats[subjectId].total++;
    if (answer.is_correct === true) {
      subjectStats[subjectId].correct++;
    }
  }

  for (const subject of allSubjects) {
    const stats = subjectStats[subject.id];
    if (!stats || stats.total < MIN_QUESTIONS_PER_SUBJECT) {
      return false;
    }
    const accuracy = (stats.correct / stats.total) * 100;
    if (accuracy < requiredAccuracy) {
      return false;
    }
  }

  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function awardBadge(supabase: any, userId: string, badge: BadgeDefinition): Promise<void> {
  await supabase.from("user_badges").insert({
    user_id: userId,
    badge_type: badge.slug,
    unlocked_at: new Date().toISOString(),
  });

  if (badge.xp_reward > 0) {
    await awardXP(userId, badge.xp_reward, `Badge earned: ${badge.name}`, {
      badge_id: badge.id,
      badge_slug: badge.slug,
      badge_name: badge.name,
    });
  }

  try {
    const notificationService = getNotificationService();
    await notificationService.processEvent({
      event_type: NotificationEventType.AchievementUnlocked,
      user_id: userId,
      payload: {
        badge_id: badge.id,
        badge_name: badge.name,
        badge_slug: badge.slug,
        badge_icon: badge.icon_emoji,
        description: badge.description,
        xp_reward: badge.xp_reward,
      },
    });
  } catch {
    // Notification failure should not block badge awarding
  }
}
