"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function DailyQuestionWidget() {
  const [data, setData] = useState<{
    id: string;
    question: { text: string } | null;
    userAnswer: { isCorrect: boolean } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/daily-question");
        if (!res.ok) return;
        const json = await res.json();
        setData(json);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse h-12 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.question) return null;

  return (
    <Card className="relative overflow-hidden">
      {!data.userAnswer && (
        <motion.span
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-400"
        />
      )}
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span>📅</span> Today&apos;s Question
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <p className="text-sm text-muted-foreground truncate">
          {data.question.text}
        </p>
        {data.userAnswer ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2
              className={`h-4 w-4 ${
                data.userAnswer.isCorrect
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            />
            <span
              className={
                data.userAnswer.isCorrect
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }
            >
              {data.userAnswer.isCorrect ? "Correct! +25 XP" : "Answered"}
            </span>
          </div>
        ) : (
          <Button size="sm" className="w-full gap-1.5" asChild>
            <Link href="/daily">
              Answer Now <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
