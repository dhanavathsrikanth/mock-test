import { requireExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import {
  recordsForQuestions,
  sessionQuestionIds,
  summarizeAttempts,
  type AttemptRecord,
  type MetricsAnswer,
  type MetricsQuestion,
} from "@/lib/test-metrics";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ClipboardList, ArrowRight, ArrowUpRight, TrendingUp, Target, BookOpen, Zap, GraduationCap, CalendarDays, SlidersHorizontal, Settings2 } from "lucide-react";
import Link from "next/link";
import { PerformanceTrend, ProgressRing, ProfileAvatar } from "./dashboard-visuals";
import styles from "./dashboard.module.css";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Suspense } from "react";
import { QuickPractice } from "@/components/practice/QuickPractice";
import { DashboardConcepts } from "@/components/smart-tags/DashboardConcepts";
import { XPBar } from "@/components/xp/XPBar";

const StreakCard = dynamic(
  () => import("@/components/streak/StreakCard").then((m) => m.StreakCard)
);

const DailyQuestionWidget = dynamic(
  () =>
    import("@/components/daily/DailyQuestionWidget").then(
      (m) => m.DailyQuestionWidget
    )
);

const RevisionWidget = dynamic(
  () =>
    import("@/components/revision/RevisionWidget").then(
      (m) => m.RevisionWidget
    )
);

const ExamCountdown = dynamic(
  () =>
    import("@/components/countdown/ExamCountdown").then(
      (m) => m.ExamCountdown
    )
);

export const metadata = { title: "Dashboard | Exam Prep" };

const modeLabels: Record<string, string> = {
  full_mock: "Full Mock",
  full_paper: "Full paper",
  subject_wise: "Subject-wise",
  topic_wise: "Topic-wise",
  custom: "Custom",
  sprint: "5-Q Sprint",
  concept_fix: "Concept fix",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { user, exam, stream, profile } = await requireExamContext();

  const userId = user.id;

  const sessionsResult = await supabase
    .from("test_sessions")
    .select(
      `
      id,
      total_questions,
      mode,
      completed_at,
      question_ids,
      subject_id,
      subjects ( name )
    `
    )
    .eq("user_id", userId)
    .eq("exam_id", exam.id)
    .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });
  const sessions = sessionsResult.data;
  const userName = profile?.full_name || "User";
  const studyDay = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const dayStart = new Date(`${studyDay}T00:00:00+05:30`).toISOString();
  const [{ data: streak }, dailyProgress] = await Promise.all([
    supabase.from("streaks").select("current_streak,last_activity_date").eq("user_id", userId).maybeSingle(),
    supabase.from("test_answers").select("id,test_sessions!inner(user_id,exam_id,stream_id,completed_at,status)", { count: "exact", head: true })
      .eq("test_sessions.user_id", userId).eq("test_sessions.exam_id", exam.id)
      .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null", { referencedTable: "test_sessions" })
      .eq("test_sessions.status", "completed").gte("test_sessions.completed_at", dayStart).not("is_correct", "is", null)
      .or("selected_option.not.is.null,selected_options.not.is.null,numeric_answer.not.is.null"),
  ]);

  const sessionIds = sessions?.map((s) => s.id) || [];

  const { data: allAnswers } =
    sessionIds.length > 0
      ? await supabase
          .from("test_answers")
          .select(
            `
          session_id,
          question_id,
          is_correct,
          selected_option,
          selected_options,
          numeric_answer,
          questions (
            id,
            marks,
            negative_marks,
            marks_to_all,
            question_type,
            subject_id,
            topic_id,
            subjects ( name )
          )
        `
          )
          .in("session_id", sessionIds)
      : { data: [] };

  type DashboardAnswer = MetricsAnswer & {
    session_id: string;
    questions?: (MetricsQuestion & { subjects?: { name: string } | null }) | null;
  };
  const answerList = (allAnswers || []) as unknown as DashboardAnswer[];

  const answersBySession = new Map<string, DashboardAnswer[]>();
  for (const answer of answerList) {
    const list = answersBySession.get(answer.session_id) || [];
    list.push(answer);
    answersBySession.set(answer.session_id, list);
  }

  const sessionRecords = (sessions || []).map((session) => {
    const sessionAnswers = answersBySession.get(session.id) || [];
    const questionById = new Map<string, MetricsQuestion>();
    for (const answer of sessionAnswers) {
      if (answer.questions?.id) questionById.set(answer.questions.id, answer.questions);
    }
    const answerById = new Map(sessionAnswers.map((answer) => [answer.question_id, answer]));
    const questionIds = sessionQuestionIds(session, sessionAnswers);
    const built = recordsForQuestions(questionIds, questionById, answerById);
    return { session, records: built.records as AttemptRecord[] };
  });

  const allRecords = sessionRecords.flatMap((entry) => entry.records);
  const overall = summarizeAttempts(allRecords);

  const sessionScores = sessionRecords.map(({ session, records }) => {
    const stats = summarizeAttempts(records).stats;
    const subjectName =
      (session.subjects as unknown as { name?: string } | null)?.name || "General";
    return {
      ...session,
      subjectName,
      correct: stats.correct,
      wrong: stats.wrong,
      skipped: stats.skipped,
      graded: stats.graded,
      marksToAll: stats.marksToAll,
      score: stats.correctRate ?? 0,
    };
  });
  const dailyAnswered = dailyProgress.error ? null : dailyProgress.count ?? 0;

  const totalTests = sessions?.length || 0;
  const avgScore = overall.stats.correctRate ?? 0;
  const bestScore =
    sessionScores.length > 0
      ? Math.max(...sessionScores.map((session) => session.score))
      : 0;
  const totalQuestions = overall.stats.total;

  const recentTests = sessionScores.slice(0, 5);

  const subjectPerformance = overall.bySubject
    .map((subject) => ({
      name: subject.name,
      accuracy: subject.correctRate ?? 0,
      graded: subject.graded,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const trendData = sessionScores.slice(0, 10).reverse().map(test => ({
    id: test.id, date: format(new Date(test.completed_at!), "MMM d, yyyy"), score: test.score,
  }));
  const firstName = userName.split(" ")[0];

  return (
    <div className={styles.dashboard}>
      <AnnouncementBanner />
      <header className={styles.topline}>
        <div><h1>Dashboard</h1><p>Welcome back, {firstName}. Keep practising for {exam.name}.</p></div>
        <div className={styles.date}><CalendarDays size={14} />{format(new Date(studyDay + "T12:00:00+05:30"), "EEE, d MMM yyyy")}</div>
      </header>
      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.hero} aria-label="Continue your exam preparation">
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>Your exam preparation</span>
              <h2>Practise for {exam.name}</h2>
              <p>Choose a paper, review your answers, and track your progress.</p>
              <div className={styles.heroActions}>
                <Button asChild variant="secondary" className={styles.heroAction}><Link href="/test/select">Start a test <ArrowUpRight size={16} /></Link></Button>
                <Button asChild variant="outline" className={styles.heroSecondary}><Link href="#daily-practice"><Zap size={16} />5-Q Sprint</Link></Button>
              </div>
            </div>
            <div className={styles.orbit} aria-hidden="true"><div className={styles.orbitTrack} /><div className={styles.orbitInner} /><div className={styles.orbitCore}><GraduationCap size={48} strokeWidth={1.4} /></div></div>
          </section>
          <Suspense fallback={<div role="status" className={styles.panel}>Loading concept insights…</div>}><DashboardConcepts /></Suspense>
          <section className={styles.stats} aria-label="Your preparation at a glance">
            {[{ label: "Tests completed", value: totalTests, icon: ClipboardList }, { label: "Avg correct rate", value: totalTests ? avgScore + "%" : "—", icon: TrendingUp }, { label: "Best correct rate", value: totalTests ? bestScore + "%" : "—", icon: Target }, { label: "Questions in tests", value: totalQuestions, icon: BookOpen }].map(stat => <div className={styles.stat} key={stat.label}><div className={styles.statIcon}><stat.icon size={16} /></div><div><strong>{stat.value}</strong><p>{stat.label}</p></div></div>)}
          </section>
          <section aria-labelledby="practice-heading">
            <div className={styles.sectionHeading}><div><h2 id="practice-heading">Choose your practice</h2><p>Sprint, focus on a subject, or build a custom test.</p></div></div>
            <div className={styles.paths}>
              {[
                { href: "/practice", title: "5-Q Sprint", detail: "One concept. A focused reset.", meta: "12–15 min", action: "Start sprint", mode: "sprint", icon: Zap },
                { href: "/test/select?mode=subject_wise", title: "Subject practice", detail: "Build strength in one subject.", meta: "Your pace", action: "Pick a subject", mode: "subject", icon: BookOpen },
                { href: "/test/select?mode=custom", title: "Your own test", detail: "Choose what you practise.", meta: "Fully flexible", action: "Build a test", mode: "custom", icon: SlidersHorizontal },
              ].map(path => <Link href={path.href} key={path.href} className={styles.path} data-mode={path.mode}>
                <div className={styles.pathVisual} aria-hidden="true">
                  <div className={styles.pathIcon}><path.icon size={23} strokeWidth={1.7} /></div>
                  {path.mode === "sprint" ? <div className={styles.questionTiles}>{[1,2,3,4,5].map(n => <span key={n}>{n}</span>)}</div>
                    : path.mode === "subject" ? <div className={styles.subjectTiles}><span /><span /><span /></div>
                    : <div className={styles.sliderArt}><span /><span /><span /></div>}
                  <span className={styles.pathBadge}>{path.mode === "sprint" ? "5 questions" : path.mode === "subject" ? "One subject" : "Your rules"}</span>
                </div>
                <div className={styles.pathBody}><h3>{path.title}</h3><p>{path.detail}</p><span className={styles.pathMeta}>{path.meta}</span></div>
                <div className={styles.pathFoot}><span>{path.action}</span><span className={styles.pathArrow}><ArrowUpRight size={15} /></span></div>
              </Link>)}

            </div>
          </section>
          <section id="daily-practice" aria-label="Your daily practice" className={styles.widgetGrid}>
            <Suspense fallback={<div id="quick-practice" role="status" className={styles.panel}>Loading quick practice…</div>}><QuickPractice /></Suspense>
            <RevisionWidget />
          </section>
          <Card className={styles.panel}><PerformanceTrend data={trendData} /></Card>
          <Card className={styles.panel}>
            <div className={styles.panelHeading}><div><h2>Recent tests</h2><p>Reflect, review, and keep moving forward</p></div><Link href="/recent-tests" className={styles.textLink}>View all <ArrowRight size={13} /></Link></div>
            {recentTests.length === 0 ? <div className={styles.emptyChart}><ClipboardList size={28} /><strong>Your first result belongs here</strong><p>Complete a test, then return to review your answers.</p><Button asChild size="sm"><Link href="/test/select">Start a test <ArrowRight size={14} /></Link></Button></div> : <div className={styles.recentList}>{recentTests.map(test => <div key={test.id} className={styles.recentRow}><div className={styles.recentName}><div className={styles.statIcon}><ClipboardList size={16} /></div><div><strong>{test.subjectName}</strong><p>{modeLabels[test.mode] || test.mode} · {format(new Date(test.completed_at!), "MMM d, yyyy")}</p></div></div><div className={styles.recentActions}><strong>{test.score}%</strong><Button variant="outline" size="sm" asChild><Link href={`/result/${test.id}`}>Result</Link></Button><Button variant="ghost" size="sm" asChild><Link href={`/review/${test.id}`}>Review</Link></Button></div></div>)}</div>}
            <p className={styles.note}>Correct rate = correct answers ÷ graded questions, including skipped questions; marks-to-all questions are excluded from the rate but their marks count. Subject bars use the same definition. This is a practice figure, not an official {exam.name} score.</p>
          </Card>
        </div>
        <aside className={styles.rail} aria-label="Your profile and study goals">
          <Card className={`${styles.panel} ${styles.profile}`}>
            <div className={styles.profileTop}><span>Your profile</span><Link href="/settings" aria-label="Open settings"><Settings2 size={16} /></Link></div>
            <ProfileAvatar name={userName} url={profile?.avatar_url} />
            <h2>{userName}</h2><span className={styles.examPill}><GraduationCap size={14} />{exam.name}{stream ? ` · ${stream.code}` : ""}</span>
            <XPBar />
            <div className={styles.profileStats}><div><strong>{streak?.current_streak ?? 0}</strong><p>Day study streak</p></div><div><strong>{totalTests}</strong><p>Tests completed</p></div></div>
          </Card>
          <ExamCountdown key={`${userId}:${exam.id}`} examId={exam.id} examName={exam.name} userId={userId} />
          <Card className={`${styles.panel} ${styles.goal}`}>
            <div className={styles.panelHeading}><h2>Your daily goal</h2><Target size={16} className="text-violet-500" /></div>
            {dailyAnswered == null ? <p role="status">Progress temporarily unavailable</p> : <><ProgressRing value={dailyAnswered / 20 * 100} label="Daily question goal" size={136}><strong>{dailyAnswered}<small> / 20</small></strong><small>questions today</small></ProgressRing><p>{dailyAnswered >= 20 ? "Goal complete. A great day of practice!" : `${20 - dailyAnswered} more questions to reach today’s goal.`}</p></>}
            <Button asChild variant="secondary" className={styles.goalAction}><Link href="#daily-practice"><Zap size={16} />Keep practising<ArrowRight size={16} /></Link></Button>
          </Card>
          <Card className={styles.panel}>
            <div className={styles.panelHeading}><h2>Subject performance</h2><Link href="/analytics" className={styles.textLink} aria-label="View subject analytics"><ArrowUpRight size={16} /></Link></div>
            {subjectPerformance.length ? <div className={styles.subjectList}>{subjectPerformance.slice(0, 5).map(subject => <div key={subject.name} className={styles.subjectBar}><div><h3>{subject.name}</h3><strong>{subject.accuracy}%</strong></div><div className={styles.subjectTrack} role="progressbar" aria-label={`${subject.name} correct rate`} aria-valuenow={subject.accuracy} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${subject.accuracy}%` }} data-level={subject.accuracy >= 60 ? "strong" : subject.accuracy >= 35 ? "developing" : "focus"} /></div></div>)}</div> : <p className={styles.note}>Complete your first test to discover your strengths and subjects to focus on.</p>}
          </Card>
          <DailyQuestionWidget />
          <StreakCard />
        </aside>
      </div>
    </div>
  );
}
