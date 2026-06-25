"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Settings, RotateCcw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CountdownData {
  id: string;
  label: string;
  examDate: string;
  isOfficial: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CUSTOM_DATE_KEY = "tgpsc_custom_exam_date";
const PREP_START_DATE = new Date("2025-07-01");

function getMotivation(daysLeft: number): string {
  if (daysLeft > 90) return "Great! You have plenty of time. Build your foundation.";
  if (daysLeft > 60) return "Time to get serious. Aim for 2 tests/week.";
  if (daysLeft > 30) return "Final stretch! Daily practice is essential.";
  if (daysLeft > 7) return "Exam is near! Focus on weak topics only.";
  return "Game time! Revise formulas & bookmarks.";
}

function calcTimeLeft(target: Date): TimeLeft {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function getPrepProgress(target: Date): number {
  const total = target.getTime() - PREP_START_DATE.getTime();
  const elapsed = Date.now() - PREP_START_DATE.getTime();
  if (total <= 0) return 100;
  return Math.min(100, Math.round((elapsed / total) * 100));
}

export function ExamCountdown() {
  const [data, setData] = useState<CountdownData | null>(null);
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const stored = localStorage.getItem(CUSTOM_DATE_KEY);
    if (stored) setCustomDate(stored);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/exam-countdown");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const targetDate = useCallback(() => {
    if (customDate) return new Date(customDate);
    if (data) return new Date(data.examDate);
    return new Date("2026-11-15");
  }, [customDate, data]);

  useEffect(() => {
    const update = () => setTimeLeft(calcTimeLeft(targetDate()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const handleSetCustomDate = (date: Date | undefined) => {
    if (date) {
      const dateStr = format(date, "yyyy-MM-dd");
      localStorage.setItem(CUSTOM_DATE_KEY, dateStr);
      setCustomDate(dateStr);
      setShowPicker(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem(CUSTOM_DATE_KEY);
    setCustomDate(null);
  };

  const isPast = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;
  const daysLeft = timeLeft.days;
  const progress = targetDate() ? getPrepProgress(targetDate()) : 0;
  const motivation = isPast ? "Exam has passed. Set a new target date!" : getMotivation(daysLeft);
  const label = data?.label || "TGPSC AEE 2026 Exam";
  const tag = customDate ? "Custom Date" : data?.isOfficial ? "Official Date" : "Expected Date";

  const box = (value: number, label: string) => (
    <div className="flex flex-col items-center">
      <div className="w-full flex items-center justify-center rounded-lg border bg-card shadow-sm py-2">
        <motion.span
          key={value}
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.12 }}
          className="text-xl sm:text-2xl font-bold tabular-nums"
        >
          {String(value).padStart(2, "0")}
        </motion.span>
      </div>
      <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
        {label}
      </span>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-40 bg-muted rounded mx-auto" />
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[3/2] bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-sm sm:text-base font-bold tracking-tight flex items-center justify-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            {label}
          </h2>
          <span className={`inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
            tag === "Official Date"
              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
          }`}>
            {tag}
          </span>
        </div>

        {isPast ? (
          <p className="text-center text-sm text-muted-foreground py-3">
            The exam date has passed. Set a new target date below.
          </p>
        ) : (
          <>
            {/* Countdown boxes */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {box(timeLeft.days, "DAYS")}
              {box(timeLeft.hours, "HOURS")}
              {box(timeLeft.minutes, "MINUTES")}
              {box(timeLeft.seconds, "SECONDS")}
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Jul 2025</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    progress > 90
                      ? "bg-red-500"
                      : progress > 70
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                />
              </div>
            </div>
          </>
        )}

        {/* Motivation */}
        <AnimatePresence mode="wait">
          <motion.p
            key={motivation}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-center font-medium text-muted-foreground"
          >
            {motivation}
          </motion.p>
        </AnimatePresence>

        {/* Custom date */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-4">
            <Popover open={showPicker} onOpenChange={setShowPicker}>
              <PopoverTrigger asChild>
                <button className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                  <Settings className="h-3 w-3" />
                  {customDate ? `Custom: ${format(new Date(customDate), "MMM d, yyyy")}` : "Set custom exam date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={customDate ? new Date(customDate) : undefined}
                  onSelect={handleSetCustomDate}
                  disabled={{ before: new Date() }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {customDate && (
              <button
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
