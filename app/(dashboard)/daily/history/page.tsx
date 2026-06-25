"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MinusCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface HistoryItem {
  id: string;
  assignedDate: string;
  question: { subject: string | null };
  userAnswer: { isCorrect: boolean; selectedOption: number } | null;
}

type FilterValue = "all" | "correct" | "wrong" | "missed";

export default function DailyHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/daily">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Past Daily Questions
        </h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "correct", "wrong", "missed"] as FilterValue[]).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f === "missed" ? "Not Attempted" : f}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {filtered.length} question{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              No questions match this filter.
            </p>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="w-full flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {item.userAnswer ? (
                      item.userAnswer.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                      )
                    ) : (
                      <MinusCircle className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                    )}
                    <div>
                      <span className="text-sm font-medium">
                        {format(new Date(item.assignedDate), "MMMM d, yyyy")}
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
                  <span className="text-xs text-muted-foreground shrink-0 ml-4">
                    {item.userAnswer
                      ? item.userAnswer.isCorrect
                        ? "Correct"
                        : "Wrong"
                      : "Not attempted"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
