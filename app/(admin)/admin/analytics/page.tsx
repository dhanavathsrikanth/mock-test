import { createClient } from "@/lib/supabase/server";
import { AnalyticsClient } from "./analytics-client";

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().split("T")[0];
}

function dateKey(d: string): string {
  return d.slice(0, 10);
}

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const thirtyDaysAgo = daysAgo(30);

  const [
    profilesRes,
    streaksRes,
    sessionsRes,
    answersRes,
    bookmarksRes,
    xpRes,
    levelsRes,
    badgesRes,
    dailyAnsRes,
    srsRes,
    questionsRes,
    reportsRes,
    correctionsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id, created_at"),
    supabase.from("streaks").select("user_id, current_streak, last_activity_date"),
    supabase.from("test_sessions").select("user_id, total_questions, subject_id, year, mode, started_at, completed_at, status, duration_minutes, subjects!inner(name)").gte("started_at", thirtyDaysAgo).limit(5000),
    supabase.from("test_answers").select("question_id, is_correct, selected_option, questions(question_text, subject_id, subjects(name))").limit(10000),
    supabase.from("bookmarks").select("question_id, questions(question_text, subjects(name))"),
    supabase.from("xp_transactions").select("amount, created_at").gte("created_at", thirtyDaysAgo).limit(5000),
    supabase.from("user_levels").select("user_id, total_xp, profiles(full_name)").order("total_xp", { ascending: false }).limit(10),
    supabase.from("user_badges").select("badge_type, user_id"),
    supabase.from("daily_question_answers").select("user_id, is_correct, selected_option, created_at, daily_questions(question_id)").gte("created_at", thirtyDaysAgo).limit(5000),
    supabase.from("spaced_repetition").select("question_id, last_reviewed_at").gte("last_reviewed_at", thirtyDaysAgo).limit(5000),
    supabase.from("questions").select("id, explanation"),
    supabase.from("question_reports").select("status, created_at, resolved_at").limit(2000),
    supabase.from("question_corrections").select("field_changed, created_at, questions!inner(subject_id, subjects!inner(name))").limit(5000),
  ]);

  const profiles = profilesRes.data || [];
  const streaks = streaksRes.data || [];
  const sessions = sessionsRes.data || [];
  const answers = answersRes.data || [];
  const bookmarks = bookmarksRes.data || [];
  const xps = xpRes.data || [];
  const levels = levelsRes.data || [];
  const badges = badgesRes.data || [];
  const dailyAnswers = dailyAnsRes.data || [];
  const srsRecords = srsRes.data || [];
  const questions = questionsRes.data || [];
  const reports = reportsRes.data || [];
  const corrections = correctionsRes.data || [];

  // ─── Section 1: User Growth (Advanced) ───
  const today = daysAgo(0);
  const todayDate = today;
  const weekAgo = daysAgo(7);
  const monthAgo = daysAgo(30);
  const fourWeeksAgo = daysAgo(28);

  // Signups
  const signupsByDay: Record<string, number> = {};
  const signupsByDOW = Array(7).fill(0);
  let newThisWeek = 0;
  let newThisMonth = 0;
  profiles.forEach((p: any) => {
    if (p.created_at) {
      const d = dateKey(p.created_at);
      if (d >= thirtyDaysAgo) {
        signupsByDay[d] = (signupsByDay[d] || 0) + 1;
        const dow = new Date(p.created_at).getDay();
        if (dow >= 0 && dow <= 6) signupsByDOW[dow]++;
      }
      if (d >= weekAgo) newThisWeek++;
      if (d >= monthAgo) newThisMonth++;
    }
  });
  const signupTimeline = Array.from({ length: 30 }, (_, i) => {
    const d = daysAgo(29 - i);
    return { date: d, signups: signupsByDay[d] || 0 };
  });

  // Cumulative signups
  let runningTotal = 0;
  const cumulativeSignups = signupTimeline.map((d) => {
    runningTotal += d.signups;
    return { date: d.date, total: runningTotal };
  });

  // Weekly signup aggregation
  const signupsByWeek: Record<string, number> = {};
  for (let w = 0; w < 4; w++) {
    let sum = 0;
    for (let day = 0; day < 7; day++) {
      const d = daysAgo(27 - w * 7 + day);
      sum += signupsByDay[d] || 0;
    }
    signupsByWeek[`Week ${w + 1}`] = sum;
  }
  const signupWeekTimeline = Object.entries(signupsByWeek).map(([name, count]) => ({ name, count }));

  // ─── Activity: derive from streaks, sessions, and answers combined ───
  // Build activity maps from multiple sources for accurate user activity tracking
  const activityByUser: Record<string, { lastDate: string; dates: Set<string> }> = {};

  function recordActivity(userId: string, dateStr: string) {
    if (!userId || !dateStr) return;
    const d = dateStr.slice(0, 10);
    if (!activityByUser[userId]) activityByUser[userId] = { lastDate: d, dates: new Set() };
    activityByUser[userId].dates.add(d);
    if (d > activityByUser[userId].lastDate) activityByUser[userId].lastDate = d;
  }

  // Source 1: streaks
  streaks.forEach((s: any) => {
    if (s.user_id && s.last_activity_date) recordActivity(s.user_id, s.last_activity_date);
  });

  // Source 2: test_sessions (started_at or completed_at)
  sessions.forEach((s: any) => {
    if (s.user_id) {
      if (s.completed_at) recordActivity(s.user_id, s.completed_at);
      else if (s.started_at) recordActivity(s.user_id, s.started_at);
    }
  });

  // Source 3: daily_question_answers
  dailyAnswers.forEach((a: any) => {
    if (a.user_id && a.created_at) recordActivity(a.user_id, a.created_at);
  });

  // Source 4: xp_transactions
  xps.forEach((x: any) => {
    if (x.user_id && x.created_at) recordActivity(x.user_id, x.created_at);
  });

  // Now compute activity metrics from the combined data
  let activeToday = 0;
  let activeWeek = 0;
  let activeMonth = 0;
  let churned = 0;
  let totalStreak = 0;
  let streakCount = 0;
  const streakBuckets = { zero: 0, oneToThree: 0, fourToSeven: 0, eightToFourteen: 0, fifteenPlus: 0 };

  const totalUsers = profiles.length;

  // Activity counts from combined sources
  Object.values(activityByUser).forEach((a) => {
    const ld = a.lastDate;
    if (ld === todayDate) activeToday++;
    if (ld >= weekAgo) activeWeek++;
    if (ld >= monthAgo) activeMonth++;
  });

  // Streak stats from streaks table
  streaks.forEach((s: any) => {
    const streak = s.current_streak || 0;
    totalStreak += streak;
    streakCount++;
    if (streak === 0) streakBuckets.zero++;
    else if (streak <= 3) streakBuckets.oneToThree++;
    else if (streak <= 7) streakBuckets.fourToSeven++;
    else if (streak <= 14) streakBuckets.eightToFourteen++;
    else streakBuckets.fifteenPlus++;
  });

  // Fill streak bucket for users without streak records
  const usersWithStreak = new Set(streaks.map((s: any) => s.user_id));
  profiles.forEach((p: any) => {
    if (!usersWithStreak.has(p.id)) streakBuckets.zero++;
  });

  const avgStreak = streakCount > 0 ? Math.round((totalStreak / streakCount) * 10) / 10 : 0;
  const usersWithActivity = Object.keys(activityByUser).length;
  churned = totalUsers - activeMonth;

  // Retention: users who joined 28+ days ago still active in last 7 days
  const week1Users = profiles.filter((p: any) => p.created_at && p.created_at.slice(0, 10) <= fourWeeksAgo);
  const week1ActiveUserIds = new Set(
    Object.entries(activityByUser)
      .filter(([, a]) => a.lastDate >= weekAgo)
      .map(([uid]) => uid)
  );
  const retentionRate = week1Users.length > 0
    ? Math.round(([...week1Users].filter((u: any) => week1ActiveUserIds.has(u.id)).length / week1Users.length) * 100)
    : 0;

  // ─── Section 2: Test Activity (Advanced) ───
  const testsByDay: Record<string, number> = {};
  const testsByWeek: Record<string, number> = {};
  let totalQuestionsInTests = 0;
  let totalDurationMinutes = 0;
  const subjectCounts: Record<string, number> = {};
  const yearCounts: Record<string, number> = {};
  const modeCounts: Record<string, number> = {};
  const hourDayMatrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const dayOfWeekTotals = Array(7).fill(0);
  let completedTests = 0;
  let totalStarted = 0;
  let abandonedCount = 0;

  sessions.forEach((s: any) => {
    if (s.status === "completed" && s.completed_at) {
      const d = dateKey(s.completed_at);
      testsByDay[d] = (testsByDay[d] || 0) + 1;
      totalQuestionsInTests += s.total_questions || 0;
      totalDurationMinutes += s.duration_minutes || 0;
      completedTests++;

      const started = new Date(s.started_at);
      const hour = started.getHours();
      const dow = started.getDay();
      if (dow >= 0 && dow <= 6 && hour >= 0 && hour <= 23) {
        hourDayMatrix[dow][hour]++;
        dayOfWeekTotals[dow]++;
      }
    }

    if (s.status === "in_progress") totalStarted++;
    if (s.status === "completed") totalStarted++;
    if (s.status === "abandoned") abandonedCount++;

    if (s.subjects?.name) subjectCounts[s.subjects.name] = (subjectCounts[s.subjects.name] || 0) + 1;
    if (s.year) yearCounts[String(s.year)] = (yearCounts[String(s.year)] || 0) + 1;
    if (s.mode) modeCounts[s.mode] = (modeCounts[s.mode] || 0) + 1;
  });

  const testsTimeline = Array.from({ length: 30 }, (_, i) => {
    const d = daysAgo(29 - i);
    return { date: d, tests: testsByDay[d] || 0 };
  });

  // Weekly trend
  for (let w = 0; w < 4; w++) {
    let sum = 0;
    for (let day = 0; day < 7; day++) {
      const d = daysAgo(27 - w * 7 + day);
      sum += testsByDay[d] || 0;
    }
    testsByWeek[`Week ${w + 1}`] = sum;
  }

  const avgQuestionsPerTest = completedTests > 0 ? Math.round(totalQuestionsInTests / completedTests) : 0;
  const avgDuration = completedTests > 0 ? Math.round(totalDurationMinutes / completedTests) : 0;
  const totalSessions = completedTests + abandonedCount;
  const completionRate = totalSessions > 0 ? Math.round((completedTests / totalSessions) * 100) : 0;
  const abandonmentRate = totalSessions > 0 ? Math.round((abandonedCount / totalSessions) * 100) : 0;

  const mostPopularSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
  const mostPopularYear = Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
  const mostPopularMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const subjectDistribution = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
  const modeDistribution = Object.entries(modeCounts).map(([name, count]) => ({ name: name.replace(/_/g, " "), count })).sort((a, b) => b.count - a.count);
  const weekTimeline = Object.entries(testsByWeek).map(([name, count]) => ({ name, count }));

  // ─── Section 3: Question Analytics ───
  const accuracyByQ: Record<string, { correct: number; total: number; text: string; subject: string }> = {};
  const skippedByQ: Record<string, number> = {};
  const bookmarkedSet = new Set(bookmarks.map((b: any) => b.question_id));

  answers.forEach((a: any) => {
    const qId = a.question_id;
    if (!accuracyByQ[qId]) {
      const qData = a.questions || {};
      accuracyByQ[qId] = { correct: 0, total: 0, text: qData.question_text || "", subject: qData.subjects?.name || "" };
    }
    accuracyByQ[qId].total++;
    if (a.is_correct === true) accuracyByQ[qId].correct++;
    if (a.selected_option === null || a.selected_option === undefined) {
      skippedByQ[qId] = (skippedByQ[qId] || 0) + 1;
    }
  });

  // Also include daily question answers in accuracy data
  dailyAnswers.forEach((a: any) => {
    const qId = a.daily_questions?.question_id;
    if (!qId) return;
    if (!accuracyByQ[qId]) {
      accuracyByQ[qId] = { correct: 0, total: 0, text: "", subject: "" };
    }
    accuracyByQ[qId].total++;
    if (a.is_correct === true) accuracyByQ[qId].correct++;
  });

  const qAccuracies = Object.entries(accuracyByQ).map(([id, d]) => ({
    id,
    text: d.text,
    subject: d.subject,
    accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
    attempts: d.total,
  }));

  const hardestQs = qAccuracies.filter((q) => q.attempts >= 2).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
  const easiestQs = qAccuracies.filter((q) => q.attempts >= 2).sort((a, b) => b.accuracy - a.accuracy).slice(0, 5);
  const mostSkipped = Object.entries(skippedByQ).map(([id, count]) => ({
    id,
    count,
    text: accuracyByQ[id]?.text || "",
    subject: accuracyByQ[id]?.subject || "",
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  // Most bookmarked
  const bookmarkCounts: Record<string, { count: number; text: string; subject: string }> = {};
  bookmarks.forEach((b: any) => {
    if (!bookmarkCounts[b.question_id]) {
      bookmarkCounts[b.question_id] = { count: 0, text: b.questions?.question_text || "", subject: b.questions?.subjects?.name || "" };
    }
    bookmarkCounts[b.question_id].count++;
  });
  const mostBookmarked = Object.entries(bookmarkCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([id, d]) => ({ id, count: d.count, text: d.text, subject: d.subject }));

  // Questions with no attempts (dead content)
  const answeredIds = new Set(Object.keys(accuracyByQ));
  dailyAnswers.forEach((a: any) => a.daily_questions?.question_id && answeredIds.add(a.daily_questions.question_id));
  srsRecords.forEach((a: any) => a.question_id && answeredIds.add(a.question_id));
  const deadContent = questions.filter((q: any) => !answeredIds.has(q.id)).length;

  // Subject-wise accuracy (from test answers)
  const subjectAccuracy: Record<string, { correct: number; total: number }> = {};
  answers.forEach((a: any) => {
    const subj = a.questions?.subjects?.name || "Unknown";
    if (!subjectAccuracy[subj]) subjectAccuracy[subj] = { correct: 0, total: 0 };
    subjectAccuracy[subj].total++;
    if (a.is_correct === true) subjectAccuracy[subj].correct++;
  });
  // Include daily question answers in subject accuracy (grouped as "Daily Questions" if subject unknown)
  dailyAnswers.forEach((a: any) => {
    if (!a.daily_questions?.question_id) return;
    const subj = "Daily Questions";
    if (!subjectAccuracy[subj]) subjectAccuracy[subj] = { correct: 0, total: 0 };
    subjectAccuracy[subj].total++;
    if (a.is_correct === true) subjectAccuracy[subj].correct++;
  });
  const subjectAccuracyTable = Object.entries(subjectAccuracy).map(([name, d]) => ({
    name,
    accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
    attempts: d.total,
  })).sort((a, b) => b.attempts - a.attempts);

  // Expanded question analytics metrics (include daily question answers)
  const totalDailyCount = dailyAnswers.filter((a: any) => a.daily_questions?.question_id).length;
  const totalDailyCorrect = dailyAnswers.filter((a: any) => a.is_correct === true && a.daily_questions?.question_id).length;
  const totalAnswers = answers.length + totalDailyCount;
  const uniqueQuestionsAnswered = Object.keys(accuracyByQ).length;
  const totalCorrectQ = answers.filter((a: any) => a.is_correct === true).length + totalDailyCorrect;
  const totalSkippedCount = Object.values(skippedByQ).reduce((s: number, c: number) => s + c, 0);
  const totalWrongQ = totalAnswers - totalCorrectQ - totalSkippedCount;
  const globalAccuracy = totalAnswers > 0 ? Math.round((totalCorrectQ / totalAnswers) * 100) : 0;
  const totalQuestionsCount = questions.length;
  const questionsWithExplanation = questions.filter((q: any) => q.explanation).length;
  const explanationCoverage = totalQuestionsCount > 0 ? Math.round((questionsWithExplanation / totalQuestionsCount) * 100) : 0;
  const avgAttemptsPerQ = uniqueQuestionsAnswered > 0 ? Math.round((totalAnswers / uniqueQuestionsAnswered) * 10) / 10 : 0;
  const totalBookmarkedUnique = bookmarkedSet.size;

  // Difficulty distribution
  const difficultyBuckets = { zeroToTwenty: 0, twentyToForty: 0, fortyToSixty: 0, sixtyToEighty: 0, eightyToHundred: 0 };
  Object.entries(accuracyByQ).forEach(([, d]) => {
    const acc = d.total > 0 ? (d.correct / d.total) * 100 : 0;
    if (acc < 20) difficultyBuckets.zeroToTwenty++;
    else if (acc < 40) difficultyBuckets.twentyToForty++;
    else if (acc < 60) difficultyBuckets.fortyToSixty++;
    else if (acc < 80) difficultyBuckets.sixtyToEighty++;
    else difficultyBuckets.eightyToHundred++;
  });

  // ─── Section 4: Engagement ───
  const xpByDay: Record<string, number> = {};
  xps.forEach((x: any) => {
    if (x.created_at) {
      const d = dateKey(x.created_at);
      xpByDay[d] = (xpByDay[d] || 0) + x.amount;
    }
  });
  const xpTimeline = Array.from({ length: 30 }, (_, i) => {
    const d = daysAgo(29 - i);
    return { date: d, xp: xpByDay[d] || 0 };
  });

  const totalXPEarned30d = xps.reduce((sum: number, x: any) => sum + (x.amount || 0), 0);
  const dailyQTotal = dailyAnswers.length;
  const dailyQAvg = Math.round(dailyQTotal / 30);
  const srsTotal = srsRecords.length;
  const srsAvg = Math.round(srsTotal / 30);

  // XP per day of week
  const xpByDOW = Array(7).fill(0);
  xps.forEach((x: any) => {
    if (x.created_at) {
      const dow = new Date(x.created_at).getDay();
      if (dow >= 0 && dow <= 6) xpByDOW[dow] += x.amount || 0;
    }
  });

  // Daily questions / SRS timelines
  const dqByDay: Record<string, number> = {};
  dailyAnswers.forEach((a: any) => {
    if (a.created_at) {
      const d = dateKey(a.created_at);
      if (d >= thirtyDaysAgo) dqByDay[d] = (dqByDay[d] || 0) + 1;
    }
  });
  const dailyQTimeline = Array.from({ length: 30 }, (_, i) => {
    const d = daysAgo(29 - i);
    return { date: d, count: dqByDay[d] || 0 };
  });

  const srsByDay: Record<string, number> = {};
  srsRecords.forEach((r: any) => {
    if (r.last_reviewed_at) {
      const d = dateKey(r.last_reviewed_at);
      if (d >= thirtyDaysAgo) srsByDay[d] = (srsByDay[d] || 0) + 1;
    }
  });
  const srsTimeline = Array.from({ length: 30 }, (_, i) => {
    const d = daysAgo(29 - i);
    return { date: d, count: srsByDay[d] || 0 };
  });

  const avgXPPerDay = Math.round(totalXPEarned30d / 30);
  const maxXPDayValue = Math.max(...Object.values(xpByDay), 0);
  const maxXPDayDate = Object.entries(xpByDay).find(([, v]) => v === maxXPDayValue)?.[0] || "—";

  const topUsers = levels.map((l: any) => ({
    userId: l.user_id,
    name: l.profiles?.full_name || "Unknown",
    xp: l.total_xp,
  }));

  // ─── Section 4b: Badge Distribution (Advanced) ───
  const badgeDistribution: Record<string, number> = {};
  const badgeEarnerSet = new Set<string>();
  badges.forEach((b: any) => {
    badgeDistribution[b.badge_type] = (badgeDistribution[b.badge_type] || 0) + 1;
    if (b.user_id) badgeEarnerSet.add(b.user_id);
  });
  const badgeEarners = badgeEarnerSet.size;
  const totalBadges = badges.length;
  const avgBadgesPerUser = badgeEarners > 0 ? Math.round((totalBadges / badgeEarners) * 10) / 10 : 0;
  const topBadgeType = Object.entries(badgeDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // ─── Section 5: Content Quality (Advanced) ───
  const totalQuestions = questions.length;
  const withExplanation = questions.filter((q: any) => q.explanation).length;
  const explanationPct = totalQuestions > 0 ? Math.round((withExplanation / totalQuestions) * 100) : 0;
  const withoutExplanation = totalQuestions - withExplanation;

  const totalReports = reports.length;
  const pendingReports = reports.filter((r: any) => r.status === "pending" || r.status === "under_review").length;
  const resolvedReports = reports.filter((r: any) => r.status === "resolved").length;
  const rejectedReports = reports.filter((r: any) => r.status === "rejected").length;
  const processedReports = resolvedReports + rejectedReports;
  const resolutionRate = processedReports > 0 ? Math.round((resolvedReports / processedReports) * 100) : 0;

  // Report resolution SLA
  let resolvedWithin24h = 0;
  let resolvedWithin72h = 0;
  let totalResolutionTime = 0;
  let resolutionCount = 0;
  reports.forEach((r: any) => {
    if (r.resolved_at && r.created_at) {
      const elapsed = new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime();
      totalResolutionTime += elapsed;
      resolutionCount++;
      const hours = elapsed / 3600000;
      if (hours <= 24) resolvedWithin24h++;
      if (hours <= 72) resolvedWithin72h++;
    }
  });
  const avgResolutionHours = resolutionCount > 0 ? Math.round(totalResolutionTime / resolutionCount / 3600000) : 0;
  const sla24hPct = resolutionCount > 0 ? Math.round((resolvedWithin24h / resolutionCount) * 100) : 0;
  const sla72hPct = resolutionCount > 0 ? Math.round((resolvedWithin72h / resolutionCount) * 100) : 0;

  // Reports per day (last 30 days)
  const reportsByDay: Record<string, number> = {};
  reports.forEach((r: any) => {
    if (r.created_at) {
      const d = dateKey(r.created_at);
      if (d >= thirtyDaysAgo) reportsByDay[d] = (reportsByDay[d] || 0) + 1;
    }
  });
  const reportsTimeline = Array.from({ length: 30 }, (_, i) => {
    const d = daysAgo(29 - i);
    return { date: d, count: reportsByDay[d] || 0 };
  });

  // Correction breakdown by subject and field
  const correctionBySubject: Record<string, number> = {};
  const correctionByField: Record<string, number> = {};
  const questionIdsWithCorrections = new Set<string>();
  corrections.forEach((c: any) => {
    const subj = c.questions?.subjects?.name || "Unknown";
    correctionBySubject[subj] = (correctionBySubject[subj] || 0) + 1;
    const field = c.field_changed || "unknown";
    correctionByField[field] = (correctionByField[field] || 0) + 1;
    questionIdsWithCorrections.add(c.question_id);
  });

  return (
    <AnalyticsClient
      stats={{
        totalUsers,
        newThisWeek,
        newThisMonth,
        activeToday,
        activeWeek,
        activeMonth,
        usersWithActivity,
        churned,
        retentionRate,
        avgStreak,
        avgQuestionsPerTest,
        avgDuration,
        completionRate,
        abandonmentRate,
        totalTests: completedTests,
        totalSessions,
        mostPopularSubject,
        mostPopularYear,
        mostPopularMode,
        dailyParticipation: dailyQTotal,
        dailyQAvg,
        srsReviewedPerDay: srsTotal,
        srsAvg,
        totalXPEarned30d,
        deadContent,
        explanationPct,
        totalQuestionsCount,
        questionsWithExplanation,
        explanationCoverage,
        totalAnswers,
        uniqueQuestionsAnswered,
        totalCorrectQ,
        totalWrongQ,
        totalSkippedCount,
        globalAccuracy,
        avgAttemptsPerQ,
        totalBookmarkedUnique,
        pendingReports,
        resolvedReports,
        rejectedReports,
        totalReports,
        resolutionRate,
        avgResolutionHours,
        resolutionCount,
        sla24hPct,
        sla72hPct,
        totalBadges,
        badgeEarners,
        avgBadgesPerUser,
        topBadgeType,
      }}
      signupTimeline={signupTimeline}
      cumulativeSignups={cumulativeSignups}
      signupWeekTimeline={signupWeekTimeline}
      signupsByDOW={signupsByDOW}
      streakBuckets={streakBuckets}
      testsTimeline={testsTimeline}
      xpTimeline={xpTimeline}
      reportsTimeline={reportsTimeline}
      hourDayMatrix={hourDayMatrix}
      dayOfWeekTotals={dayOfWeekTotals}
      subjectDistribution={subjectDistribution}
      modeDistribution={modeDistribution}
      weekTimeline={weekTimeline}
      hardestQs={hardestQs}
      easiestQs={easiestQs}
      mostSkipped={mostSkipped}
      mostBookmarked={mostBookmarked}
      subjectAccuracyTable={subjectAccuracyTable}
      difficultyBuckets={difficultyBuckets}
      topUsers={topUsers}
      badgeDistribution={badgeDistribution}
      correctionBySubject={correctionBySubject}
      correctionByField={correctionByField}
    />
  );
}
