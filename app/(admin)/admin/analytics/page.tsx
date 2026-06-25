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
    supabase.from("profiles").select("created_at"),
    supabase.from("streaks").select("current_streak, last_activity_date"),
    supabase.from("test_sessions").select("total_questions, subject_id, year, mode, started_at, completed_at, status, subjects!inner(name)").gte("started_at", thirtyDaysAgo).limit(5000),
    supabase.from("test_answers").select("question_id, is_correct, selected_option, questions!inner(question_text, subject_id, subjects!inner(name))").gte("created_at", thirtyDaysAgo).limit(10000),
    supabase.from("bookmarks").select("question_id"),
    supabase.from("xp_transactions").select("amount, created_at").gte("created_at", thirtyDaysAgo).limit(5000),
    supabase.from("user_levels").select("user_id, total_xp, profiles!inner(full_name)").order("total_xp", { ascending: false }).limit(10),
    supabase.from("user_badges").select("badge_type"),
    supabase.from("daily_question_answers").select("id, created_at").gte("created_at", thirtyDaysAgo).limit(5000),
    supabase.from("spaced_repetition").select("last_reviewed_at").gte("last_reviewed_at", thirtyDaysAgo).limit(5000),
    supabase.from("questions").select("id, explanation"),
    supabase.from("question_reports").select("status, created_at, resolved_at").limit(2000),
    supabase.from("question_corrections").select("created_at, questions!inner(subject_id, subjects!inner(name))").limit(2000),
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

  // ─── Section 1: User Growth ───
  const signupsByDay: Record<string, number> = {};
  profiles.forEach((p: any) => {
    if (p.created_at) {
      const d = dateKey(p.created_at);
      if (d >= thirtyDaysAgo) signupsByDay[d] = (signupsByDay[d] || 0) + 1;
    }
  });
  const signupTimeline = Array.from({ length: 30 }, (_, i) => {
    const d = daysAgo(29 - i);
    return { date: d, signups: signupsByDay[d] || 0 };
  });

  const today = daysAgo(0);
  const todayDate = today;
  const weekAgo = daysAgo(7);
  const monthAgo = daysAgo(30);

  let activeToday = 0;
  let activeWeek = 0;
  let churned = 0;
  let totalStreak = 0;
  let streakCount = 0;

  streaks.forEach((s: any) => {
    if (s.last_activity_date) {
      if (s.last_activity_date === todayDate) activeToday++;
      if (s.last_activity_date >= weekAgo) activeWeek++;
      if (s.last_activity_date < monthAgo) churned++;
    } else {
      churned++;
    }
    totalStreak += s.current_streak || 0;
    streakCount++;
  });

  const totalUsers = profiles.length;
  const avgStreak = streakCount > 0 ? Math.round((totalStreak / streakCount) * 10) / 10 : 0;

  // Retention: users who joined 28+ days ago still active in last 7 days
  const fourWeeksAgo = daysAgo(28);
  const week1Users = profiles.filter((p: any) => p.created_at && p.created_at.slice(0, 10) <= fourWeeksAgo);
  const week1ActiveUserIds = new Set(
    streaks.filter((s: any) => s.last_activity_date && s.last_activity_date >= weekAgo).map((s: any) => s.user_id)
  );
  const retentionRate = week1Users.length > 0
    ? Math.round(([...week1Users].filter((u: any) => week1ActiveUserIds.has(u.id)).length / week1Users.length) * 100)
    : 0;

  // ─── Section 2: Test Activity ───
  const testsByDay: Record<string, number> = {};
  let totalQuestionsInTests = 0;
  const subjectCounts: Record<string, number> = {};
  const yearCounts: Record<string, number> = {};
  const modeCounts: Record<string, number> = {};
  const hourDayMatrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let completedTests = 0;
  let totalStarted = 0;

  sessions.forEach((s: any) => {
    if (s.status === "completed" && s.completed_at) {
      const d = dateKey(s.completed_at);
      testsByDay[d] = (testsByDay[d] || 0) + 1;
      totalQuestionsInTests += s.total_questions || 0;
      completedTests++;

      // Extract hour and day of week for heatmap
      const started = new Date(s.started_at);
      const hour = started.getHours();
      const dow = started.getDay();
      if (dow >= 0 && dow <= 6 && hour >= 0 && hour <= 23) {
        hourDayMatrix[dow][hour]++;
      }
    }

    if (s.status === "completed" || s.status === "in_progress") totalStarted++;

    // Popular aggregations
    if (s.subjects?.name) subjectCounts[s.subjects.name] = (subjectCounts[s.subjects.name] || 0) + 1;
    if (s.year) yearCounts[String(s.year)] = (yearCounts[String(s.year)] || 0) + 1;
    if (s.mode) modeCounts[s.mode] = (modeCounts[s.mode] || 0) + 1;
  });

  const testsTimeline = Array.from({ length: 30 }, (_, i) => {
    const d = daysAgo(29 - i);
    return { date: d, tests: testsByDay[d] || 0 };
  });

  const avgQuestionsPerTest = completedTests > 0 ? Math.round(totalQuestionsInTests / completedTests) : 0;
  const completionRate = totalStarted > 0 ? Math.round((completedTests / totalStarted) * 100) : 0;

  const mostPopularSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
  const mostPopularYear = Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
  const mostPopularMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

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

  const qAccuracies = Object.entries(accuracyByQ).map(([id, d]) => ({
    id,
    text: d.text,
    subject: d.subject,
    accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
    attempts: d.total,
  }));

  const hardestQs = qAccuracies.filter((q) => q.attempts >= 3).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
  const easiestQs = qAccuracies.filter((q) => q.attempts >= 3).sort((a, b) => b.accuracy - a.accuracy).slice(0, 5);
  const mostSkipped = Object.entries(skippedByQ).map(([id, count]) => ({
    id,
    count,
    text: accuracyByQ[id]?.text || "",
    subject: accuracyByQ[id]?.subject || "",
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  // Most bookmarked
  const bookmarkCounts: Record<string, number> = {};
  bookmarks.forEach((b: any) => { bookmarkCounts[b.question_id] = (bookmarkCounts[b.question_id] || 0) + 1; });
  const mostBookmarked = Object.entries(bookmarkCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({ id, count }));

  // Questions with no attempts (dead content)
  const answeredIds = new Set(Object.keys(accuracyByQ));
  const deadContent = questions.filter((q: any) => !answeredIds.has(q.id)).length;

  // Subject-wise accuracy
  const subjectAccuracy: Record<string, { correct: number; total: number }> = {};
  answers.forEach((a: any) => {
    const subj = a.questions?.subjects?.name || "Unknown";
    if (!subjectAccuracy[subj]) subjectAccuracy[subj] = { correct: 0, total: 0 };
    subjectAccuracy[subj].total++;
    if (a.is_correct === true) subjectAccuracy[subj].correct++;
  });
  const subjectAccuracyTable = Object.entries(subjectAccuracy).map(([name, d]) => ({
    name,
    accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
    attempts: d.total,
  })).sort((a, b) => b.attempts - a.attempts);

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

  const dailyQPerDay = dailyAnswers.length;
  const srsReviewedPerDay = srsRecords.length;

  const topUsers = levels.map((l: any) => ({
    userId: l.user_id,
    name: l.profiles?.full_name || "Unknown",
    xp: l.total_xp,
  }));

  const badgeDistribution: Record<string, number> = {};
  badges.forEach((b: any) => { badgeDistribution[b.badge_type] = (badgeDistribution[b.badge_type] || 0) + 1; });

  // ─── Section 5: Content Quality ───
  const totalQuestions = questions.length;
  const withExplanation = questions.filter((q: any) => q.explanation).length;
  const explanationPct = totalQuestions > 0 ? Math.round((withExplanation / totalQuestions) * 100) : 0;

  const pendingReports = reports.filter((r: any) => r.status === "pending" || r.status === "under_review").length;
  const resolvedReports = reports.filter((r: any) => r.status === "resolved").length;

  let totalResolutionTime = 0;
  let resolutionCount = 0;
  reports.forEach((r: any) => {
    if (r.resolved_at && r.created_at) {
      totalResolutionTime += new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime();
      resolutionCount++;
    }
  });
  const avgResolutionHours = resolutionCount > 0 ? Math.round(totalResolutionTime / resolutionCount / 3600000) : 0;

  const correctionBySubject: Record<string, number> = {};
  corrections.forEach((c: any) => {
    const subj = c.questions?.subjects?.name || "Unknown";
    correctionBySubject[subj] = (correctionBySubject[subj] || 0) + 1;
  });

  return (
    <AnalyticsClient
      stats={{
        totalUsers,
        activeToday,
        activeWeek,
        churned,
        retentionRate,
        avgStreak,
        avgQuestionsPerTest,
        completionRate,
        totalTests: completedTests,
        mostPopularSubject,
        mostPopularYear,
        mostPopularMode,
        dailyParticipation: dailyQPerDay,
        srsReviewedPerDay,
        deadContent,
        explanationPct,
        pendingReports,
        resolvedReports,
        avgResolutionHours,
      }}
      signupTimeline={signupTimeline}
      testsTimeline={testsTimeline}
      xpTimeline={xpTimeline}
      hourDayMatrix={hourDayMatrix}
      hardestQs={hardestQs}
      easiestQs={easiestQs}
      mostSkipped={mostSkipped}
      mostBookmarked={mostBookmarked}
      subjectAccuracyTable={subjectAccuracyTable}
      topUsers={topUsers}
      badgeDistribution={badgeDistribution}
      correctionBySubject={correctionBySubject}
    />
  );
}
