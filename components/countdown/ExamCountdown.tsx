"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, ArrowUpRight, RotateCcw, Clock3, ChevronDown, Check } from "lucide-react";
import { countdownRemaining, countdownTarget, defaultExamDate, GATE_2027_COUNTDOWN } from "@/lib/exam-countdown";
import styles from "./countdown.module.css";

interface CountdownData { label: string; examDate: string | null; isOfficial: boolean }

export function ExamCountdown({ examId, examName, userId }: { examId: string; examName: string; userId: string }) {
  const storageKey = `exam-prep:countdown:${userId}:${examId}`;
  const [data, setData] = useState<CountdownData | null>(null);
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState<Date | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const reduceMotion = useReducedMotion();
  const fallback = defaultExamDate(examName);
  const date = customDate || data?.examDate || fallback;
  const target = countdownTarget(date);
  const usingFallback = !customDate && !data?.examDate && !!fallback;
  const remaining = target !== null && now !== null ? countdownRemaining(target, now) : null;
  const expired = target !== null && now !== null && target <= now;
  const dateLabel = target === null ? null : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(target);
  const weekday = target === null ? null : new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" }).format(target);
  const todayKey = now === null ? null : new Date(now + 330 * 60000).toISOString().slice(0, 10);
  const canApply = !!draftDate && !!todayKey && format(draftDate, "yyyy-MM-dd") >= todayKey;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setCustomDate(stored && countdownTarget(stored) !== null ? stored : null);
    } catch { setStorageError(true); }
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/exam-countdown", { signal: controller.signal });
        if (!response.ok) throw new Error("Countdown unavailable");
        const json = await response.json();
        if (!controller.signal.aborted) setData(json);
      } catch { if (!controller.signal.aborted) setError(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load();
    return () => controller.abort();
  }, [storageKey]);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const interval = setInterval(() => { if (!document.hidden) update(); }, 1000);
    document.addEventListener("visibilitychange", update);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, []);

  function changeDate(value: string | null) {
    if (value && countdownTarget(value) === null) return;
    setCustomDate(value);
    try {
      if (value) localStorage.setItem(storageKey, value); else localStorage.removeItem(storageKey);
      setStorageError(false);
    } catch { setStorageError(true); }
  }
  function openPicker(open: boolean) {
    if (open) setDraftDate(date ? parseISO(date.slice(0, 10)) : undefined);
    setPickerOpen(open);
  }
  function applyDate() {
    if (!canApply || !draftDate) return;
    changeDate(format(draftDate, "yyyy-MM-dd"));
    setPickerOpen(false);
  }

  return <Card className={styles.countdown}>
    <div className={styles.header}><span className={styles.icon}><CalendarDays size={19} /></span><div><span className={styles.eyebrow}>Your exam countdown</span><h2>{examName}</h2></div><span className={styles.badge}>{customDate ? "Personal" : usingFallback || data?.isOfficial ? "Official" : "Target"}</span></div>
    <div className={styles.targetDate}><span>{customDate ? "Your paper date" : usingFallback ? "Exams begin" : data?.isOfficial ? "Official date" : "Target date"}</span><strong>{dateLabel ?? (loading ? "Loading…" : "Choose a date")}</strong>{weekday && <small>{weekday} · IST</small>}</div>
    {expired ? <p className={styles.message}>This target date has passed. Choose your next exam date below.</p> : remaining ? <>
      <div className={styles.digits} role="timer" aria-label={`${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds remaining`}>
        {Object.entries(remaining).map(([unit, value]) => <div key={unit}><div className={styles.digitBox}><motion.span key={value} initial={reduceMotion ? false : { y: 8, opacity: 0, rotateX: -30 }} animate={{ y: 0, opacity: 1, rotateX: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>{String(value).padStart(2, "0")}</motion.span></div><span className={styles.unit}>{unit === "minutes" ? "Mins" : unit === "seconds" ? "Secs" : unit}</span></div>)}
      </div>
      <div className={styles.runway}><Clock3 size={14} /><span>{remaining.days >= 7 ? <><strong>{Math.floor(remaining.days / 7)} full {Math.floor(remaining.days / 7) === 1 ? "week" : "weeks"}</strong> remaining to prepare</> : <><strong>{remaining.days} {remaining.days === 1 ? "day" : "days"}</strong> remaining to prepare</>}</span></div>
    </> : <p className={styles.message} role="status">{loading ? "Preparing your countdown…" : error ? "Unable to load the exam date. Set a personal target below." : "Choose your exam date to start counting down."}</p>}
    {usingFallback && <div className={styles.scheduleNote}><p>Counts to the first exam day. Your paper may be on a different date.</p><a href={GATE_2027_COUNTDOWN.source} target="_blank" rel="noreferrer">Official GATE schedule<ArrowUpRight size={12} /></a></div>}
    <div className={styles.actions}>
      <Popover open={pickerOpen} onOpenChange={openPicker}>
        <PopoverTrigger asChild><Button variant="outline" className={styles.dateButton}><CalendarDays size={15} />{customDate ? "Change paper date" : "Choose your paper date"}<ChevronDown size={14} /></Button></PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} collisionPadding={12} className={styles.picker} aria-label="Choose your paper date">
          <div className={styles.pickerHeading}><h3>Set your paper date</h3><p>Saved for {examName} on this browser. Target time is midnight IST.</p></div>
          <div className={styles.calendarViewport}><Calendar mode="single" selected={draftDate} onSelect={setDraftDate} defaultMonth={draftDate || (todayKey ? parseISO(todayKey) : undefined)} disabled={day => !!todayKey && format(day, "yyyy-MM-dd") < todayKey} className="relative mx-auto w-fit" classNames={{ nav: "absolute top-3 left-3 right-3 z-10 flex items-center justify-between", button_previous: "inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent", button_next: "inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent", month_caption: "flex h-8 items-center justify-center px-9", day_button: "inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-normal hover:bg-accent", weekday: "w-9 rounded-md text-xs font-normal text-muted-foreground" }} /></div>
          <div className={styles.pickerFooter}><p>{draftDate ? format(draftDate, "EEE, d MMM yyyy") : "Select a date"}</p><Button type="button" size="sm" onClick={applyDate} disabled={!canApply}><Check size={14} />Apply date</Button></div>
        </PopoverContent>
      </Popover>
      {customDate && <Button type="button" variant="ghost" size="sm" className={styles.reset} onClick={() => changeDate(null)}><RotateCcw size={13} />Use default date</Button>}
    </div>
    {storageError && <p className={styles.message} role="status">This date applies for this visit. Your browser could not save it.</p>}
  </Card>;
}
