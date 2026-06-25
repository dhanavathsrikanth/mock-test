"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

function flameSize(streak: number): "sm" | "md" | "lg" {
  if (streak >= 30) return "lg";
  if (streak >= 7) return "md";
  return "sm";
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
  const size = flameSize(data.currentStreak);
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

  const flameSizeClass =
    size === "lg" ? "text-6xl" : size === "md" ? "text-5xl" : "text-4xl";

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={data.currentStreak}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="relative"
            >
              {data.currentStreak > 0 ? (
                <motion.span
                  className={`${flameSizeClass} block select-none`}
                  animate={
                    size === "lg"
                      ? {
                          scale: [1, 1.15, 1],
                          rotate: [0, -3, 3, 0],
                        }
                      : size === "md"
                      ? {
                          scale: [1, 1.1, 1],
                        }
                      : {}
                  }
                  transition={{
                    duration: size === "lg" ? 1.5 : 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  🔥
                </motion.span>
              ) : (
                <span className="text-4xl block select-none">🔥</span>
              )}
            </motion.div>
          </AnimatePresence>

          <div>
            <motion.span
              key={data.currentStreak}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-5xl font-extrabold tabular-nums block"
            >
              {data.currentStreak}
            </motion.span>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Day Streak
            </span>
          </div>

          <div className="flex items-center justify-center gap-1.5">
            {last7.map((date, i) => {
              const practiced = isDayPracticed(date);
              return (
                <motion.div
                  key={date}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    practiced
                      ? "bg-orange-500 text-white shadow-sm shadow-orange-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                  title={date}
                >
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][new Date(date).getDay()]}
                </motion.div>
              );
            })}
          </div>

          {data.freezeTokens > 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <span>🛡️</span>
              <span>{data.freezeTokens} freeze token{data.freezeTokens > 1 ? "s" : ""} remaining</span>
            </p>
          )}

          {data.practicedToday ? (
            <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                ✅
              </motion.span>
              Practiced today
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Practice today to keep your streak!
              </p>
              <Button
                size="sm"
                onClick={() => router.push("/test/select")}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Start Practice
              </Button>
            </div>
          )}

          {milestone && (
            <div className="w-full space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{milestone.daysAway} day{milestone.daysAway > 1 ? "s" : ""} away from {milestone.name}</span>
                <span>🏆</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${
                      milestone.name === "Week Warrior"
                        ? (data.currentStreak / 7) * 100
                        : (data.currentStreak / 30) * 100
                    }%`,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-500"
                />
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Longest streak: {data.longestStreak} day{data.longestStreak !== 1 ? "s" : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
