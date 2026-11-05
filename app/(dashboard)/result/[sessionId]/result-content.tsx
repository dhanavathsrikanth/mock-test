"use client";

import { formatMarks } from "@/lib/marking";
import { ShareChallenge } from '@/components/challenges/ShareChallenge';
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

interface SubjectBreakdown {
  id: string;
  name: string;
  total: number;
  correct: number;
  wrong: number;
}

interface ResultContentProps {
  diagnostic?: DiagnosticLoad;
  diagnosticPanel?: ReactNode;
  marks?: { earned: number; deducted: number; maximum: number; net: number };
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  accuracy: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  subjectBreakdown: SubjectBreakdown[];
  message: { title: string; subtitle: string; icon: string };
  sessionId: string;
  isSprint?: boolean;
  sourceYear?: number | null;
  sourcePaper?: string | null;
}

function AnimatedScore({
  value,
  total,
}: {
  value: number;
  total: number;
}) {
  const [count, setCount] = useState(0);
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold">{count}</span>
        <span className="text-sm text-muted-foreground">/ {total}</span>
        <span className="text-lg font-semibold mt-1">{percentage}%</span>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function ResultContent({
  diagnosticPanel,
  diagnostic,
  marks,
  correctCount,
  wrongCount,
  skippedCount,
  accuracy,
  totalQuestions,
  timeTakenSeconds,
  subjectBreakdown,
  message,
  sessionId,
  sourceYear,
  sourcePaper,
  isSprint = false,
}: ResultContentProps) {
  const weakestSubject = [...subjectBreakdown]
    .filter(subject => subject.total > 0 && subject.correct < subject.total && subject.id !== "unknown")
    .sort((a, b) => a.correct / a.total - b.correct / b.total)[0];
  const practiceParams = new URLSearchParams({ mode: "subject_wise" });
  if (weakestSubject) practiceParams.set("subject", weakestSubject.id);
  if (sourceYear) practiceParams.set("year", String(sourceYear));
  if (sourcePaper) practiceParams.set("paper", sourcePaper);
  const marksPercentage = marks && marks.maximum > 0
    ? Math.round((marks.net / marks.maximum) * 100)
    : 0;
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Your Results</h1>
      </div>

      {marks && <Card><CardContent className="pt-5 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Marks scored</p>
        <p className="text-3xl font-bold tabular-nums">{formatMarks(marks.net)} <span className="text-lg text-muted-foreground">/ {formatMarks(marks.maximum)}</span></p>
        <p className="text-sm text-muted-foreground">{marksPercentage}% of available marks, after deductions</p>
        <p className="text-xs text-muted-foreground">Earned: +{formatMarks(marks.earned)} · Deductions: −{formatMarks(marks.deducted)} · Unattempted: 0</p>
      </CardContent></Card>}
      {diagnosticPanel ?? (diagnostic && <SmartTagPanel result={diagnostic} variant="result" />)}
      {isSprint && <ShareChallenge sessionId={sessionId} />}
      <AnimatedScore value={correctCount} total={totalQuestions} />
      <p className="text-center text-xs text-muted-foreground">Correct answers out of all questions · before marking deductions</p>

      <p className="text-center text-lg">
        <span className="font-semibold">{message.title}</span>{" "}
        {message.subtitle} {message.icon}
      </p>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 text-center">
            <Check className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {correctCount}
            </div>
            <div className="text-xs text-muted-foreground">Correct</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 text-center">
            <X className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              {wrongCount}
            </div>
            <div className="text-xs text-muted-foreground">Wrong</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 text-center">
            <Minus className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <div className="text-xl sm:text-2xl font-bold">{skippedCount}</div>
            <div className="text-xs text-muted-foreground">Skipped</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Answer accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accuracy}%</div>
            <p className="mt-1 text-xs text-muted-foreground">Correct ÷ attempted questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Time Taken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              {formatTime(timeTakenSeconds)}
            </div>
          </CardContent>
        </Card>
      </div>

      {subjectBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subject-wise Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:hidden">
              {subjectBreakdown.map(subject => (
                <div key={subject.id} className="rounded-lg border p-3">
                  <p className="break-words text-sm font-medium">{subject.name}</p>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div><dt className="text-muted-foreground">Correct</dt><dd className="mt-1 font-semibold text-green-600">{subject.correct}</dd></div>
                    <div><dt className="text-muted-foreground">Wrong</dt><dd className="mt-1 font-semibold text-red-600">{subject.wrong}</dd></div>
                    <div><dt className="text-muted-foreground">Total</dt><dd className="mt-1 font-semibold">{subject.total}</dd></div>
                  </dl>
                  <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">Answer accuracy: {subject.correct + subject.wrong > 0 ? `${Math.round(subject.correct / (subject.correct + subject.wrong) * 100)}%` : "No attempts"}</p>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Subject</th>
                    <th className="pb-2 font-medium text-center">Total</th>
                    <th className="pb-2 font-medium text-center text-green-600">
                      Correct
                    </th>
                    <th className="pb-2 font-medium text-center text-red-600">
                      Wrong
                    </th>
                    <th className="pb-2 font-medium text-center">
                      Answer accuracy
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjectBreakdown.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2.5">{s.name}</td>
                      <td className="py-2.5 text-center">{s.total}</td>
                      <td className="py-2.5 text-center text-green-600">
                        {s.correct}
                      </td>
                      <td className="py-2.5 text-center text-red-600">
                        {s.wrong}
                      </td>
                      <td className="py-2.5 text-center font-medium">
                        {s.correct + s.wrong > 0
                          ? Math.round((s.correct / (s.correct + s.wrong)) * 100)
                          : 0}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {(wrongCount > 0 || skippedCount > 0) && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Your next step</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{weakestSubject ? `Focus on ${weakestSubject.name}: ${weakestSubject.correct} of ${weakestSubject.total} questions correct.` : "Review the questions you missed, then try another practice session."}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild className="h-11 px-3"><Link href={`/review/${sessionId}?filter=${wrongCount > 0 ? "wrong" : "skipped"}`}>Review {wrongCount > 0 ? "mistakes" : "skipped questions"}</Link></Button>
              {weakestSubject && <Button asChild variant="outline" className="h-11 px-3"><Link href={isSprint ? "/practice" : `/test/select?${practiceParams}`}>{isSprint ? "Choose another sprint" : "Practice this subject"}</Link></Button>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
        <Button asChild size="lg" className="h-11 w-full px-4">
          <Link href={`/review/${sessionId}`}>
            <Eye className="h-4 w-4" />
            Review Answers
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg" className="h-11 w-full px-4">
          <Link href={isSprint ? "/practice" : "/test/select"}>
            <Play className="h-4 w-4" />
            {isSprint ? "Another 5-Q Sprint" : "Take Another Test"}
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-11 w-full px-4">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
