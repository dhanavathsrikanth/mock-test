"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  FileQuestion,
  Target,
  Flame,
  Clock,
  Zap,
  Turtle,
  BookOpen,
  ArrowRight,
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
  Cell,
  ScatterChart,
  Scatter,
  ReferenceLine,
  Legend,
} from "recharts";
import { Activity, Brain, TrendingUp, BarChart3, CalendarDays } from "lucide-react";

interface ScoreTrendItem {
  date: string;
  score: number;
}

interface SubjectAccuracyItem {
  subjectId: string;
  name: string;
  accuracy: number;
  totalQuestions: number;
}

interface TimeAccuracyPoint {
  timePerQ: number;
  score: number;
}

interface WeeklyTrendItem {
  week: string;
  avgScore: number;
}

interface FocusRecommendation {
  name: string;
  accuracy: number;
  totalQuestions: number;
  focusScore: number;
}

interface CumulativePoint {
  label: string;
  avgScore: number;
}

interface WeakTopic {
  subjectId: string;
  name: string;
  accuracy: number;
}

interface YearWiseItem {
  year: number;
  tests: number;
  avgScore: number;
  bestScore: number;
}

interface AnalyticsContentProps {
  totalTests: number;
  totalQuestions?: number;
  overallAccuracy?: number;
  studyStreak?: number;
  scoreTrend?: ScoreTrendItem[];
  subjectAccuracy?: SubjectAccuracyItem[];
  weakTopics?: WeakTopic[];
  avgTimePerQuestion?: number;
  fastestTest?: number;
  slowestTest?: number;
  yearWise?: YearWiseItem[];
  timeAccuracyData?: TimeAccuracyPoint[];
  weeklyTrend?: WeeklyTrendItem[];
  consistencyScore?: number;
  focusRecommendations?: FocusRecommendation[];
  cumulativeProgress?: CumulativePoint[];
  streakData?: { date: string; count: number }[][];
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

const chartTooltipStyle = {
  borderRadius: "8px",
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--background))",
};

// ----------------------------------------------------------------
// Empty state
// ----------------------------------------------------------------
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <BookOpen className="h-12 w-12 text-muted-foreground" />
      <div className="text-center">
        <h2 className="text-lg font-semibold">No tests yet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete your first test to see analytics here
        </p>
      </div>
      <Button asChild>
        <Link href="/test/select">
          <ClipboardList className="h-4 w-4" />
          Take your first test
        </Link>
      </Button>
    </div>
  );
}

// ----------------------------------------------------------------
// Main component
// ----------------------------------------------------------------
export function AnalyticsContent({
  totalTests,
  totalQuestions = 0,
  overallAccuracy = 0,
  studyStreak = 0,
  scoreTrend = [],
  subjectAccuracy = [],
  weakTopics = [],
  avgTimePerQuestion = 0,
  fastestTest = 0,
  slowestTest = 0,
  yearWise = [],
  timeAccuracyData = [],
  weeklyTrend = [],
  consistencyScore = 0,
  focusRecommendations = [],
  cumulativeProgress = [],
  streakData = [],
}: AnalyticsContentProps) {
  if (totalTests === 0) return <EmptyState />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track your performance across all tests
        </p>
      </div>

      {/* 1. Overall Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Tests
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalTests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Questions
            </CardTitle>
            <FileQuestion className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalQuestions}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Accuracy
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {overallAccuracy}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Study Streak
            </CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {studyStreak} day{studyStreak !== 1 ? "s" : ""}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Score Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Score Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {scoreTrend.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Complete more tests to see your score trend
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={scoreTrend}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Score"]}
                  contentStyle={chartTooltipStyle}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 3. Subject Accuracy */}
      <Card>
        <CardHeader>
          <CardTitle>Subject-wise Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          {subjectAccuracy.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No subject data available yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={subjectAccuracy}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Accuracy"]}
                  contentStyle={chartTooltipStyle}
                />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                  {subjectAccuracy.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.accuracy >= 70
                          ? "#22c55e"
                          : entry.accuracy >= 50
                          ? "#f97316"
                          : "#ef4444"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 4. Weak Topics */}
      <Card>
        <CardHeader>
          <CardTitle>Weak Topics</CardTitle>
        </CardHeader>
        <CardContent>
          {weakTopics.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No weak topics found. Keep up the great work!
            </p>
          ) : (
            <div className="divide-y">
              {weakTopics.map((t) => (
                <div
                  key={t.subjectId}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="ml-2 text-sm text-red-600 font-medium">
                      {t.accuracy}%
                    </span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/test/select">
                      Practice Now
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Time Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Time Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Avg Time / Question
                </p>
                <p className="text-lg font-semibold">
                  {formatTime(avgTimePerQuestion)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Fastest Test (avg)
                </p>
                <p className="text-lg font-semibold">
                  {fastestTest > 0
                    ? formatTime(fastestTest)
                    : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Turtle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Slowest Test (avg)
                </p>
                <p className="text-lg font-semibold">
                  {slowestTest > 0
                    ? formatTime(slowestTest)
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. Year-wise Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Year-wise Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {yearWise.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No year-specific data
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Year</th>
                    <th className="pb-2 font-medium text-center">
                      Tests Taken
                    </th>
                    <th className="pb-2 font-medium text-center">
                      Avg Score
                    </th>
                    <th className="pb-2 font-medium text-center">
                      Best Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {yearWise.map((y) => (
                    <tr key={y.year} className="border-b last:border-0">
                      <td className="py-2.5 font-medium">
                        {y.year === 0 ? "General" : y.year}
                      </td>
                      <td className="py-2.5 text-center">{y.tests}</td>
                      <td className="py-2.5 text-center">{y.avgScore}%</td>
                      <td className="py-2.5 text-center font-medium">
                        {y.bestScore}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── ADVANCED ANALYTICS ────────────────────────────────── */}

      {/* A. Time vs Accuracy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            Time vs Accuracy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeAccuracyData.length < 2 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Complete at least 2 tests to see this chart
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="timePerQ"
                  name="Time / Q"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  label={{
                    value: "Seconds per question",
                    position: "bottom",
                    style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                  }}
                />
                <YAxis
                  dataKey="score"
                  name="Score"
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(value) => [`${value}`, ""]}
                  contentStyle={chartTooltipStyle}
                  labelFormatter={(label) => `${label}s per question`}
                />
                <Scatter
                  data={timeAccuracyData}
                  fill="hsl(var(--primary))"
                  opacity={0.7}
                />
                <ReferenceLine
                  y={overallAccuracy}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  label={{
                    value: "Avg",
                    position: "right",
                    style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* B. Weekly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            Weekly Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyTrend.length < 2 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Complete tests across multiple weeks to see your trend
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={weeklyTrend}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Avg Score"]}
                  contentStyle={chartTooltipStyle}
                />
                <Bar
                  dataKey="avgScore"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* C. Consistency Score + Cumulative Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-muted-foreground" />
              Consistency Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalTests < 2 ? (
              <p className="text-muted-foreground text-sm py-4">
                Complete at least 2 tests to calculate consistency
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold">{consistencyScore}</div>
                  <div className="text-sm text-muted-foreground">
                    <p>Std deviation of your scores</p>
                    <p className="mt-1">
                      {consistencyScore <= 10
                        ? "Very consistent 🔒"
                        : consistencyScore <= 20
                        ? "Moderately consistent 📊"
                        : "Highly variable 📈"}
                    </p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, 100 - consistencyScore)}%`,
                      background:
                        consistencyScore <= 10
                          ? "#22c55e"
                          : consistencyScore <= 20
                          ? "#f97316"
                          : "#ef4444",
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              Cumulative Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cumulativeProgress.length < 2 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                Complete at least 2 tests to see your progress
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={cumulativeProgress}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${value}%`,
                      "Running Avg",
                    ]}
                    contentStyle={chartTooltipStyle}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgScore"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* D. Focus Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" />
            Focus Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {focusRecommendations.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No specific areas need focus right now. Great job!
            </p>
          ) : (
            <div className="divide-y">
              {focusRecommendations.map((r, i) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground w-5">
                      #{i + 1}
                    </span>
                    <div>
                      <span className="text-sm font-medium">{r.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {r.totalQuestions} Qs · {r.accuracy}%
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/test/select">
                      Practice
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* E. Streak History — Calendar Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            Streak History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {streakData.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Complete some tests to see your study calendar
            </p>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="inline-flex gap-0.5">
                {streakData.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-0.5">
                    {week.map((day) => {
                      const level =
                        day.count === 0
                          ? "bg-muted/40"
                          : day.count === 1
                          ? "bg-green-300 dark:bg-green-800"
                          : day.count === 2
                          ? "bg-green-500"
                          : "bg-green-700";
                      return (
                        <div
                          key={day.date}
                          className={`w-3 h-3 rounded-sm ${level}`}
                          title={`${day.date}: ${day.count} test${
                            day.count !== 1 ? "s" : ""
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-0.5">
                  <div className="w-3 h-3 rounded-sm bg-muted/40" />
                  <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-800" />
                  <div className="w-3 h-3 rounded-sm bg-green-500" />
                  <div className="w-3 h-3 rounded-sm bg-green-700" />
                </div>
                <span>More</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
