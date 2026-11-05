"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  freezeTokens: number;
  lastActivityDate: string | null;
  practicedToday: boolean;
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function nextMilestone(streak: number): { name: string; daysAway: number } | null {
  if (streak < 7) return { name: "Week Warrior", daysAway: 7 - streak };
  if (streak < 30) return { name: "Iron Will", daysAway: 30 - streak };
  return null;
}

export function StreakCard() {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndFetch() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      async function fetchStreak() {
        try {
          const res = await fetch("/api/streak");
          if (!res.ok) throw new Error("Failed to fetch streak");
          const data = await res.json();
          setStreak(data);
        } catch {
          setError(true);
        } finally {
          setLoading(false);
        }
      }
      fetchStreak();
    }
    checkAuthAndFetch();
  }, []);

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-8 w-24 bg-muted rounded mx-auto" />
            <div className="h-4 w-32 bg-muted rounded mx-auto" />
            <div className="flex justify-center gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 w-8 bg-muted rounded-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !streak) {
    return null;
  }

  const data = streak;
  const milestone = nextMilestone(data.currentStreak);
  const today = getTodayDate();

  const streakEnd = data.practicedToday ? today : data.lastActivityDate || today;
  const streakStartNum = data.currentStreak > 0
    ? new Date(streakEnd).getTime() - (data.currentStreak - 1) * 86400000
    : Date.now();

  function isDayPracticed(dateStr: string): boolean {
    if (data.currentStreak === 0) return false;
    const d = new Date(dateStr).getTime();
    return d >= streakStartNum && d <= new Date(streakEnd).getTime();
  }

  const last7 = Array.from({ length: 7 }, (_, i) => getDateNDaysAgo(6 - i));

  return (
    <Card className="min-w-0 overflow-hidden border-orange-200/60 bg-gradient-to-br from-orange-50 to-amber-50 shadow-sm dark:border-orange-900/40 dark:from-orange-950/20 dark:to-amber-950/20">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none" aria-hidden="true">🔥</span>
            <div>
              <h3 className="text-sm font-semibold">Study streak</h3>
              <p className="text-xs text-muted-foreground"><span className="text-xl font-bold tabular-nums text-foreground">{data.currentStreak}</span> day{data.currentStreak !== 1 ? "s" : ""} in a row</p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Personal best</p>
            <p className="mt-1 font-medium text-foreground">{data.longestStreak} day{data.longestStreak !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5" aria-label="Practice over the last seven days">
          {last7.map((date) => {
            const practiced = isDayPracticed(date);
            return <div key={date} title={date} aria-label={`${date}: ${practiced ? "practiced" : "not practiced"}`} className={`flex h-8 min-w-0 items-center justify-center rounded-md text-xs font-semibold ${practiced ? "bg-orange-500 text-white" : "bg-background/70 text-muted-foreground dark:bg-muted"}`}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][new Date(date).getDay()]}
            </div>;
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-xs ${data.practicedToday ? "font-medium text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
            {data.practicedToday ? "✓ Practiced today" : "Keep your streak going today."}
          </p>
          {!data.practicedToday && <Button size="sm" onClick={() => router.push("/test/select")} className="bg-orange-500 text-white hover:bg-orange-600">Start Practice</Button>}
        </div>

        {milestone && <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{milestone.daysAway} day{milestone.daysAway > 1 ? "s" : ""} to {milestone.name}</p>
          <div role="progressbar" aria-label={`Progress toward ${milestone.name}`} aria-valuemin={0} aria-valuemax={milestone.name === "Week Warrior" ? 7 : 30} aria-valuenow={data.currentStreak} className="h-1.5 overflow-hidden rounded-full bg-orange-100 dark:bg-orange-950/50">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(data.currentStreak / (milestone.name === "Week Warrior" ? 7 : 30)) * 100}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full bg-orange-500" />
          </div>
        </div>}
        {data.freezeTokens > 0 && <p className="text-xs text-muted-foreground">🛡️ {data.freezeTokens} freeze token{data.freezeTokens > 1 ? "s" : ""} remaining</p>}
      </CardContent>
    </Card>
  );
}