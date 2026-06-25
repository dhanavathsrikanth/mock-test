"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  Minus,
  Clock,
  ArrowLeft,
  Eye,
} from "lucide-react";

interface SubjectBreakdown {
  name: string;
  total: number;
  correct: number;
  wrong: number;
}

interface ResultContentProps {
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  accuracy: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  subjectBreakdown: SubjectBreakdown[];
  message: { title: string; subtitle: string; icon: string };
  sessionId: string;
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
  correctCount,
  wrongCount,
  skippedCount,
  accuracy,
  totalQuestions,
  timeTakenSeconds,
  subjectBreakdown,
  message,
  sessionId,
}: ResultContentProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Your Results</h1>
      </div>

      <AnimatedScore value={correctCount} total={totalQuestions} />

      <p className="text-center text-lg">
        <span className="font-semibold">{message.title}</span>{" "}
        {message.subtitle} {message.icon}
      </p>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Check className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-600">
              {correctCount}
            </div>
            <div className="text-xs text-muted-foreground">Correct</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <X className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-red-600">
              {wrongCount}
            </div>
            <div className="text-xs text-muted-foreground">Wrong</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Minus className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <div className="text-2xl font-bold">{skippedCount}</div>
            <div className="text-xs text-muted-foreground">Skipped</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accuracy}%</div>
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
            <div className="overflow-x-auto">
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
                      Accuracy
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjectBreakdown.map((s) => (
                    <tr key={s.name} className="border-b last:border-0">
                      <td className="py-2.5">{s.name}</td>
                      <td className="py-2.5 text-center">{s.total}</td>
                      <td className="py-2.5 text-center text-green-600">
                        {s.correct}
                      </td>
                      <td className="py-2.5 text-center text-red-600">
                        {s.wrong}
                      </td>
                      <td className="py-2.5 text-center font-medium">
                        {s.total > 0
                          ? Math.round((s.correct / s.total) * 100)
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

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild size="lg" className="flex-1">
          <Link href={`/review/${sessionId}`}>
            <Eye className="h-4 w-4" />
            Review Answers
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="flex-1">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
