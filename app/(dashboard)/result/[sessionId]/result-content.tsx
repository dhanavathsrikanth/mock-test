"use client";

import { formatMarks } from "@/lib/marking";
import { formatRate, type PacingSummary, type QuestionStats, type SessionTiming } from "@/lib/test-metrics";
import { ShareChallenge } from "@/components/challenges/ShareChallenge";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartTagPanel } from "@/components/smart-tags/SmartTagPanel";
import type { DiagnosticLoad } from "@/lib/smart-tags-server";
import {
  Check,
  X,
  Minus,
  Clock,
  ArrowLeft,
  Eye,
  Play,
  Target,
  AlertTriangle,
  RotateCcw,
  Info,
  BookOpen,
  Zap,
  Timer,
} from "lucide-react";

export interface QuestionTypeStats extends QuestionStats {
  type: "MCQ" | "MSQ" | "NAT";
}

export interface MarksTierStats extends QuestionStats {
  tier: 1 | 2;
}

export interface SubjectBreakdown extends QuestionStats {
  id: string;
  name: string;
  subjectId?: string | null;
}

export interface ResultContentProps {
  diagnostic?: DiagnosticLoad;
  diagnosticPanel?: ReactNode;
  marks?: { earned: number; deducted: number; maximum: number; net: number };
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  marksToAllCount?: number;
  gradedQuestionCount: number;
  attemptedCount: number;
  accuracy: number | null;
  correctRate: number | null;
  skippedMarks?: number;
  totalQuestions: number;
  timing: SessionTiming;
  hasQuestionTiming?: boolean;
  pacing?: PacingSummary;
  subjectBreakdown: SubjectBreakdown[];
  message: { title: string; subtitle: string; icon: string };
  sessionId: string;
  isSprint?: boolean;
  sourceYear?: number | null;
  sourcePaper?: string | null;
  examName?: string;
  streamName?: string | null;
  questionTypeBreakdown?: QuestionTypeStats[];
  marksTierBreakdown?: MarksTierStats[];
  dataCaveats?: string[];
}

function AnimatedScoreRing({
  value,
  maximum,
  percentage,
}: {
  value: number;
  maximum: number;
  percentage: number | null;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 50;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Number(current.toFixed(2)));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = Math.max(0, Math.min(100, percentage ?? 0));
  const offset = circumference - (safePercentage / 100) * circumference;

  return (
    <div
      className="relative mx-auto h-40 w-40 shrink-0"
      style={percentage != null && percentage >= 60 ? { boxShadow: "0 0 42px rgba(34, 197, 94, 0.35)" } : undefined}
    >
      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 120 120" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={(percentage ?? 0) >= 60 ? "hsl(142.1 76.2% 36.3%)" : (percentage ?? 0) >= 40 ? "hsl(43 74% 66%)" : "hsl(var(--primary))"}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl">
          {formatMarks(count)}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          / {formatMarks(maximum)} marks
        </span>
        <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {formatRate(percentage)} net mark rate
        </span>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function RateRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <strong className="font-semibold tabular-nums">{formatRate(value)}</strong>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }}
        />
      </div>
    </div>
  );
}

export function ResultContent({
  diagnosticPanel,
  diagnostic,
  marks,
  correctCount,
  wrongCount,
  skippedCount,
  marksToAllCount = 0,
  gradedQuestionCount,
  attemptedCount,
  accuracy,
  correctRate,
  skippedMarks = 0,
  totalQuestions,
  timing,
  hasQuestionTiming = false,
  pacing,
  subjectBreakdown,
  message,
  sessionId,
  sourceYear,
  sourcePaper,
  isSprint = false,
  examName = "GATE",
  streamName,
  questionTypeBreakdown = [],
  marksTierBreakdown = [],
  dataCaveats = [],
}: ResultContentProps) {
  const marksNet = marks ? marks.net : correctCount;
  const marksMax = marks ? marks.maximum : totalQuestions;
  const marksEarned = marks ? marks.earned : correctCount;
  const marksDeducted = marks ? marks.deducted : 0;
  const marksRate = marksMax > 0 ? Math.round((marksNet / marksMax) * 100) : null;
  const penaltyPercentage = marksEarned > 0 ? Math.round((marksDeducted / marksEarned) * 100) : null;
  const notEarnedMarks = Math.max(0, marksMax - marksEarned);

  const weakestSubject = [...subjectBreakdown]
    .filter(subject => subject.graded > 0)
    .sort((a, b) => (a.correctRate ?? 101) - (b.correctRate ?? 101))[0];

  const strongestSubject = [...subjectBreakdown]
    .filter(subject => subject.graded > 0 && subject.correct > 0)
    .sort((a, b) => (b.correctRate ?? -1) - (a.correctRate ?? -1))[0];

  const practiceParams = new URLSearchParams({ mode: "subject_wise" });
  if (weakestSubject) practiceParams.set("subject", weakestSubject.id);
  if (sourceYear) practiceParams.set("year", String(sourceYear));
  if (sourcePaper) practiceParams.set("paper", sourcePaper);

  const natStats = questionTypeBreakdown.find(t => t.type === "NAT");
  const tier1 = marksTierBreakdown.find(t => t.tier === 1);
  const tier2 = marksTierBreakdown.find(t => t.tier === 2);

  const timingValue = timing.available && timing.seconds != null ? formatTime(timing.seconds) : "Not recorded";
  const timingSubtext = timing.available
    ? timing.kind === "active"
      ? "Foreground active time"
      : timing.capped
        ? "Capped at paper duration"
        : "Start to submission"
    : "Timing unavailable";

  const paceQuadrants = pacing?.available
    ? [
        {
          key: "fastCorrect",
          label: "Quick & correct",
          count: pacing.quadrants.fastCorrect,
          hint: "Secure — keep these in rotation.",
          className: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20",
          countClass: "text-emerald-700 dark:text-emerald-300",
        },
        {
          key: "fastWrong",
          label: "Quick & wrong",
          count: pacing.quadrants.fastWrong,
          hint: "Guessed or rushed — rebuild the basics here.",
          className: "border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20",
          countClass: "text-amber-700 dark:text-amber-300",
        },
        {
          key: "slowCorrect",
          label: "Slow & correct",
          count: pacing.quadrants.slowCorrect,
          hint: "You know it, but it costs time — drill these under a timer.",
          className: "border-sky-200 bg-sky-50/50 dark:border-sky-900/40 dark:bg-sky-950/20",
          countClass: "text-sky-700 dark:text-sky-300",
        },
        {
          key: "slowWrong",
          label: "Slow & wrong",
          count: pacing.quadrants.slowWrong,
          hint: "Weak foundation — priority revision.",
          className: "border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20",
          countClass: "text-rose-700 dark:text-rose-300",
        },
      ]
    : [];

  const driftPercent = pacing?.drift?.percent ?? null;
  const driftText =
    driftPercent == null
      ? null
      : driftPercent > 10
        ? `You took ${driftPercent}% more time per question in the final third of the paper — late fatigue is eating into your pace.`
        : driftPercent < -10
          ? `You took ${Math.abs(driftPercent)}% less time per question in the final third — make sure you are not rushing the back half.`
          : "Your pace held steady from the first question to the last.";

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Navigation & Context Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {streamName && (
            <Badge variant="outline" className="font-medium">
              {streamName}
            </Badge>
          )}
          <Badge variant="secondary" className="font-semibold">
            {isSprint ? "⚡ 5-Q Practice Sprint" : sourceYear ? `${examName} ${sourceYear} ${sourcePaper || ""}` : "Practice Test"}
          </Badge>
          <span className="text-muted-foreground">· Session Complete</span>
        </div>
      </header>

      {/* Hero Performance Card */}
      <Card className="overflow-hidden border shadow-sm">
        <div className="border-b bg-gradient-to-r from-primary/5 via-background to-secondary/20 p-5 sm:p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                <span>{message.icon}</span>
                <span>{message.title}</span>
                <span className="text-muted-foreground">— {message.subtitle}</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Test Performance Summary
              </h1>
              <p className="text-sm text-muted-foreground">
                Marks are calculated on the server from each question&apos;s configured marks and penalties. These are practice results, not an official {examName} score, rank, or cutoff estimate.
              </p>
            </div>
            <AnimatedScoreRing
              value={marksNet}
              maximum={marksMax}
              percentage={marksRate}
            />
          </div>
        </div>

        <CardContent className="space-y-5 p-5 sm:p-6">
          {/* 4 Core KPIs Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border bg-card p-4 text-center shadow-sm">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Attempt accuracy</p>
              <div className="mt-1 text-2xl font-extrabold tabular-nums">{formatRate(accuracy)}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">{correctCount} / {attemptedCount} graded attempts</p>
            </div>

            <div className="rounded-2xl border bg-card p-4 text-center shadow-sm">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Correct rate</p>
              <div className="mt-1 text-2xl font-extrabold tabular-nums">{formatRate(correctRate)}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">{correctCount} / {gradedQuestionCount} graded questions</p>
            </div>

            <div className="rounded-2xl border bg-card p-4 text-center shadow-sm">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10">
                <Clock className="h-4 w-4 text-sky-600" />
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{timing.available ? timing.label : "Session time"}</p>
              <div className="mt-1 text-2xl font-extrabold tabular-nums">{timingValue}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">{timingSubtext}</p>
            </div>

            <div className="rounded-2xl border bg-card p-4 text-center shadow-sm">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                <Minus className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Skipped</p>
              <div className="mt-1 text-2xl font-extrabold tabular-nums">{skippedCount}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">of {gradedQuestionCount} graded questions</p>
            </div>
          </div>

          {/* Visual Marks Distribution Bar */}
          <div className="rounded-2xl border bg-muted/40 p-4 shadow-sm sm:p-5">
            <div className="mb-2 flex items-center justify-between text-xs font-medium">
              <span>Marks Breakdown</span>
              <span className="tabular-nums font-semibold">
                Net: {formatMarks(marksNet)} / {formatMarks(marksMax)} marks
              </span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              {marksEarned > 0 && (
                <div
                  className="bg-emerald-500 transition-all duration-700"
                  style={{ width: `${Math.min(100, (marksEarned / marksMax) * 100)}%` }}
                  title={`Earned: +${formatMarks(marksEarned)}`}
                />
              )}
              {marksDeducted > 0 && (
                <div
                  className="bg-rose-500 transition-all duration-700"
                  style={{ width: `${Math.min(100, (marksDeducted / marksMax) * 100)}%` }}
                  title={`Deductions: -${formatMarks(marksDeducted)}`}
                />
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Earned: <strong className="font-semibold text-foreground">+{formatMarks(marksEarned)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Penalties: <strong className="font-semibold text-rose-600 dark:text-rose-400">−{formatMarks(marksDeducted)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                Not earned: <strong className="font-semibold text-foreground">{formatMarks(notEarnedMarks)}</strong>
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Skipped questions left {formatMarks(skippedMarks)} positive mark{skippedMarks === 1 ? "" : "s"} unearned. Skipping never reduces net marks.</span>
              <span>
                Penalties reduced earned marks by {penaltyPercentage == null ? "—" : `${penaltyPercentage}%`}.
              </span>
            </div>
            {marksNet < 0 && (
              <p className="mt-2 rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                Net marks are negative because penalties exceeded earned marks. This is shown exactly as calculated, not rounded up to zero.
              </p>
            )}
            {marksToAllCount > 0 && (
              <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                {marksToAllCount} question{marksToAllCount === 1 ? " was" : "s were"} awarded full marks to all candidates. {marksToAllCount === 1 ? "It is" : "They are"} excluded from correct rate, attempt accuracy, attempted and skipped counts, but the marks are included above.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data caveats */}
      {dataCaveats.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              Data limitations for this session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
              {dataCaveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Time & pace — per-question foreground active time */}
      {pacing?.available && pacing.benchmark && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="h-4 w-4 text-primary" />
                  Time &amp; pace
                </CardTitle>
                <CardDescription>
                  Foreground time you spent on each question, split at{" "}
                  {pacing.benchmark.kind === "limit"
                    ? "your per-question budget (paper duration ÷ questions)"
                    : "your own typical per-question time (median)"}
                  . Backgrounded time never counts.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {pacing.recorded} of {pacing.total} questions timed
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Pace KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border bg-card p-4 text-center shadow-sm">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10">
                  <Clock className="h-4 w-4 text-sky-600" />
                </div>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recorded focus time</p>
                <div className="mt-1 text-2xl font-extrabold tabular-nums">{formatTime(pacing.totalSeconds)}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">on {pacing.recorded} question{pacing.recorded === 1 ? "" : "s"}</p>
              </div>
              <div className="rounded-2xl border bg-card p-4 text-center shadow-sm">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
                  <Zap className="h-4 w-4 text-amber-600" />
                </div>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Median per question</p>
                <div className="mt-1 text-2xl font-extrabold tabular-nums">{pacing.medianSeconds == null ? "—" : formatTime(pacing.medianSeconds)}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">half were quicker</p>
              </div>
              <div className="rounded-2xl border bg-card p-4 text-center shadow-sm">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Average per question</p>
                <div className="mt-1 text-2xl font-extrabold tabular-nums">{pacing.meanSeconds == null ? "—" : formatTime(pacing.meanSeconds)}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">recorded time ÷ {pacing.recorded}</p>
              </div>
              <div className="rounded-2xl border bg-card p-4 text-center shadow-sm">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Timer className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {pacing.benchmark.kind === "limit" ? "Your time budget" : "Your typical time"}
                </p>
                <div className="mt-1 text-2xl font-extrabold tabular-nums">{formatTime(pacing.benchmark.seconds)}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {pacing.benchmark.kind === "limit" ? "even split of the paper" : "median of recorded times"}
                </p>
              </div>
            </div>

            {/* Time × outcome quadrants */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {paceQuadrants.map((quadrant) => (
                <div key={quadrant.key} className={`rounded-2xl border p-4 ${quadrant.className}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5">
                        {quadrant.key === "fastCorrect" ? (
                          <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : quadrant.key === "fastWrong" ? (
                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        ) : quadrant.key === "slowCorrect" ? (
                          <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        ) : (
                          <X className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        )}
                      </span>
                      <span className="text-sm font-semibold">{quadrant.label}</span>
                    </div>
                    <span className={`text-2xl font-extrabold tabular-nums ${quadrant.countClass}`}>{quadrant.count}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{quadrant.hint}</p>
                </div>
              ))}
            </div>

            {(pacing.quadrants.fastSkipped > 0 || pacing.quadrants.slowSkipped > 0) && (
              <p className="text-xs text-muted-foreground">
                {pacing.quadrants.fastSkipped + pacing.quadrants.slowSkipped} timed question
                {pacing.quadrants.fastSkipped + pacing.quadrants.slowSkipped === 1 ? " was" : "s were"} left unanswered
                {" "}({pacing.quadrants.fastSkipped} quick, {pacing.quadrants.slowSkipped} slow). Skipping never reduces marks.
              </p>
            )}

            {driftText && (
              <p className="rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Pace drift: </span>
                {driftText}
              </p>
            )}

            {/* Time lost on wrong answers */}
            {pacing.slowestWrong.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Where your time went to waste</h4>
                <p className="text-xs text-muted-foreground">
                  The wrong answers that cost you the most time — these are the first ones to revise.
                </p>
                <ul className="space-y-1.5">
                  {pacing.slowestWrong.map((item) => (
                    <li
                      key={item.questionId}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        Question {item.index}
                        <span className="ml-2 text-xs text-muted-foreground">wrong</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                        {formatTime(item.seconds)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Slowest topics by recorded time */}
            {pacing.byTopic.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Topics that eat your time</h4>
                <p className="text-xs text-muted-foreground">
                  Mean foreground time per timed question, slowest first. Accuracy is over just these timed questions.
                </p>
                <ul className="space-y-1.5">
                  {pacing.byTopic.slice(0, 5).map((topic) => (
                    <li
                      key={topic.id}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        {topic.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {topic.questions} timed question{topic.questions === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3 font-mono text-xs tabular-nums">
                        {topic.correctRate != null && (
                          <span
                            className={
                              topic.correctRate >= 70
                                ? "font-semibold text-emerald-600 dark:text-emerald-400"
                                : topic.correctRate >= 40
                                  ? "font-semibold text-amber-600 dark:text-amber-400"
                                  : "font-semibold text-rose-600 dark:text-rose-400"
                            }
                          >
                            {topic.correctRate}%
                          </span>
                        )}
                        <span className="font-semibold">{formatTime(topic.meanSeconds)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Immediate Review & Action Hub */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Review & Next Actions</CardTitle>
          <CardDescription>
            Jump directly into solutions or practice the concepts identified in this session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {wrongCount > 0 ? (
              <Button asChild className="h-11 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70">
                <Link href={`/review/${sessionId}?filter=wrong`}>
                  <X className="mr-1.5 h-4 w-4 text-rose-600 dark:text-rose-400" />
                  Review Mistakes ({wrongCount})
                </Link>
              </Button>
            ) : (
              <Button asChild variant="secondary" className="h-11">
                <Link href={`/review/${sessionId}?filter=correct`}>
                  <Check className="mr-1.5 h-4 w-4 text-emerald-600" />
                  Review Correct ({correctCount})
                </Link>
              </Button>
            )}

            {skippedCount > 0 ? (
              <Button asChild variant="outline" className="h-11">
                <Link href={`/review/${sessionId}?filter=skipped`}>
                  <Minus className="mr-1.5 h-4 w-4 text-muted-foreground" />
                  Review Skipped ({skippedCount})
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="h-11">
                <Link href={`/review/${sessionId}`}>
                  <Eye className="mr-1.5 h-4 w-4 text-primary" />
                  Review All ({totalQuestions})
                </Link>
              </Button>
            )}

            <Button asChild className="h-11 bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href={isSprint ? "/practice" : "/test/select"}>
                <Play className="mr-1.5 h-4 w-4" />
                {isSprint ? "Another 5-Q Sprint" : "Take Another Test"}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metric definitions */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Info className="h-4 w-4 text-primary" />
            How these numbers are calculated
          </CardTitle>
          <CardDescription>
            These are practice metrics from the saved answers, not an official {examName} score, rank, or cutoff prediction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-3">
              <dt className="font-semibold text-foreground">Correct rate</dt>
              <dd className="mt-1 text-muted-foreground">
                Correct answers divided by every ordinarily graded question, including skipped ones. Marks-to-all questions are excluded from both sides.
              </dd>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <dt className="font-semibold text-foreground">Attempt accuracy</dt>
              <dd className="mt-1 text-muted-foreground">
                Correct answers divided by attempted graded questions whose correctness is known. A saved response without a trusted grading result is left ungraded, not counted as wrong.
              </dd>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <dt className="font-semibold text-foreground">Net marks</dt>
              <dd className="mt-1 text-muted-foreground">
                Earned marks minus applicable negative marking. It is never clamped at zero, so a negative total is shown as negative.
              </dd>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <dt className="font-semibold text-foreground">Timing</dt>
              <dd className="mt-1 text-muted-foreground">
                {timing.note}{" "}
                {hasQuestionTiming
                  ? "Per-question foreground timing was recorded and powers the Time & pace card above; backgrounded time is excluded."
                  : "Per-question timing was not recorded for this session, so no per-question pacing is shown."}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* GATE Question Type Breakdown (MCQ vs MSQ vs NAT) */}
      {questionTypeBreakdown.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">
                  Question Format Breakdown
                </CardTitle>
                <CardDescription>
                  The same correct rate and attempt accuracy definitions, split by question type.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                MCQ · MSQ · NAT
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {questionTypeBreakdown.map((item) => (
                <div
                  key={item.type}
                  className="rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-base">{item.type}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.type === "MCQ" ? "Single" : item.type === "MSQ" ? "Multi-Select" : "Numerical"}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {item.total} question{item.total === 1 ? "" : "s"}
                    </Badge>
                  </div>

                  <div className="my-3 space-y-2.5">
                    <RateRow label="Correct rate" value={item.correctRate} />
                    <RateRow label="Attempt accuracy" value={item.attemptAccuracy} />
                  </div>

                  <dl className="grid grid-cols-3 gap-1 rounded-lg bg-muted/40 p-2 text-center text-xs">
                    <div>
                      <dt className="text-[10px] text-muted-foreground">Correct</dt>
                      <dd className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {item.correct}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-muted-foreground">Wrong</dt>
                      <dd className="font-semibold text-rose-600 dark:text-rose-400">
                        {item.wrong}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-muted-foreground">Skipped</dt>
                      <dd className="font-semibold text-muted-foreground">{item.skipped}</dd>
                    </div>
                  </dl>

                  {item.marksToAll > 0 && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {item.marksToAll} marks-to-all question{item.marksToAll === 1 ? "" : "s"} excluded from these rates.
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs">
                    <span className="text-muted-foreground">Net contribution</span>
                    <strong className="font-bold tabular-nums">
                      {formatMarks(item.netMarks)} marks
                    </strong>
                  </div>
                </div>
              ))}
            </div>

            <p className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
              <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Marks and penalties come from each question&apos;s configured values. A skipped question leaves its positive marks unearned; it does not create a negative-mark deduction.
            </p>

            {skippedCount > 0 && skippedMarks > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                <Minus className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <strong className="font-semibold">Skipped-question ledger: </strong>
                  You left {skippedCount} graded question{skippedCount === 1 ? "" : "s"} unanswered, leaving {formatMarks(skippedMarks)} positive marks unearned. This does not reduce your net marks.
                  {natStats && natStats.skipped > 0 ? ` ${natStats.skipped} of those ${natStats.skipped === 1 ? "was a Numerical Answer Type question" : "were Numerical Answer Type questions"}.` : ""}
                </div>
              </div>
            )}

            {marksDeducted > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs leading-relaxed text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <div>
                  <strong className="font-semibold">Negative marking: </strong>
                  {wrongCount} wrong answer{wrongCount === 1 ? "" : "s"} produced {formatMarks(marksDeducted)} marks of penalties, reducing earned marks by {penaltyPercentage ?? 0}%. The exact deduction for each question is shown in the review.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 1-Mark vs 2-Mark Question Analysis */}
      {marksTierBreakdown.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              1-Mark vs 2-Mark Question Balance
            </CardTitle>
            <CardDescription>
              The same rates, split by the configured marks per question.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {marksTierBreakdown.map((t) => (
                <div key={t.tier} className="rounded-2xl border bg-muted/40 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm">
                        {t.tier}-Mark Questions
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {t.total} loaded question{t.total === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Badge variant="outline" className="font-semibold tabular-nums">
                      {formatMarks(t.netMarks)} marks
                    </Badge>
                  </div>

                  <div className="my-3 space-y-2.5">
                    <RateRow label="Correct rate" value={t.correctRate} />
                    <RateRow label="Attempt accuracy" value={t.attemptAccuracy} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t.correct} correct</span>
                    <span>{t.wrong} wrong</span>
                    <span>{t.skipped} skipped</span>
                  </div>
                  {t.marksToAll > 0 && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {t.marksToAll} marks-to-all question{t.marksToAll === 1 ? "" : "s"} excluded from the rates.
                    </p>
                  )}
                </div>
              ))}
            </div>

            {tier1 && tier2 && tier1.graded > 0 && tier2.graded > 0 && (tier1.correctRate ?? 0) - (tier2.correctRate ?? 0) >= 20 && (
              <p className="mt-3 text-xs text-muted-foreground">
                💡 <strong>Observation:</strong> Your 1-mark correct rate ({formatRate(tier1.correctRate)}) is notably higher than your 2-mark correct rate ({formatRate(tier2.correctRate)}). Review the multi-step questions before adding more timed practice.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Smart Tagging & Concept Diagnostics Integration */}
      <div className="space-y-2">
        {diagnosticPanel ?? (diagnostic && <SmartTagPanel result={diagnostic} variant="result" />)}
      </div>

      {/* Subject-Wise Performance Breakdown */}
      {subjectBreakdown.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">Subject-Wise Performance</CardTitle>
                <CardDescription>
                  Correct rate and net marks by subject. Marks-to-all questions are excluded from the rates.
                </CardDescription>
              </div>
              {strongestSubject && (
                <Badge variant="secondary" className="text-xs text-emerald-700 dark:text-emerald-300">
                  Top: {strongestSubject.name}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Mobile View */}
            <div className="space-y-3 sm:hidden">
              {subjectBreakdown.map((subject) => (
                <div key={subject.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm">{subject.name}</p>
                    <span className="font-bold text-sm tabular-nums">
                      {formatMarks(subject.netMarks)} marks
                    </span>
                  </div>
                  <div className="my-2.5 space-y-2">
                    <RateRow label="Correct rate" value={subject.correctRate} />
                    <RateRow label="Attempt accuracy" value={subject.attemptAccuracy} />
                  </div>
                  <dl className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-md bg-emerald-50 p-1 dark:bg-emerald-950/20">
                      <dt className="text-[10px] text-emerald-700 dark:text-emerald-300">Correct</dt>
                      <dd className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {subject.correct}
                      </dd>
                    </div>
                    <div className="rounded-md bg-rose-50 p-1 dark:bg-rose-950/20">
                      <dt className="text-[10px] text-rose-700 dark:text-rose-300">Wrong</dt>
                      <dd className="font-semibold text-rose-600 dark:text-rose-400">
                        {subject.wrong}
                      </dd>
                    </div>
                    <div className="rounded-md bg-muted p-1">
                      <dt className="text-[10px] text-muted-foreground">Skipped</dt>
                      <dd className="font-semibold">{subject.skipped}</dd>
                    </div>
                    <div className="rounded-md bg-muted p-1">
                      <dt className="text-[10px] text-muted-foreground">Graded</dt>
                      <dd className="font-semibold">{subject.graded}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-muted-foreground">
                    <th className="pb-2.5 font-medium">Subject</th>
                    <th className="pb-2.5 text-center font-medium">Graded</th>
                    <th className="pb-2.5 text-center font-medium text-emerald-600 dark:text-emerald-400">
                      Correct
                    </th>
                    <th className="pb-2.5 text-center font-medium text-rose-600 dark:text-rose-400">
                      Wrong
                    </th>
                    <th className="pb-2.5 text-center font-medium">Skipped</th>
                    <th className="pb-2.5 text-center font-medium">Net Marks</th>
                    <th className="pb-2.5 text-right font-medium">Correct rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subjectBreakdown.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-muted/30">
                      <td className="py-3 font-medium">{s.name}</td>
                      <td className="py-3 text-center tabular-nums">{s.graded}</td>
                      <td className="py-3 text-center font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                        {s.correct}
                      </td>
                      <td className="py-3 text-center font-semibold text-rose-600 tabular-nums dark:text-rose-400">
                        {s.wrong}
                      </td>
                      <td className="py-3 text-center text-muted-foreground tabular-nums">
                        {s.skipped}
                      </td>
                      <td className="py-3 text-center font-bold tabular-nums">
                        {formatMarks(s.netMarks)}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-medium tabular-nums">{formatRate(s.correctRate)}</span>
                          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.max(0, Math.min(100, s.correctRate ?? 0))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {weakestSubject && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/40 p-4 shadow-sm text-xs">
                <div>
                  <span className="font-semibold text-foreground">Priority focus: </span>
                  <span className="text-muted-foreground">
                    {weakestSubject.name} had {weakestSubject.wrong} incorrect and {weakestSubject.skipped} skipped across {weakestSubject.graded} graded question{weakestSubject.graded === 1 ? "" : "s"} (correct rate {formatRate(weakestSubject.correctRate)}).
                  </span>
                </div>
                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                  <Link href={isSprint ? "/practice" : `/test/select?${practiceParams}`}>
                    Practice this subject →
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Shareable Peer Challenge (for Sprints) */}
      {isSprint && <ShareChallenge sessionId={sessionId} />}

      {/* Spaced Repetition Auto-Enrollment Card */}
      {wrongCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed">
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <strong className="font-semibold text-foreground">Automated Spaced Revision Active: </strong>
            Your {wrongCount} missed question{wrongCount === 1 ? "" : "s"} have been automatically queued in your Spaced Repetition system. You will review them tomorrow at Stage 1, followed by 3-day, 7-day, 14-day, and 30-day review intervals until fully mastered.
          </div>
        </div>
      )}

      {/* Primary Bottom Actions */}
      <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
        <Button asChild size="lg" className="h-12 w-full font-semibold shadow-sm">
          <Link href={`/review/${sessionId}`}>
            <Eye className="mr-2 h-4 w-4" />
            Review Full Solutions
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg" className="h-12 w-full font-semibold">
          <Link href={isSprint ? "/practice" : "/test/select"}>
            <Play className="mr-2 h-4 w-4" />
            {isSprint ? "Another 5-Q Sprint" : "Take Another Test"}
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-12 w-full font-semibold">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
