"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, Users, Target, Zap, Clock, CheckCircle2, BookOpen,
  UserPlus, Activity, Flame, Award, AlertCircle, X,
} from "lucide-react";
import { MathText } from "@/components/MathText";

// ─── Types ───────────────────────────────────────────────────────

interface Stats {
  totalUsers: number; newThisWeek: number; newThisMonth: number;
  activeToday: number; activeWeek: number; activeMonth: number; usersWithActivity: number; churned: number;
  retentionRate: number;   avgStreak: number; avgQuestionsPerTest: number; avgDuration: number;
  completionRate: number; abandonmentRate: number;
  totalTests: number; totalSessions: number;
  mostPopularSubject: string; mostPopularYear: string; mostPopularMode: string;
  dailyParticipation: number; dailyQAvg: number;
  srsReviewedPerDay: number; srsAvg: number; totalXPEarned30d: number;
  deadContent: number; explanationPct: number;
  totalQuestionsCount: number; questionsWithExplanation: number; explanationCoverage: number;
  totalAnswers: number; uniqueQuestionsAnswered: number; totalCorrectQ: number; totalWrongQ: number;
  totalSkippedCount: number; globalAccuracy: number; avgAttemptsPerQ: number; totalBookmarkedUnique: number;
  pendingReports: number; resolvedReports: number; rejectedReports: number; totalReports: number; resolutionRate: number;
  avgResolutionHours: number; resolutionCount: number;
  sla24hPct: number; sla72hPct: number;
  totalBadges: number; badgeEarners: number; avgBadgesPerUser: number; topBadgeType: string | null;
}

interface TimelinePoint { date: string; signups?: number; tests?: number; xp?: number; count?: number; }

// ─── Colors ──────────────────────────────────────────────────────

const PIE_COLORS = ["hsl(var(--primary))", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

const ICON_COLORS: Record<string, string> = {
  blue: "#3b82f6", green: "#22c55e", purple: "#8b5cf6", red: "#ef4444",
  indigo: "#6366f1", orange: "#f97316", emerald: "#10b981", cyan: "#06b6d4", yellow: "#eab308", gray: "#6b7280",
};

// ─── Sub-components ──────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <Icon className="h-4 w-4" color={ICON_COLORS[color] || "#888"} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border rounded-xl p-5 ${className || ""}`}>
      <h2 className="font-semibold text-sm mb-4">{title}</h2>
      {children}
    </div>
  );
}

function HeatmapCell({ value, max }: { value: number; max: number }) {
  const intensity = max > 0 ? value / max : 0;
  const bg = intensity === 0 ? "bg-muted/30" : intensity < 0.25 ? "bg-primary/20" : intensity < 0.5 ? "bg-primary/40" : intensity < 0.75 ? "bg-primary/60" : "bg-primary/80";
  return (
    <div className={`w-full aspect-square rounded-sm ${bg}`} title={`${value} sessions`} />
  );
}

// ─── Main Component ──────────────────────────────────────────────

interface AnalyticsClientProps {
  stats: Stats;
  signupTimeline: TimelinePoint[];
  cumulativeSignups: TimelinePoint[];
  signupWeekTimeline: { name: string; count: number }[];
  signupsByDOW: number[];
  streakBuckets: { zero: number; oneToThree: number; fourToSeven: number; eightToFourteen: number; fifteenPlus: number };
  testsTimeline: TimelinePoint[];
  xpTimeline: TimelinePoint[];
  reportsTimeline: TimelinePoint[];
  hourDayMatrix: number[][];
  dayOfWeekTotals: number[];
  subjectDistribution: { name: string; count: number }[];
  modeDistribution: { name: string; count: number }[];
  weekTimeline: { name: string; count: number }[];
  hardestQs: any[];
  easiestQs: any[];
  mostSkipped: any[];
  mostBookmarked: any[];
  subjectAccuracyTable: any[];
  difficultyBuckets: { zeroToTwenty: number; twentyToForty: number; fortyToSixty: number; sixtyToEighty: number; eightyToHundred: number };
  topUsers: any[];
  badgeDistribution: Record<string, number>;
  correctionBySubject: Record<string, number>;
  correctionByField: Record<string, number>;
}

export function AnalyticsClient({
  stats, signupTimeline, cumulativeSignups, signupWeekTimeline, signupsByDOW, streakBuckets,
  testsTimeline, xpTimeline, reportsTimeline,
  hourDayMatrix, dayOfWeekTotals, subjectDistribution, modeDistribution, weekTimeline,
  hardestQs, easiestQs, mostSkipped, mostBookmarked,
  subjectAccuracyTable, difficultyBuckets,
  topUsers, badgeDistribution, correctionBySubject, correctionByField,
}: AnalyticsClientProps) {
  const heatmapMax = Math.max(...hourDayMatrix.flat(), 1);
  const badgeData = Object.entries(badgeDistribution).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));
  const correctionData = Object.entries(correctionBySubject).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const correctionFieldData = Object.entries(correctionByField)
    .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
    .sort((a, b) => b.value - a.value);

  const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-8">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform-wide performance and engagement metrics</p>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 1: USER GROWTH
          ════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Users className="h-5 w-5" /> User Growth</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard icon={Users} label="Total Users" value={stats.totalUsers.toLocaleString()} color="blue" />
          <StatCard icon={UserPlus} label="New This Week" value={stats.newThisWeek} color="cyan" />
          <StatCard icon={UserPlus} label="New This Month" value={stats.newThisMonth} color="indigo" />
          <StatCard icon={Activity} label="Active Today" value={stats.activeToday} sub={`${stats.activeToday > 0 ? Math.round((stats.activeToday / stats.totalUsers) * 100) : 0}% of users`} color="green" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard icon={TrendingUp} label="Active This Week" value={stats.activeWeek} sub={`${stats.activeWeek > 0 ? Math.round((stats.activeWeek / stats.totalUsers) * 100) : 0}% of users`} color="purple" />
          <StatCard icon={Activity} label="Active This Month" value={stats.activeMonth} sub={`${stats.activeMonth > 0 ? Math.round((stats.activeMonth / stats.totalUsers) * 100) : 0}% of users`} color="emerald" />
          <StatCard icon={AlertCircle} label="Churned (30d+)" value={stats.churned} sub={`${stats.churned > 0 ? Math.round((stats.churned / stats.totalUsers) * 100) : 0}% of users`} color="red" />
          <StatCard icon={Flame} label="Avg Streak" value={stats.avgStreak} color="orange" />
        </div>
        <div className="grid lg:grid-cols-3 gap-4 mb-4">
          <ChartCard title="New Signups per Day (30d)">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={signupTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="signups" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Cumulative Signups (30d)">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cumulativeSignups}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="total" stroke="#22c55e" fill="#22c55e / 0.1" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Retention">
            <div className="flex items-center justify-center h-[220px]">
              <div className="text-center space-y-3">
                <div className="relative w-28 h-28 mx-auto">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                      strokeDasharray={`${(stats.retentionRate / 100) * 339.292} 339.292`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{stats.retentionRate}%</span>
                </div>
                <p className="text-xs text-muted-foreground">Week-1 users still active at week-4</p>
              </div>
            </div>
          </ChartCard>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard title="Weekly Signup Trend">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={signupWeekTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Streak Distribution">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[
                { name: "0 days", value: streakBuckets.zero },
                { name: "1–3", value: streakBuckets.oneToThree },
                { name: "4–7", value: streakBuckets.fourToSeven },
                { name: "8–14", value: streakBuckets.eightToFourteen },
                { name: "15+", value: streakBuckets.fifteenPlus },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 2: TEST ACTIVITY (Advanced)
          ════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Target className="h-5 w-5" /> Test Activity</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard icon={BookOpen} label="Tests Taken (30d)" value={stats.totalTests} sub={`${stats.totalSessions} total sessions`} color="indigo" />
          <StatCard icon={Target} label="Avg Questions/Test" value={stats.avgQuestionsPerTest} color="orange" />
          <StatCard icon={CheckCircle2} label="Completion Rate" value={`${stats.completionRate}%`} sub={`${stats.abandonmentRate}% abandoned`} color="emerald" />
          <StatCard icon={Clock} label="Avg Duration" value={`${stats.avgDuration}m`} color="cyan" />
        </div>

        {/* Detailed stat row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <StatCard icon={TrendingUp} label="Top Subject" value={stats.mostPopularSubject} color="blue" />
          <StatCard icon={TrendingUp} label="Top Year" value={stats.mostPopularYear} color="purple" />
          <StatCard icon={TrendingUp} label="Top Mode" value={stats.mostPopularMode.replace(/_/g, " ")} color="orange" />
        </div>

        {/* Charts row 1: Daily + Weekly */}
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <ChartCard title="Tests per Day (30d)">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={testsTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="tests" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Weekly Test Trend">
            {weekTimeline.length === 0 || weekTimeline.every(w => w.count === 0) ? (
              <div className="text-center text-xs text-muted-foreground py-8">No tests this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weekTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Charts row 2: Subject + Mode distribution */}
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <ChartCard title="Tests by Subject">
            {subjectDistribution.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8">No data</div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {subjectDistribution.map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="text-xs w-24 truncate shrink-0">{s.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(s.count / subjectDistribution[0].count) * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono w-6 text-right">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
          <ChartCard title="Tests by Mode">
            {modeDistribution.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8">No data</div>
            ) : (
              <div className="flex items-center justify-center h-[200px] gap-6">
                {modeDistribution.map((m, i) => {
                  const total = modeDistribution.reduce((s, d) => s + d.count, 0);
                  const pct = total > 0 ? Math.round((m.count / total) * 100) : 0;
                  return (
                    <div key={m.name} className="text-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2 ${
                        i === 0 ? "bg-primary/10 text-primary" :
                        i === 1 ? "bg-orange-50 dark:bg-orange-950/30 text-orange-500" :
                        "bg-blue-50 dark:bg-blue-950/30 text-blue-500"
                      }`}>
                        <span className="text-xl font-bold">{pct}%</span>
                      </div>
                      <p className="text-xs font-medium capitalize">{m.name.replace(/_/g, " ")}</p>
                      <p className="text-[10px] text-muted-foreground">{m.count} tests</p>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>
        </div>

        {/* Peak Usage Heatmap + Day of Week */}
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <ChartCard title="Peak Usage Hours">
            <div className="overflow-x-auto">
              <div className="inline-flex flex-col gap-0.5 min-w-[500px]">
                <div className="flex gap-0.5 pl-10">
                  {HOURS.map((h, i) => (
                    <div key={i} className="flex-1 text-[8px] text-muted-foreground text-center truncate">{i % 3 === 0 ? h : ""}</div>
                  ))}
                </div>
                {hourDayMatrix.map((row, dow) => (
                  <div key={dow} className="flex gap-0.5 items-center">
                    <span className="w-10 text-[10px] text-muted-foreground shrink-0">{DAYS[dow]}</span>
                    {row.map((val, hour) => (
                      <div key={hour} className="flex-1">
                        <HeatmapCell value={val} max={heatmapMax} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-0.5">
                {[0, 0.2, 0.4, 0.6, 0.8].map((v) => (
                  <div key={v} className="w-4 h-4 rounded-sm" style={{ background: v === 0 ? "hsl(var(--muted) / 0.3)" : `hsl(var(--primary) / ${v + 0.2})` }} />
                ))}
              </div>
              <span>More</span>
            </div>
          </ChartCard>

          {/* Day of Week Breakdown */}
          <ChartCard title="Tests by Day of Week">
            {dayOfWeekTotals.every(d => d === 0) ? (
              <div className="text-center text-xs text-muted-foreground py-8">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={DAYS.map((day, i) => ({ day, count: dayOfWeekTotals[i] }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 3: QUESTION ANALYTICS
          ════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5" /> Question Analytics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard icon={BookOpen} label="Total Questions" value={stats.totalQuestionsCount} color="blue" />
          <StatCard icon={CheckCircle2} label="Global Accuracy" value={`${stats.globalAccuracy}%`} sub={`${stats.totalCorrectQ} of ${stats.totalAnswers} correct`} color="green" />
          <StatCard icon={BookOpen} label="Unique Qs Answered" value={stats.uniqueQuestionsAnswered} sub={`~${stats.avgAttemptsPerQ} attempts/q`} color="indigo" />
          <StatCard icon={BookOpen} label="Avg Attempts / Q" value={stats.avgAttemptsPerQ} sub={`${stats.totalAnswers} total answers`} color="cyan" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard icon={CheckCircle2} label="With Explanation" value={stats.questionsWithExplanation} sub={`${stats.explanationCoverage}% coverage`} color="emerald" />
          <StatCard icon={BookOpen} label="Bookmarked Qs" value={stats.totalBookmarkedUnique} color="purple" />
          <StatCard icon={AlertCircle} label="Dead Content" value={stats.deadContent} sub="questions with no attempts" color="red" />
          <StatCard icon={BookOpen} label="Skipped Answers" value={stats.totalSkippedCount} color="orange" />
        </div>
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <ChartCard title="Difficulty Distribution (Q Accuracy Buckets)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[
                { name: "0–20%", count: difficultyBuckets.zeroToTwenty },
                { name: "20–40%", count: difficultyBuckets.twentyToForty },
                { name: "40–60%", count: difficultyBuckets.fortyToSixty },
                { name: "60–80%", count: difficultyBuckets.sixtyToEighty },
                { name: "80–100%", count: difficultyBuckets.eightyToHundred },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Answer Distribution">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={[
                  { name: "Correct", value: stats.totalCorrectQ },
                  { name: "Incorrect", value: stats.totalWrongQ },
                  { name: "Skipped", value: stats.totalSkippedCount },
                ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
          {/* Hardest Questions */}
          <div className="border rounded-xl">
            <div className="px-4 py-3 border-b bg-muted/30"><h3 className="font-semibold text-xs text-red-600">Hardest Questions</h3></div>
            {hardestQs.length === 0 ? <div className="px-4 py-6 text-center text-xs text-muted-foreground">Not enough data</div> : (
              <div className="divide-y">
                {hardestQs.map((q, i) => (
                  <div key={q.id} className="px-4 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate flex-1">{q.text ? <MathText text={q.text} /> : `Question ${i + 1}`}</span>
                      <span className="text-xs font-bold text-red-500 shrink-0">{q.accuracy}%</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{q.subject} · {q.attempts} attempts</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Easiest Questions */}
          <div className="border rounded-xl">
            <div className="px-4 py-3 border-b bg-muted/30"><h3 className="font-semibold text-xs text-green-600">Easiest Questions</h3></div>
            {easiestQs.length === 0 ? <div className="px-4 py-6 text-center text-xs text-muted-foreground">Not enough data</div> : (
              <div className="divide-y">
                {easiestQs.map((q, i) => (
                  <div key={q.id} className="px-4 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate flex-1">{q.text ? <MathText text={q.text} /> : `Question ${i + 1}`}</span>
                      <span className="text-xs font-bold text-green-500 shrink-0">{q.accuracy}%</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{q.subject} · {q.attempts} attempts</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most Skipped */}
          <div className="border rounded-xl">
            <div className="px-4 py-3 border-b bg-muted/30"><h3 className="font-semibold text-xs text-orange-600">Most Skipped</h3></div>
            {mostSkipped.length === 0 ? <div className="px-4 py-6 text-center text-xs text-muted-foreground">Not enough data</div> : (
              <div className="divide-y">
                {mostSkipped.map((q, i) => (
                  <div key={i} className="px-4 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate flex-1">{q.text ? <MathText text={q.text} /> : `Question ${i + 1}`}</span>
                      <span className="text-xs font-bold text-orange-500 shrink-0">{q.count} skips</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{q.subject}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most Bookmarked */}
          <div className="border rounded-xl">
            <div className="px-4 py-3 border-b bg-muted/30"><h3 className="font-semibold text-xs text-purple-600">Most Bookmarked</h3></div>
            {mostBookmarked.length === 0 ? <div className="px-4 py-6 text-center text-xs text-muted-foreground">No bookmarks</div> : (
              <div className="divide-y">
                {mostBookmarked.map((q, i) => (
                  <div key={q.id} className="px-4 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate flex-1">{q.text ? <MathText text={q.text} /> : `Question ${q.id.slice(0, 8)}...`}</span>
                      <span className="text-xs font-bold text-purple-500 shrink-0">{q.count} bookmarks</span>
                    </div>
                    {q.subject && <div className="text-[10px] text-muted-foreground">{q.subject}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subject-wise mini */}
          <div className="border rounded-xl">
            <div className="px-4 py-3 border-b bg-muted/30"><h3 className="font-semibold text-xs">Top Subject Accuracy</h3></div>
            {subjectAccuracyTable.length === 0 ? <div className="px-4 py-6 text-center text-xs text-muted-foreground">No data</div> : (
              <div className="divide-y max-h-[180px] overflow-y-auto">
                {subjectAccuracyTable.slice(0, 6).map((s) => (
                  <div key={s.name} className="px-4 py-2 flex items-center justify-between">
                    <span className="text-xs truncate">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${s.accuracy}%` }} />
                      </div>
                      <span className="text-xs font-medium w-10 text-right">{s.accuracy}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Questions answered per subject (count) */}
          <div className="border rounded-xl">
            <div className="px-4 py-3 border-b bg-muted/30"><h3 className="font-semibold text-xs">Answers by Subject</h3></div>
            {subjectAccuracyTable.length === 0 ? <div className="px-4 py-6 text-center text-xs text-muted-foreground">No data</div> : (
              <div className="divide-y max-h-[180px] overflow-y-auto">
                {subjectAccuracyTable.slice(0, 6).map((s) => (
                  <div key={s.name} className="px-4 py-2 flex items-center justify-between">
                    <span className="text-xs truncate">{s.name}</span>
                    <span className="text-xs font-medium">{s.attempts.toLocaleString()} answers</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subject-wise full table */}
        {subjectAccuracyTable.length > 0 && (
          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30"><h3 className="font-semibold text-sm">Subject-Wise Global Accuracy</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Subject</th>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">Attempts</th>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">Accuracy</th>
                    <th className="px-4 py-3 w-32"><span className="sr-only">Bar</span></th>
                  </tr>
                </thead>
                <tbody>
                  {subjectAccuracyTable.map((s) => (
                    <tr key={s.name} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-xs">{s.name}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{s.attempts}</td>
                      <td className="px-4 py-3 text-right text-xs font-medium">{s.accuracy}%</td>
                      <td className="px-4 py-3">
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s.accuracy}%`, background: s.accuracy >= 60 ? "#22c55e" : s.accuracy >= 40 ? "#f59e0b" : "#ef4444" }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 4: ENGAGEMENT
          ════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Activity className="h-5 w-5" /> Engagement</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard icon={Flame} label="Avg Streak Length" value={`${stats.avgStreak} days`} color="orange" />
          <StatCard icon={CheckCircle2} label="Daily Questions (30d)" value={stats.dailyParticipation} sub={`~${stats.dailyQAvg}/day`} color="green" />
          <StatCard icon={BookOpen} label="SRS Reviews (30d)" value={stats.srsReviewedPerDay} sub={`~${stats.srsAvg}/day`} color="indigo" />
          <StatCard icon={Award} label="Total XP (30d)" value={stats.totalXPEarned30d.toLocaleString()} color="yellow" />
        </div>
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <ChartCard title="XP Earned per Day (30d)">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={xpTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="xp" stroke="#22c55e" fill="#22c55e20" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top Users */}
          <div className="border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-4">Top 10 Users by XP</h2>
            {topUsers.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8">No data</div>
            ) : (
              <div className="space-y-2">
                {topUsers.map((u: any, i: number) => (
                  <div key={u.userId} className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === 0 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600" :
                      i === 1 ? "bg-gray-100 dark:bg-gray-800 text-gray-500" :
                      i === 2 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600" :
                      "bg-muted text-muted-foreground"
                    }`}>{i + 1}</span>
                    <span className="text-sm flex-1 truncate">{u.name}</span>
                    <span className="text-sm font-mono font-medium">{u.xp.toLocaleString()} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Badge Distribution - Advanced */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard icon={Award} label="Total Badges Earned" value={stats.totalBadges} color="yellow" />
          <StatCard icon={Users} label="Badge Earners" value={stats.badgeEarners} sub={stats.badgeEarners > 0 ? `${Math.round((stats.badgeEarners / stats.totalUsers) * 100)}% of users` : undefined} color="purple" />
          <StatCard icon={Award} label="Avg Badges per User" value={stats.avgBadgesPerUser} color="blue" />
          <StatCard icon={TrendingUp} label="Most Common Badge" value={stats.topBadgeType ? stats.topBadgeType.replace(/_/g, " ") : "N/A"} color="green" />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard title="Badge Distribution">
            {badgeData.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8">No badges earned yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={badgeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}>
                    {badgeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Badge Type Breakdown">
            {badgeData.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8">No badges earned yet</div>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {badgeData.map((b) => {
                  const pct = Math.round((b.value / stats.totalBadges) * 100);
                  return (
                    <div key={b.name} className="flex items-center gap-2">
                      <span className="text-xs w-28 truncate shrink-0">{b.name}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-mono w-12 text-right">{b.value} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 5: CONTENT QUALITY (Advanced)
          ════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Award className="h-5 w-5" /> Content Quality</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard icon={CheckCircle2} label="Questions with Explanations" value={`${stats.explanationPct}%`} sub={`${stats.questionsWithExplanation} of ${stats.totalQuestionsCount}`} color="green" />
          <StatCard icon={BookOpen} label="Without Explanation" value={stats.totalQuestionsCount - stats.questionsWithExplanation} color="red" />
          <StatCard icon={AlertCircle} label="Pending Reports" value={stats.pendingReports} color="red" />
          <StatCard icon={CheckCircle2} label="Resolved Reports" value={stats.resolvedReports} color="green" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard icon={X} label="Rejected Reports" value={stats.rejectedReports || 0} color="gray" />
          <StatCard icon={Clock} label="Avg Resolution Time" value={stats.avgResolutionHours > 0 ? `${stats.avgResolutionHours}h` : "—"} sub={stats.resolutionCount > 0 ? `${stats.resolutionCount} resolved` : undefined} color="blue" />
          <StatCard icon={CheckCircle2} label="SLA 24h" value={`${stats.sla24hPct}%`} color="emerald" />
          <StatCard icon={TrendingUp} label="Resolution Rate" value={stats.resolutionRate > 0 ? `${stats.resolutionRate}%` : "—"} sub={`${stats.resolvedReports + stats.rejectedReports} processed`} color="purple" />
        </div>
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
          {/* Reports per Day */}
          <ChartCard title="Reports per Day (30d)">
            {reportsTimeline.every(d => d.count === 0) ? (
              <div className="text-center text-xs text-muted-foreground py-8">No reports in last 30 days</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={reportsTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Reports by Status */}
          <ChartCard title="Reports by Status">
            {stats.totalReports === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8">No reports</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={[
                    { name: "Pending", value: stats.pendingReports },
                    { name: "Resolved", value: stats.resolvedReports },
                    { name: "Rejected", value: stats.rejectedReports },
                  ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    <Cell fill="#ef4444" />
                    <Cell fill="#22c55e" />
                    <Cell fill="#6b7280" />
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Question Coverage */}
          <ChartCard title="Question Explanation Coverage">
            {stats.totalQuestionsCount === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8">No questions</div>
            ) : (
              <div className="flex items-center justify-center h-[200px] gap-6">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl font-bold text-green-500">{stats.questionsWithExplanation}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">With Explanation</p>
                  <p className="text-[10px] text-muted-foreground">{stats.explanationPct}%</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl font-bold text-red-500">{stats.totalQuestionsCount - stats.questionsWithExplanation}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Without</p>
                  <p className="text-[10px] text-muted-foreground">{100 - stats.explanationPct}%</p>
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Correction Frequency by Subject */}
          <ChartCard title="Correction Frequency by Subject">
            {correctionData.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8">No corrections made</div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {correctionData.slice(0, 8).map((c) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <span className="text-xs w-24 truncate shrink-0">{c.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(c.value / correctionData[0].value) * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono w-6 text-right">{c.value}</span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          {/* Correction Breakdown by Field Type */}
          <ChartCard title="Correction Breakdown by Field Type">
            {correctionFieldData.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8">No corrections made</div>
            ) : (
              <div className="space-y-2">
                {correctionFieldData.map((c) => {
                  const pct = Math.round((c.value / correctionFieldData.reduce((s, d) => s + d.value, 0)) * 100);
                  return (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="text-xs w-28 truncate shrink-0 capitalize">{c.name.replace(/_/g, " ")}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-mono w-12 text-right">{c.value} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
