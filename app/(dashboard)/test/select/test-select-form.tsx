"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ClipboardList,
  BookOpen,
  SlidersHorizontal,
  Play,
  Clock,
} from "lucide-react";

interface Subject {
  id: string;
  name: string;
}

interface TestSelectFormProps {
  userId: string;
  examId: string;
  subjects: Subject[];
  years: number[];
}

type Mode = "full_mock" | "topic_wise" | "custom";

const QUESTION_COUNTS = [10, 25, 50, 100, 150];

const MODE_INFO: Record<
  Mode,
  { title: string; desc: string; icon: typeof ClipboardList }
> = {
  full_mock: {
    title: "Full Mock Test",
    desc: "150 Questions · 150 min",
    icon: ClipboardList,
  },
  topic_wise: {
    title: "Subject-wise Test",
    desc: "Pick a subject to practice",
    icon: BookOpen,
  },
  custom: {
    title: "Custom Test",
    desc: "Flexible — pick year, subject & count",
    icon: SlidersHorizontal,
  },
};

export function TestSelectForm({
  userId,
  examId,
  subjects,
  years,
}: TestSelectFormProps) {
  const router = useRouter();
  const getSupabase = () => createClient();

  const [mode, setMode] = useState<Mode>("full_mock");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(
    new Set()
  );
  const [questionCount, setQuestionCount] = useState(50);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAllSubjects = selectedSubjects.size === 0;

  const toggleSubject = (id: string) => {
    const next = new Set(selectedSubjects);
    if (mode === "topic_wise") {
      if (next.has(id)) {
        next.clear();
      } else {
        next.clear();
        next.add(id);
      }
    } else if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedSubjects(next);
  };

  const canStart = (): boolean => {
    if (mode === "full_mock") return true;
    if (mode === "topic_wise") return selectedSubjects.size === 1;
    return selectedSubjects.size > 0 || selectedYear !== null;
  };

  const handleStart = async () => {
    if (!canStart()) return;
    setLoading(true);
    setError(null);

    if (mode === "full_mock") {
      const { data: session, error: err } = await getSupabase()
        .from("test_sessions")
        .insert({
          user_id: userId,
          exam_id: examId,
          subject_id: null,
          year: null,
          mode: "full_mock",
          total_questions: 150,
          duration_minutes: 150,
          status: "in_progress",
        })
        .select()
        .single();

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      router.push(`/test/${session.id}`);
      return;
    }

    if (mode === "topic_wise") {
      const subjectId = Array.from(selectedSubjects)[0];
      const { data: session, error: err } = await getSupabase()
        .from("test_sessions")
        .insert({
          user_id: userId,
          exam_id: examId,
          subject_id: subjectId,
          year: selectedYear,
          mode: "topic_wise",
          total_questions: questionCount,
          duration_minutes: timerEnabled ? questionCount : 0,
          status: "in_progress",
        })
        .select()
        .single();

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      router.push(`/test/${session.id}`);
      return;
    }

    const subjectId =
      selectedSubjects.size === 1 ? Array.from(selectedSubjects)[0] : null;

    const { data: session, error: err } = await getSupabase()
      .from("test_sessions")
      .insert({
        user_id: userId,
        exam_id: examId,
        subject_id: subjectId,
        year: selectedYear,
        mode: "custom",
        total_questions: questionCount,
        duration_minutes: timerEnabled ? questionCount : 0,
        status: "in_progress",
      })
      .select()
      .single();

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    router.push(`/test/${session.id}`);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Test</h1>
        <p className="text-muted-foreground mt-1">
          Configure your test settings and start practicing
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Test Mode</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.entries(MODE_INFO) as [Mode, (typeof MODE_INFO)[Mode]][]).map(
            ([key, info]) => {
              const Icon = info.icon;
              const selected = mode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setMode(key);
                    setError(null);
                    if (key !== "custom") {
                      setQuestionCount(50);
                      setTimerEnabled(true);
                    }
                    if (key === "topic_wise") {
                      setSelectedSubjects(new Set());
                    }
                    if (key === "full_mock") {
                      setSelectedSubjects(new Set());
                      setSelectedYear(null);
                    }
                  }}
                  className={`relative rounded-xl border p-4 text-left transition-all ${
                    selected
                      ? "border-primary ring-1 ring-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg w-fit mb-3 ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="font-semibold text-sm">{info.title}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {info.desc}
                  </p>
                </button>
              );
            }
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="year" className="text-base font-semibold mb-2 block">
          Year
        </Label>
        <select
          id="year"
          value={selectedYear ?? ""}
          onChange={(e) => {
            setSelectedYear(e.target.value ? Number(e.target.value) : null);
            setError(null);
          }}
          className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All Years</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label className="text-base font-semibold mb-2 block">
          {mode === "topic_wise" ? "Subject" : "Subjects"}
        </Label>
        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => {
            const active = selectedSubjects.has(subject.id);
            const isDisabled = mode === "full_mock";
            return (
              <button
                key={subject.id}
                type="button"
                onClick={() => {
                  if (isDisabled) return;
                  toggleSubject(subject.id);
                  setError(null);
                }}
                disabled={isDisabled}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : isDisabled
                    ? "opacity-40 cursor-not-allowed bg-muted"
                    : "bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {subject.name}
              </button>
            );
          })}
          {isAllSubjects && mode !== "full_mock" && (
            <span className="text-xs text-muted-foreground self-center ml-1">
              (all subjects)
            </span>
          )}
          {mode === "full_mock" && (
            <span className="text-xs text-muted-foreground self-center ml-1">
              (all subjects included)
            </span>
          )}
        </div>
      </div>

      {mode === "custom" && (
        <div>
          <Label className="text-base font-semibold mb-2 block">
            Number of Questions
          </Label>
          <div className="flex flex-wrap gap-2">
            {QUESTION_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setQuestionCount(count)}
                className={`inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  questionCount === count
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-input hover:bg-accent"
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "custom" && (
        <div>
          <Label className="text-base font-semibold mb-2 block">Timer</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTimerEnabled(true)}
              className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                timerEnabled
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-input hover:bg-accent"
              }`}
            >
              <Clock className="h-4 w-4" />
              On ({questionCount} min)
            </button>
            <button
              type="button"
              onClick={() => setTimerEnabled(false)}
              className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                !timerEnabled
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-input hover:bg-accent"
              }`}
            >
              <Clock className="h-4 w-4" />
              Off (Practice Mode)
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-5">
        <div className="text-sm space-y-1 text-muted-foreground mb-4">
          <p>
            <span className="font-medium text-foreground">Mode:</span>{" "}
            {MODE_INFO[mode].title}
          </p>
          <p>
            <span className="font-medium text-foreground">Questions:</span>{" "}
            {mode === "full_mock" ? 150 : questionCount}
          </p>
          <p>
            <span className="font-medium text-foreground">Duration:</span>{" "}
            {mode === "full_mock"
              ? "150 min"
              : timerEnabled
              ? `${questionCount} min`
              : "Untimed"}
          </p>
          {selectedYear && (
            <p>
              <span className="font-medium text-foreground">Year:</span>{" "}
              {selectedYear}
            </p>
          )}
          {!isAllSubjects && (
            <p>
              <span className="font-medium text-foreground">Subjects:</span>{" "}
              {subjects
                .filter((s) => selectedSubjects.has(s.id))
                .map((s) => s.name)
                .join(", ")}
            </p>
          )}
          {isAllSubjects && (
            <p>
              <span className="font-medium text-foreground">Subjects:</span> All
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive mb-3">{error}</p>
        )}

        <Button
          onClick={handleStart}
          disabled={loading || !canStart()}
          size="lg"
          className="w-full sm:w-auto"
        >
          <Play className="h-4 w-4" />
          {loading ? "Creating..." : "Start Test"}
        </Button>
      </div>
    </div>
  );
}
