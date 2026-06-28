"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowLeft,
  Sun,
} from "lucide-react";
import Link from "next/link";

interface HistoryItem {
  id: string;
  assignedDate: string;
  question: { subject: string | null };
  userAnswer: { isCorrect: boolean; selectedOption: number } | null;
}

type FilterValue = "all" | "correct" | "wrong" | "missed";

const FILTERS: { key: FilterValue; label: string }[] = [
  { key: "all", label: "All" },
  { key: "correct", label: "Correct" },
  { key: "wrong", label: "Wrong" },
  { key: "missed", label: "Not Attempted" },
];

export default function DailyHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/daily-question?history=true");
        if (res.ok) {
          const json = await res.json();
          setHistory(json.history || []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = history.filter((item) => {
    if (filter === "all") return true;
    if (filter === "correct") return item.userAnswer?.isCorrect === true;
    if (filter === "wrong") return item.userAnswer?.isCorrect === false;
    if (filter === "missed") return !item.userAnswer;
    return true;
  });

  const correctCount = history.filter(
    (h) => h.userAnswer?.isCorrect === true
  ).length;
  const wrongCount = history.filter(
    (h) => h.userAnswer?.isCorrect === false
  ).length;
  const missedCount = history.filter((h) => !h.userAnswer).length;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-20" />
          <div className="space-y-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/daily">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Past Daily Questions
            </h1>
            <p className="text-sm text-muted-foreground">
              {history.length} question{history.length !== 1 ? "s" : ""} total
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {correctCount}
              </p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {wrongCount}
              </p>
              <p className="text-xs text-muted-foreground">Wrong</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <MinusCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold text-muted-foreground">
                {missedCount}
              </p>
              <p className="text-xs text-muted-foreground">Missed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const count =
            f.key === "all"
              ? history.length
              : f.key === "correct"
                ? correctCount
                : f.key === "wrong"
                  ? wrongCount
                  : missedCount;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full border transition-colors whitespace-nowrap ${
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-foreground border-input hover:bg-accent hover:border-muted-foreground/30"
              }`}
            >
              {f.label}
              <span
                className={`text-xs ${
                  filter === f.key
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* History list */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <Sun className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <h2 className="text-lg font-semibold">No questions found</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {filter === "all"
                    ? "No daily questions have been assigned yet."
                    : filter === "correct"
                      ? "You haven't answered any correctly yet."
                      : filter === "wrong"
                        ? "You haven't gotten any wrong."
                        : "You haven't missed any."}
                </p>
              </div>
              {filter !== "all" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  Show all
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground font-medium w-6 shrink-0">
                      {history.length - history.indexOf(item)}
                    </span>
                    {item.userAnswer ? (
                      item.userAnswer.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                      )
                    ) : (
                      <MinusCircle className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="text-sm font-medium">
                        {format(
                          new Date(item.assignedDate),
                          "MMM d, yyyy"
                        )}
                      </span>
                      {item.question?.subject && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-[10px] px-1.5 py-0"
                        >
                          {item.question.subject}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium shrink-0 ml-4 ${
                      item.userAnswer
                        ? item.userAnswer.isCorrect
                          ? "text-green-600"
                          : "text-red-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.userAnswer
                      ? item.userAnswer.isCorrect
                        ? "Correct"
                        : "Wrong"
                      : "Not attempted"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
