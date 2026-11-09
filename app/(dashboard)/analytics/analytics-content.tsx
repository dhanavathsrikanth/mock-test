"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeading } from "@/components/workspace/PageHeading";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  FileQuestion,
  Target,
  Flame,
  Clock,
  Zap,
  BookOpen,
  ArrowRight,
  Activity,
  TrendingUp,
  BarChart3,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Layers,
  Info,
  Minus,
  Check,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  formatRate,
  type GroupStats,
  type PacingSummary,
  type QuestionStats,
  type QuestionType,
} from "@/lib/test-metrics";

export interface ScoreTrendItem {
  date: string;
  score: number;
}

export interface WeeklyTrendItem {
  week: string;
  avgScore: number;
}

export interface CumulativePoint {
  label: string;
  avgScore: number;
}

export interface SessionHistoryItem {
  id: string;
  completedAt: string | null;
  dateLabel: string;
  timeLabel: string;
  mode: string;
  paper: string | null;
  year: number | null;
  loadedQuestions: number;
  gradedQuestions: number;
  correct: number;
  wrong: number;
  skipped: number;
  marksToAll: number;
  ungraded: number;
  correctRate: number | null;
  attemptAccuracy: number | null;
  netMarks: number;
  maximumMarks: number;
  netMarkRate: number | null;
  timingLabel: string;
  timingAvailable: boolean;
  timingSeconds: number | null;
  timingKind: "active" | "elapsed" | "unavailable";
}

export interface TopicAnalyticsItem extends GroupStats {
  subjectName: string;
}

export interface YearWiseItem {
  year: number;
  tests: number;
  graded: number;
  correctRate: number | null;
  netMarks: number;
  maximumMarks: number;
  netMarkRate: number | null;
}

export interface AnalyticsTiming {
  availableSessions: number;
  totalSessions: number;
  totalSeconds: number;
  avgElapsedPerGradedQuestion: number | null;
  perQuestionRecorded: boolean;
  pacing?: PacingSummary;
}

export interface StrategicInsight {
  type: "warning" | "opportunity" | "strength" | "tip";
  title: string;
  description: string;
  stat?: string;
}

export interface AnalyticsContentProps {
  totalTests: number;
  overall?: QuestionStats;
  byType?: Record<QuestionType, QuestionStats>;
  subjectStats?: GroupStats[];
  topicStats?: TopicAnalyticsItem[];
  scoreTrend?: ScoreTrendItem[];
  history?: SessionHistoryItem[];
  weeklyTrend?: WeeklyTrendItem[];
  cumulativeProgress?: CumulativePoint[];
  consistencyScore?: number;
  timing?: AnalyticsTiming;
  studyStreak?: number;
  longestStreak?: number;
  streakAvailable?: boolean;
  streakData?: { date: string; count: number }[][];
  dataCaveats?: string[];
  yearWise?: YearWiseItem[];
  examLabel?: string;
  streamLabel?: string;
}

const EMPTY_STATS: QuestionStats = {
  total: 0,
  graded: 0,
  attempted: 0,
  gradedAttempts: 0,
  correct: 0,
  wrong: 0,
  skipped: 0,
  ungraded: 0,
  marksToAll: 0,
  earnedMarks: 0,
  deductedMarks: 0,
  netMarks: 0,
  maximumMarks: 0,
  skippedMarks: 0,
  correctRate: null,
  attemptAccuracy: null,
  netMarkRate: null,
};

function emptyTypeStats(): Record<QuestionType, QuestionStats> {
  return {
    MCQ: { ...EMPTY_STATS },
    MSQ: { ...EMPTY_STATS },
    NAT: { ...EMPTY_STATS },
  };
}

function formatTime(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return "Not recorded";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

const MODE_LABELS: Record<string, string> = {
  full_mock: "Full mock",
  full_paper: "Full paper",
  subject_wise: "Subject-wise",
  topic_wise: "Topic-wise",
  custom: "Custom",
  sprint: "5-Q sprint",
};

const chartTooltipStyle = {
  borderRadius: "12px",
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
  fontSize: "12px",
};

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
        <BookOpen className="h-8 w-8" />
      </div>
      <div>
        <h2 className="text-xl font-bold tracking-tight">No completed tests yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Complete a test to see correct rate, attempt accuracy, marks, and subject and topic breakdowns. Analytics never estimates a GATE score or rank.
        </p>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Button asChild>
          <Link href="/practice">
            <Zap className="mr-1.5 h-4 w-4" />
            Start a 5-Q Sprint
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/test/select">
            <ClipboardList className="mr-1.5 h-4 w-4" />
            Full Mocks
          </Link>
        </Button>
      </div>
    </div>
  );
}

function RateBar({ value, tone = "primary" }: { value: number | null; tone?: "primary" | "emerald" | "rose" }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          tone === "emerald" ? "bg-emerald-500" : tone === "rose" ? "bg-rose-500" : "bg-primary",
        )}
        style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }}
      />
    </div>
  );
}

export function AnalyticsContent({
  totalTests,
  overall = EMPTY_STATS,
  byType,
  subjectStats = [],
  topicStats = [],
  scoreTrend = [],
  history = [],
  weeklyTrend = [],
  cumulativeProgress = [],
  consistencyScore = 0,
  timing = {
    availableSessions: 0,
    totalSessions: totalTests,
    totalSeconds: 0,
    avgElapsedPerGradedQuestion: null,
    perQuestionRecorded: false,
  },
  studyStreak = 0,
  longestStreak = 0,
  streakAvailable = true,
  streakData = [],
  dataCaveats = [],
  yearWise = [],
  examLabel = "GATE",
  streamLabel,
}: AnalyticsContentProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "subjects" | "history">("overview");
  const [visibleHistory, setVisibleHistory] = useState(20);

  if (totalTests === 0) {
    return (
      <div className="space-y-6 py-6">
        <PageHeading
          title="Analytics"
          icon={<BarChart3 />}
          description="Your practice, turned into a clearer picture of your progress."
        />
        <EmptyState />
      </div>
    );
  }

  const typeStats = byType || emptyTypeStats();
  const penaltyShare = overall.earnedMarks > 0
    ? Math.round((overall.deductedMarks / overall.earnedMarks) * 100)
    : null;

  const rankedSubjects = [...subjectStats]
    .filter((subject) => subject.graded > 0 && subject.correctRate != null)
    .sort((a, b) => (a.correctRate ?? 101) - (b.correctRate ?? 101));
  const weakestSubjects = rankedSubjects.slice(0, 4);

  const rankedTopics = [...topicStats]
    .filter((topic) => topic.graded >= 3 && topic.correctRate != null)
    .sort((a, b) => (a.correctRate ?? 101) - (b.correctRate ?? 101));
  const weakestTopics = rankedTopics.slice(0, 8);
  const topicCoverage = topicStats.reduce(
    (coverage, topic) => ({
      mapped: coverage.mapped + topic.total,
      graded: coverage.graded + topic.graded,
    }),
    { mapped: 0, graded: 0 },
  );

  const strategicInsights: StrategicInsight[] = [];
  if (overall.deductedMarks > 0) {
    strategicInsights.push({
      type: "warning",
      title: "Negative marking cost",
      description: `${overall.wrong} wrong graded answer${overall.wrong === 1 ? "" : "s"} produced ${formatNumber(overall.deductedMarks)} marks of penalties${penaltyShare == null ? "" : `, equal to ${penaltyShare}% of earned marks`}. Each question's configured penalty is used; no fixed penalty is assumed.`,
      stat: `−${formatNumber(overall.deductedMarks)} marks`,
    });
  }
  if (overall.skipped > 0) {
    strategicInsights.push({
      type: "opportunity",
      title: "Skipped-question ledger",
      description: `${overall.skipped} graded question${overall.skipped === 1 ? " was" : "s were"} left unanswered, leaving ${formatNumber(overall.skippedMarks)} positive marks unearned. Skipping does not reduce net marks.`,
      stat: `${overall.skipped} skipped`,
    });
  }
  if (weakestTopics[0]) {
    const topic = weakestTopics[0];
    strategicInsights.push({
      type: "opportunity",
      title: "Lowest topic correct rate",
      description: `${topic.name} (${topic.subjectName}) is at ${formatRate(topic.correctRate)} correct rate across ${topic.graded} graded question${topic.graded === 1 ? "" : "s"}. This is a topic-level practice signal, not a prediction of exam marks.`,
      stat: `${formatRate(topic.correctRate)} correct rate`,
    });
  }
  if (overall.marksToAll > 0) {
    strategicInsights.push({
      type: "tip",
      title: "Marks-to-all questions excluded from accuracy",
      description: `${overall.marksToAll} question${overall.marksToAll === 1 ? " was" : "s were"} awarded full marks to all candidates. The marks count, but these questions are excluded from correct rate, attempt accuracy, attempted and skipped counts.`,
      stat: `${overall.marksToAll} awarded`,
    });
  }
  if (!timing.perQuestionRecorded) {
    strategicInsights.push({
      type: "tip",
      title: "Pacing data unavailable",
      description: "The test player does not record per-question time, so speed-zone and time-per-question charts are not shown. Session elapsed time is reported separately when available.",
      stat: "Not recorded",
    });
  }

  const shownHistory = history.slice(0, visibleHistory);
  const hasMoreHistory = history.length > shownHistory.length;

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading
          title="Practice Analytics"
          icon={<BarChart3 />}
          description={`Question-weighted results from ${totalTests} completed test${totalTests === 1 ? "" : "s"} in ${examLabel}${streamLabel ? ` · ${streamLabel}` : ""}. These are practice metrics, not an official score, rank, or cutoff prediction.`}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/practice">
              <Zap className="mr-1.5 h-3.5 w-3.5 text-primary" />
              Quick Sprint
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/revision">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Revision Hub
            </Link>
          </Button>
        </div>
      </div>

      {dataCaveats.length > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Data limitations for these analytics ({dataCaveats.length})
            <span className="ml-auto text-[11px] font-normal">Show details</span>
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
            {dataCaveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex w-full items-center gap-1.5 overflow-x-auto rounded-xl border border-border/80 bg-muted/60 p-1 [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all",
            activeTab === "overview"
              ? "border border-border/60 bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
        >
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span>Overview</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("subjects")}
          className={cn(
            "flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all",
            activeTab === "subjects"
              ? "border border-border/60 bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
        >
          <Layers className="h-3.5 w-3.5 text-primary" />
          <span>Subjects &amp; Topics ({subjectStats.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all",
            activeTab === "history"
              ? "border border-border/60 bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
        >
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span>Test History</span>
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="animate-in fade-in-50 space-y-6 duration-200">
          <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-sm">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Target className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Practice performance
                    </span>
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[11px] font-semibold text-primary">
                      Practice metric · not an official score
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-4xl font-black tracking-tight text-foreground tabular-nums sm:text-5xl">
                      {formatRate(overall.correctRate)}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">correct rate</span>
                  </div>
                  <p className="max-w-lg text-xs text-muted-foreground">
                    Correct answers divided by every ordinarily graded question, including skipped ones. Marks-to-all questions are excluded from the rate.
                  </p>

                  <div className="grid max-w-lg grid-cols-2 gap-3 pt-1 sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Attempt accuracy</p>
                      <p className="text-lg font-bold tabular-nums">{formatRate(overall.attemptAccuracy)}</p>
                      <p className="text-[10px] text-muted-foreground">{overall.correct} / {overall.gradedAttempts} graded attempts</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Net mark rate</p>
                      <p className={cn("text-lg font-bold tabular-nums", overall.netMarks < 0 && "text-rose-600 dark:text-rose-400")}>
                        {formatRate(overall.netMarkRate)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatNumber(overall.netMarks)} / {formatNumber(overall.maximumMarks)} marks</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Graded questions</p>
                      <p className="text-lg font-bold tabular-nums">{overall.graded}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {overall.skipped} skipped
                        {overall.marksToAll > 0 ? ` · ${overall.marksToAll} marks-to-all` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="min-w-[280px] space-y-3 rounded-xl border border-border/80 bg-background/80 p-4">
                  <p className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Marks composition</span>
                    <span className="text-[10px] font-normal text-muted-foreground">All completed tests</span>
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Earned marks
                      </span>
                      <strong className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                        +{formatNumber(overall.earnedMarks)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        Negative penalties
                      </span>
                      <strong className="font-semibold text-rose-600 tabular-nums dark:text-rose-400">
                        −{formatNumber(overall.deductedMarks)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                        Skipped marks unearned
                      </span>
                      <strong className="font-semibold text-foreground tabular-nums">
                        {formatNumber(overall.skippedMarks)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2 font-bold">
                      <span className="text-foreground">Net marks</span>
                      <span className={cn("text-sm tabular-nums text-primary", overall.netMarks < 0 && "text-rose-600 dark:text-rose-400")}>
                        {formatNumber(overall.netMarks)} / {formatNumber(overall.maximumMarks)}
                      </span>
                    </div>
                  </div>
                  {overall.netMarks < 0 && (
                    <p className="rounded-md bg-rose-50/70 p-1.5 text-[10px] leading-relaxed text-rose-700 dark:bg-rose-950/20 dark:text-rose-300">
                      Net marks are negative because penalties exceeded earned marks. The total is shown exactly, not clamped at zero.
                    </p>
                  )}
                  {overall.marksToAll > 0 && (
                    <p className="rounded-md bg-amber-50/70 p-1.5 text-[10px] leading-relaxed text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
                      {overall.marksToAll} marks-to-all question{overall.marksToAll === 1 ? "" : "s"} awarded full marks and excluded from accuracy.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
            <Card className="rounded-xl border shadow-2xs transition-shadow hover:shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between px-4 pb-1 pt-4">
                <span className="text-xs font-medium text-muted-foreground">Graded questions</span>
                <FileQuestion className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">{overall.graded}</div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  +{overall.marksToAll} marks-to-all · {overall.ungraded} ungraded
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-xl border shadow-2xs transition-shadow hover:shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between px-4 pb-1 pt-4">
                <span className="text-xs font-medium text-muted-foreground">Correct rate</span>
                <Check className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 sm:text-3xl">
                  {formatRate(overall.correctRate)}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{overall.correct} / {overall.graded} graded, skipped included</p>
              </CardContent>
            </Card>

            <Card className="rounded-xl border shadow-2xs transition-shadow hover:shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between px-4 pb-1 pt-4">
                <span className="text-xs font-medium text-muted-foreground">Attempt accuracy</span>
                <Target className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                  {formatRate(overall.attemptAccuracy)}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{overall.correct} / {overall.gradedAttempts} graded attempts</p>
              </CardContent>
            </Card>

            <Card className="rounded-xl border shadow-2xs transition-shadow hover:shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between px-4 pb-1 pt-4">
                <span className="text-xs font-medium text-muted-foreground">Study streak</span>
                <Flame className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                  {streakAvailable ? studyStreak : "—"}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{streakAvailable ? "days" : ""}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {streakAvailable ? `Longest: ${longestStreak} days` : "Authoritative streak unavailable"}
                </p>
              </CardContent>
            </Card>
          </div>

          {strategicInsights.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">What the data says</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {strategicInsights.map((insight) => (
                  <div
                    key={insight.title}
                    className={cn(
                      "space-y-2 rounded-xl border p-4 transition-all",
                      insight.type === "warning" && "border-amber-300/60 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20",
                      insight.type === "opportunity" && "border-primary/30 bg-primary/5",
                      insight.type === "strength" && "border-emerald-300/60 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20",
                      insight.type === "tip" && "border-sky-300/60 bg-sky-50/30 dark:border-sky-900/40 dark:bg-sky-950/20",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {insight.type === "warning" && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />}
                        {insight.type === "opportunity" && <Target className="h-4 w-4 shrink-0 text-primary" />}
                        {insight.type === "strength" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                        {insight.type === "tip" && <Info className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />}
                        <h4 className="text-xs font-bold text-foreground">{insight.title}</h4>
                      </div>
                      {insight.stat && (
                        <span className="rounded-full border bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground">
                          {insight.stat}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{insight.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Card className="rounded-xl border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Correct rate by test</CardTitle>
                <CardDescription className="text-xs">
                  Per-test correct rate across the last {scoreTrend.length} scored tests, in chronological order. Skipped questions are included in the denominator.
                </CardDescription>
              </div>
              <span className="text-xs font-medium text-muted-foreground">All-time: {formatRate(overall.correctRate)}</span>
            </CardHeader>
            <CardContent>
              {scoreTrend.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Complete a test with graded questions to visualize this trend.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={scoreTrend} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(value: number) => `${value}%`} />
                    <Tooltip formatter={(value) => [`${value}%`, "Correct rate"]} contentStyle={chartTooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "hsl(var(--primary))" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="rounded-xl border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-semibold">Completed-test calendar</CardTitle>
                </div>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  {streakAvailable ? `${studyStreak} day streak` : "Streak unavailable"}
                </span>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">
                  Each square counts completed tests, not all qualifying study activity.
                </p>
                {streakData.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Complete tests to populate this calendar.</p>
                ) : (
                  <div className="overflow-x-auto pb-2 [scrollbar-width:thin]">
                    <div className="inline-flex gap-1">
                      {streakData.map((week, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-1">
                          {week.map((day) => {
                            const level =
                              day.count === 0
                                ? "bg-muted/40"
                                : day.count === 1
                                  ? "bg-emerald-300 dark:bg-emerald-800"
                                  : day.count === 2
                                    ? "bg-emerald-500"
                                    : "bg-emerald-700";
                            return (
                              <div
                                key={day.date}
                                className={`h-3 w-3 rounded-xs transition-transform hover:scale-125 ${level}`}
                                title={`${day.date}: ${day.count} completed test${day.count === 1 ? "" : "s"}`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>None</span>
                      <div className="flex gap-1">
                        <div className="h-2.5 w-2.5 rounded-xs bg-muted/40" />
                        <div className="h-2.5 w-2.5 rounded-xs bg-emerald-300 dark:bg-emerald-800" />
                        <div className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
                        <div className="h-2.5 w-2.5 rounded-xs bg-emerald-700" />
                      </div>
                      <span>3+ tests</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-semibold">Session timing</CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {timing.availableSessions} / {timing.totalSessions} timed
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {timing.availableSessions > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Recorded session time</p>
                        <p className="text-lg font-bold tabular-nums">{formatTime(timing.totalSeconds)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Elapsed / graded question</p>
                        <p className="text-lg font-bold tabular-nums">
                          {timing.avgElapsedPerGradedQuestion == null ? "—" : formatTime(timing.avgElapsedPerGradedQuestion)}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Session time is wall-clock start to submission, or foreground sprint time. Idle time is included and late submissions are capped at the paper duration. It is not per-question solving time.
                    </p>
                  </>
                ) : (
                  <p className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                    No trustworthy session timing was recorded for these tests, so no time or pace figures are shown.
                  </p>
                )}
                <div className={cn(
                  "rounded-lg border p-3 text-xs",
                  timing.perQuestionRecorded
                    ? "border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200"
                    : "border-muted bg-muted/20 text-muted-foreground",
                )}>
                  {timing.perQuestionRecorded
                    ? "Per-question foreground timing is recorded, so the pace figures below are measured — not estimated."
                    : "Per-question timing was not recorded, so pacing zones and per-question speed analysis are unavailable."}
                </div>

                {timing.pacing?.available && timing.pacing.benchmark && (
                  <div className="space-y-3 border-t pt-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Median / question</p>
                        <p className="text-lg font-bold tabular-nums">
                          {timing.pacing.medianSeconds == null ? "—" : formatTime(timing.pacing.medianSeconds)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Average / question</p>
                        <p className="text-lg font-bold tabular-nums">
                          {timing.pacing.meanSeconds == null ? "—" : formatTime(timing.pacing.meanSeconds)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          {timing.pacing.benchmark.kind === "limit" ? "Budget / question" : "Typical time"}
                        </p>
                        <p className="text-lg font-bold tabular-nums">{formatTime(timing.pacing.benchmark.seconds)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          label: "Quick & correct",
                          count: timing.pacing.quadrants.fastCorrect,
                          className: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20",
                          countClass: "text-emerald-700 dark:text-emerald-300",
                        },
                        {
                          label: "Quick & wrong",
                          count: timing.pacing.quadrants.fastWrong,
                          className: "border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20",
                          countClass: "text-amber-700 dark:text-amber-300",
                        },
                        {
                          label: "Slow & correct",
                          count: timing.pacing.quadrants.slowCorrect,
                          className: "border-sky-200 bg-sky-50/40 dark:border-sky-900/40 dark:bg-sky-950/20",
                          countClass: "text-sky-700 dark:text-sky-300",
                        },
                        {
                          label: "Slow & wrong",
                          count: timing.pacing.quadrants.slowWrong,
                          className: "border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20",
                          countClass: "text-rose-700 dark:text-rose-300",
                        },
                      ].map((tile) => (
                        <div key={tile.label} className={`rounded-lg border p-2.5 ${tile.className}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold">{tile.label}</span>
                            <span className={`text-base font-bold tabular-nums ${tile.countClass}`}>{tile.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Questions at or under{" "}
                      {timing.pacing.benchmark.kind === "limit"
                        ? "the paper's even time budget count as quick"
                        : "your median recorded time count as quick"}
                      . Split across {timing.pacing.recorded} timed question
                      {timing.pacing.recorded === 1 ? "" : "s"} of {timing.pacing.total}; responses without a trusted
                      grading result stay out of the quadrants.
                    </p>

                    {timing.pacing.byTopic.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-foreground">Slowest topics by recorded time</p>
                        <ul className="space-y-1">
                          {timing.pacing.byTopic.slice(0, 5).map((topic) => (
                            <li key={topic.id} className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="min-w-0 truncate">
                                {topic.name}
                                <span className="ml-1.5 text-muted-foreground">({topic.questions} timed)</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-2 font-mono tabular-nums">
                                {topic.correctRate != null && <span className="text-muted-foreground">{topic.correctRate}%</span>}
                                <span className="font-semibold">{formatTime(topic.meanSeconds)}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "subjects" && (
        <div className="animate-in fade-in-50 space-y-6 duration-200">
          <Card className="rounded-xl border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Subject-wise correct rate</CardTitle>
              <CardDescription className="text-xs">
                Correct answers divided by every graded question in the subject, including skipped. Marks-to-all questions are excluded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subjectStats.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No subject data available yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={subjectStats} margin={{ top: 10, right: 15, left: -15, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(value: number) => `${value}%`} />
                    <Tooltip
                      formatter={(value, _name, item) => {
                        const payload = item?.payload as GroupStats | undefined;
                        return [
                          `${value}% (${payload?.correct ?? 0}/${payload?.graded ?? 0} graded)`,
                          "Correct rate",
                        ];
                      }}
                      contentStyle={chartTooltipStyle}
                    />
                    <Bar dataKey="correctRate" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Subject ledger</CardTitle>
              <CardDescription className="text-xs">
                Attempt accuracy uses attempted graded questions only. Correct rate includes skipped questions. Both exclude marks-to-all.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subjectStats.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No subject data available yet.</p>
              ) : (
                <div className="overflow-x-auto [scrollbar-width:thin]">
                  <table className="w-full min-w-[640px] text-xs">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2.5 font-semibold">Subject</th>
                        <th className="pb-2.5 text-center font-semibold">Graded</th>
                        <th className="pb-2.5 text-center font-semibold">Correct</th>
                        <th className="pb-2.5 text-center font-semibold">Wrong</th>
                        <th className="pb-2.5 text-center font-semibold">Skipped</th>
                        <th className="pb-2.5 text-center font-semibold">Correct rate</th>
                        <th className="pb-2.5 text-center font-semibold">Attempt accuracy</th>
                        <th className="pb-2.5 text-right font-semibold">Net marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {subjectStats.map((subject) => (
                        <tr key={subject.id} className="transition-colors hover:bg-muted/30">
                          <td className="py-2.5 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              {subject.name}
                              {subject.marksToAll > 0 && (
                                <Badge variant="outline" className="text-[9px]">MTA {subject.marksToAll}</Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 text-center tabular-nums text-muted-foreground">{subject.graded}</td>
                          <td className="py-2.5 text-center font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">{subject.correct}</td>
                          <td className="py-2.5 text-center font-semibold text-rose-600 tabular-nums dark:text-rose-400">{subject.wrong}</td>
                          <td className="py-2.5 text-center tabular-nums text-muted-foreground">{subject.skipped}</td>
                          <td className="py-2.5 text-center">
                            <div className="mx-auto w-20 space-y-1">
                              <span className="font-semibold tabular-nums">{formatRate(subject.correctRate)}</span>
                              <RateBar value={subject.correctRate} />
                            </div>
                          </td>
                          <td className="py-2.5 text-center font-medium tabular-nums">{formatRate(subject.attemptAccuracy)}</td>
                          <td className="py-2.5 text-right font-bold tabular-nums">{formatNumber(subject.netMarks)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="rounded-xl border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Weakest subjects</CardTitle>
                <CardDescription className="text-xs">
                  Ranked by correct rate. Every subject shown has at least one graded question.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {weakestSubjects.length === 0 ? (
                  <p className="py-3 text-sm text-muted-foreground">No graded subject data yet.</p>
                ) : (
                  weakestSubjects.map((subject) => (
                    <div key={subject.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card/80 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{subject.name}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {subject.correct} correct · {subject.wrong} wrong · {subject.skipped} skipped · {subject.graded} graded
                        </p>
                        <div className="mt-2 w-32">
                          <RateBar value={subject.correctRate} tone={(subject.correctRate ?? 0) < 50 ? "rose" : "primary"} />
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-sm font-bold tabular-nums">{formatRate(subject.correctRate)}</span>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" asChild>
                          <Link href={`/test/select?mode=subject_wise&subject=${encodeURIComponent(subject.id)}`}>
                            Practice
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Weakest topics</CardTitle>
                <CardDescription className="text-xs">
                  Actual topic-level aggregation. Only topics with at least 3 graded questions are ranked.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {weakestTopics.length === 0 ? (
                  <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                    <p>
                      No topic has at least 3 graded questions yet, so no topic is ranked. Topic names are available for {topicCoverage.mapped} loaded question{topicCoverage.mapped === 1 ? "" : "s"}.
                    </p>
                    {overall.total > topicCoverage.mapped && (
                      <p className="mt-1">
                        {overall.total - topicCoverage.mapped} loaded question{overall.total - topicCoverage.mapped === 1 ? " has" : "s have"} no topic assigned.
                      </p>
                    )}
                  </div>
                ) : (
                  weakestTopics.map((topic) => (
                    <div key={topic.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card/80 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{topic.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{topic.subjectName}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {topic.correct} correct · {topic.wrong} wrong · {topic.skipped} skipped · {topic.graded} graded
                        </p>
                        <div className="mt-2 w-32">
                          <RateBar value={topic.correctRate} tone={(topic.correctRate ?? 0) < 50 ? "rose" : "primary"} />
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-sm font-bold tabular-nums">{formatRate(topic.correctRate)}</span>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" asChild>
                          <Link href={`/test/select?mode=topic_wise${topic.subjectId ? `&subject=${encodeURIComponent(topic.subjectId)}` : ""}&topic=${encodeURIComponent(topic.id)}`}>
                            Practice
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                {rankedTopics.length > weakestTopics.length && (
                  <p className="pt-1 text-[11px] text-muted-foreground">
                    Showing the 8 lowest topics of {rankedTopics.length} ranked.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-xl border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Question-format ledger</CardTitle>
              <CardDescription className="text-xs">
                MCQ, MSQ, and NAT use the same correct-rate and attempt-accuracy definitions as every other view.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(["MCQ", "MSQ", "NAT"] as const).map((type) => {
                  const item = typeStats[type];
                  const labels: Record<QuestionType, string> = {
                    MCQ: "Single choice",
                    MSQ: "Multiple select",
                    NAT: "Numerical answer",
                  };
                  return (
                    <div key={type} className="rounded-xl border bg-card p-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div>
                          <span className="text-sm font-bold">{type}</span>
                          <p className="text-[10px] text-muted-foreground">{labels[type]}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{item.graded} graded</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Correct rate</p>
                          <p className="font-bold tabular-nums">{formatRate(item.correctRate)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Attempt accuracy</p>
                          <p className="font-bold tabular-nums">{formatRate(item.attemptAccuracy)}</p>
                        </div>
                      </div>
                      <dl className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-muted/40 p-2 text-center text-xs">
                        <div>
                          <dt className="text-[10px] text-muted-foreground">Correct</dt>
                          <dd className="font-semibold text-emerald-600 dark:text-emerald-400">{item.correct}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] text-muted-foreground">Wrong</dt>
                          <dd className="font-semibold text-rose-600 dark:text-rose-400">{item.wrong}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] text-muted-foreground">Skipped</dt>
                          <dd className="font-semibold">{item.skipped}</dd>
                        </div>
                      </dl>
                      <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs">
                        <span className="text-muted-foreground">Net marks</span>
                        <strong className="font-bold tabular-nums">{formatNumber(item.netMarks)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "history" && (
        <div className="animate-in fade-in-50 space-y-6 duration-200">
          <Card className="rounded-xl border">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">Completed tests</CardTitle>
                  <CardDescription className="text-xs">
                    Every completed test loaded from the database, newest first. No rows are silently dropped.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Showing {shownHistory.length} of {history.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No completed tests found.</p>
              ) : (
                <div className="overflow-x-auto [scrollbar-width:thin]">
                  <table className="w-full min-w-[880px] text-xs">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2.5 font-semibold">Completed</th>
                        <th className="pb-2.5 font-semibold">Test</th>
                        <th className="pb-2.5 text-center font-semibold">Graded</th>
                        <th className="pb-2.5 text-center font-semibold">Correct</th>
                        <th className="pb-2.5 text-center font-semibold">Skipped</th>
                        <th className="pb-2.5 text-center font-semibold">Correct rate</th>
                        <th className="pb-2.5 text-center font-semibold">Attempt accuracy</th>
                        <th className="pb-2.5 text-center font-semibold">Net marks</th>
                        <th className="pb-2.5 text-center font-semibold">Timing</th>
                        <th className="pb-2.5 text-right font-semibold">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {shownHistory.map((item) => (
                        <tr key={item.id} className="transition-colors hover:bg-muted/30">
                          <td className="py-2.5 text-muted-foreground">
                            <div>{item.dateLabel}</div>
                            {item.timeLabel && <div className="text-[10px]">{item.timeLabel}</div>}
                          </td>
                          <td className="py-2.5">
                            <div className="font-medium text-foreground">
                              {item.year ? `${examLabel} ${item.year}${item.paper ? ` ${item.paper}` : ""}` : MODE_LABELS[item.mode] || item.mode}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {MODE_LABELS[item.mode] || item.mode} · {item.loadedQuestions} question{item.loadedQuestions === 1 ? "" : "s"}
                              {item.marksToAll > 0 ? ` · ${item.marksToAll} MTA` : ""}
                            </div>
                          </td>
                          <td className="py-2.5 text-center tabular-nums">{item.gradedQuestions}</td>
                          <td className="py-2.5 text-center font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">{item.correct}</td>
                          <td className="py-2.5 text-center tabular-nums text-muted-foreground">{item.skipped}</td>
                          <td className="py-2.5 text-center">
                            <span className="font-semibold tabular-nums">{formatRate(item.correctRate)}</span>
                          </td>
                          <td className="py-2.5 text-center tabular-nums">{formatRate(item.attemptAccuracy)}</td>
                          <td className="py-2.5 text-center font-bold tabular-nums">
                            {formatNumber(item.netMarks)}
                            <span className="font-normal text-muted-foreground"> / {formatNumber(item.maximumMarks)}</span>
                          </td>
                          <td className="py-2.5 text-center text-muted-foreground">
                            {item.timingAvailable ? formatTime(item.timingSeconds) : "Not recorded"}
                          </td>
                          <td className="py-2.5 text-right">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" asChild>
                              <Link href={`/result/${item.id}`}>
                                View
                                <ArrowRight className="ml-1 h-3 w-3" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {hasMoreHistory && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleHistory((current) => current + 20)}
                  >
                    Show 20 more tests
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="rounded-xl border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Cumulative correct rate
                </CardTitle>
                <CardDescription className="text-xs">
                  Running question-weighted correct rate over completed tests, in timestamp order.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cumulativeProgress.length < 2 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Complete at least 2 scored tests to see this trajectory.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={cumulativeProgress} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} className="text-muted-foreground" tickFormatter={(value: number) => `${value}%`} />
                      <Tooltip formatter={(value) => [`${value}%`, "Cumulative correct rate"]} contentStyle={chartTooltipStyle} />
                      <Line type="monotone" dataKey="avgScore" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Weekly correct rate
                </CardTitle>
                <CardDescription className="text-xs">
                  Question-weighted correct rate for each calendar week. Weeks are ordered by their real start date.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {weeklyTrend.length < 2 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Complete scored tests across multiple weeks to see this trend.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weeklyTrend} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} className="text-muted-foreground" tickFormatter={(value: number) => `${value}%`} />
                      <Tooltip formatter={(value) => [`${value}%`, "Weekly correct rate"]} contentStyle={chartTooltipStyle} />
                      <Bar dataKey="avgScore" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-xl border">
            <CardContent className="p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Per-test variance</h4>
                    <p className="text-xs text-muted-foreground">
                      Standard deviation of per-test correct rates: {consistencyScore} percentage points. Lower means more consistent practice results; this is not a rank prediction.
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "px-3 py-1 text-xs font-semibold",
                    consistencyScore <= 10
                      ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : consistencyScore <= 20
                        ? "border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        : "border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
                  )}
                >
                  {consistencyScore <= 10 ? "Low variance" : consistencyScore <= 20 ? "Moderate variance" : "High variance"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Performance by source year</CardTitle>
              <CardDescription className="text-xs">
                Question-weighted results within each source paper year. Years without a source year are grouped as mixed/custom.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {yearWise.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No year-specific tests taken yet.</p>
              ) : (
                <div className="overflow-x-auto [scrollbar-width:thin]">
                  <table className="w-full min-w-[520px] text-xs">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2.5 font-semibold">Source year</th>
                        <th className="pb-2.5 text-center font-semibold">Tests</th>
                        <th className="pb-2.5 text-center font-semibold">Graded</th>
                        <th className="pb-2.5 text-center font-semibold">Correct rate</th>
                        <th className="pb-2.5 text-center font-semibold">Net marks</th>
                        <th className="pb-2.5 text-center font-semibold">Net mark rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {yearWise.map((item) => (
                        <tr key={item.year} className="transition-colors hover:bg-muted/30">
                          <td className="py-2.5 font-bold text-foreground">
                            {item.year === 0 ? "Mixed / custom" : `${examLabel} ${item.year}`}
                          </td>
                          <td className="py-2.5 text-center tabular-nums text-muted-foreground">{item.tests}</td>
                          <td className="py-2.5 text-center tabular-nums text-muted-foreground">{item.graded}</td>
                          <td className="py-2.5 text-center font-semibold tabular-nums">{formatRate(item.correctRate)}</td>
                          <td className="py-2.5 text-center font-semibold tabular-nums">{formatNumber(item.netMarks)} / {formatNumber(item.maximumMarks)}</td>
                          <td className="py-2.5 text-center font-semibold tabular-nums">{formatRate(item.netMarkRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Minus className="h-4 w-4 text-muted-foreground" />
                What is not shown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <p>No GATE score, rank, cutoff, or exam-readiness estimate is calculated anywhere on this page.</p>
              <p>No per-question speed analysis is shown unless per-question timing has actually been recorded. Session elapsed time is not a substitute for question-level time.</p>
              <p>No historical result is silently truncated. The server reads completed tests, answers, and question metadata in pages; the table shows 20 rows at a time and tells you how many exist.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
