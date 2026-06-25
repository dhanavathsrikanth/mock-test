"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, Users, Target, Zap, Clock, CheckCircle2, BookOpen,
  UserPlus, Activity, Flame, Award, AlertCircle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────

interface Stats {
  totalUsers: number; activeToday: number; activeWeek: number; churned: number;
  retentionRate: number; avgStreak: number; avgQuestionsPerTest: number;
  completionRate: number; totalTests: number;
  mostPopularSubject: string; mostPopularYear: string; mostPopularMode: string;
  dailyParticipation: number; srsReviewedPerDay: number;
  deadContent: number; explanationPct: number;
  pendingReports: number; resolvedReports: number; avgResolutionHours: number;
}

interface TimelinePoint { date: string; signups?: number; tests?: number; xp?: number; }

// ─── Colors ──────────────────────────────────────────────────────

const PIE_COLORS = ["hsl(var(--primary))", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

// ─── Sub-components ──────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <Icon className={`h-4 w-4 text-${color}-500`} />
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
  testsTimeline: TimelinePoint[];
  xpTimeline: TimelinePoint[];
  hourDayMatrix: number[][];
  hardestQs: any[];
  easiestQs: any[];
  mostSkipped: any[];
  mostBookmarked: any[];
  subjectAccuracyTable: any[];
  topUsers: any[];
  badgeDistribution: Record<string, number>;
  correctionBySubject: Record<string, number>;
}

export function AnalyticsClient({
  stats, signupTimeline, testsTimeline, xpTimeline, hourDayMatrix,
  hardestQs, easiestQs, mostSkipped, mostBookmarked,
  subjectAccuracyTable, topUsers, badgeDistribution, correctionBySubject,
}: AnalyticsClientProps) {
  const heatmapMax = Math.max(...hourDayMatrix.flat(), 1);
  const badgeData = Object.entries(badgeDistribution).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));
  const correctionData = Object.entries(correctionBySubject).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

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
          <StatCard icon={Activity} label="Active Today" value={stats.activeToday} color="green" />
          <StatCard icon={TrendingUp} label="Active This Week" value={stats.activeWeek} sub={`${stats.activeWeek > 0 ? Math.round((stats.activeWeek / stats.totalUsers) * 100) : 0}% of users`} color="purple" />
          <StatCard icon={AlertCircle} label="Churned (30d+)" value={stats.churned} color="red" />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
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
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 2: TEST ACTIVITY
          ════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Target className="h-5 w-5" /> Test Activity</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard icon={BookOpen} label="Tests Taken (30d)" value={stats.totalTests} color="indigo" />
          <StatCard icon={Target} label="Avg Questions/Test" value={stats.avgQuestionsPerTest} color="orange" />
          <StatCard icon={CheckCircle2} label="Completion Rate" value={`${stats.completionRate}%`} color="emerald" />
          <StatCard icon={TrendingUp} label="Top Subject" value={stats.mostPopularSubject} color="cyan" />
        </div>
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
          <ChartCard title="Popular Choices">
            <div className="space-y-4 h-[200px] flex flex-col justify-center">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Most tested subject</span>
                <span className="text-sm font-semibold">{stats.mostPopularSubject}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Most common year</span>
                <span className="text-sm font-semibold">{stats.mostPopularYear}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Most used mode</span>
                <span className="text-sm font-semibold capitalize">{stats.mostPopularMode.replace(/_/g, " ")}</span>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Peak Usage Heatmap */}
        <ChartCard title="Peak Usage Hours (local time)">
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
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 3: QUESTION ANALYTICS
          ════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5" /> Question Analytics</h2>
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
          {/* Hardest Questions */}
          <div className="border rounded-xl">
            <div className="px-4 py-3 border-b bg-muted/30"><h3 className="font-semibold text-xs text-red-600">Hardest Questions</h3></div>
            {hardestQs.length === 0 ? <div className="px-4 py-6 text-center text-xs text-muted-foreground">Not enough data</div> : (
              <div className="divide-y">
                {hardestQs.map((q, i) => (
                  <div key={q.id} className="px-4 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate flex-1">{q.text || `Question ${i + 1}`}</span>
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
                      <span className="text-xs truncate flex-1">{q.text || `Question ${i + 1}`}</span>
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
                      <span className="text-xs truncate flex-1">{q.text || `Question ${i + 1}`}</span>
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
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Question {q.id.slice(0, 8)}...</span>
                      <span className="text-xs font-bold text-purple-500">{q.count} bookmarks</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dead Content */}
          <div className="border rounded-xl flex flex-col items-center justify-center p-6">
            <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-2xl font-bold">{stats.deadContent}</p>
            <p className="text-xs text-muted-foreground">Questions with no attempts (dead content)</p>
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
          <StatCard icon={Flame} label="Avg Streak Length" value={stats.avgStreak} color="orange" />
          <StatCard icon={CheckCircle2} label="Daily Q Participation (30d)" value={stats.dailyParticipation} color="green" />
          <StatCard icon={BookOpen} label="SRS Reviews (30d)" value={stats.srsReviewedPerDay} color="indigo" />
          <StatCard icon={Award} label="Badge Types" value={badgeData.length} color="yellow" />
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

        {/* Badge Distribution */}
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
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 5: CONTENT QUALITY
          ════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Award className="h-5 w-5" /> Content Quality</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard icon={CheckCircle2} label="Questions with Explanations" value={`${stats.explanationPct}%`} color="green" />
          <StatCard icon={AlertCircle} label="Pending Reports" value={stats.pendingReports} color="red" />
          <StatCard icon={CheckCircle2} label="Resolved Reports" value={stats.resolvedReports} color="green" />
          <StatCard icon={Clock} label="Avg Resolution Time" value={stats.avgResolutionHours > 0 ? `${stats.avgResolutionHours}h` : "—"} color="blue" />
        </div>

        {/* Reports Trend */}
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard title="Reports: Pending vs Resolved">
            <div className="flex items-center justify-center h-[200px] gap-8">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-red-500">{stats.pendingReports}</span>
                </div>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-green-500">{stats.resolvedReports}</span>
                </div>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </ChartCard>

          {/* Correction Frequency by Subject */}
          <ChartCard title="Correction Frequency by Subject">
            {correctionData.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8">No corrections made</div>
            ) : (
              <div className="space-y-2">
                {correctionData.map((c) => (
                  <div key={c.name} className="flex items-center justify-between">
                    <span className="text-xs truncate flex-1">{c.name}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(c.value / correctionData[0].value) * 100}%` }} />
                      </div>
                      <span className="text-xs font-mono w-6 text-right">{c.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
