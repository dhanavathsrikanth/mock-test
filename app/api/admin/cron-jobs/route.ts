import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CRON_JOB_DEFS = [
  { name: "daily-question", label: "Assign Daily Question", schedule: "0 0 * * *", description: "Picks and assigns a random question for the day", max_duration: 60 },
  { name: "daily-question-alert", label: "Daily Question Alert", schedule: "0 7 * * *", description: "Sends push notification about today's question to opted-in users", max_duration: 120 },
  { name: "daily-reminder", label: "Daily Practice Reminder", schedule: "0 8 * * *", description: "Sends practice reminder to users who haven't practiced today", max_duration: 120 },
  { name: "streak-alert", label: "Streak Risk Alert", schedule: "0 21 * * *", description: "Warns users with streaks at risk of breaking", max_duration: 120 },
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: logs } = await supabase
    .from("cron_job_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(100);

  const logMap: Record<string, any[]> = {};
  (logs || []).forEach((log) => {
    if (!logMap[log.job_name]) logMap[log.job_name] = [];
    logMap[log.job_name].push(log);
  });

  const result = CRON_JOB_DEFS.map((def) => {
    const jobLogs = logMap[def.name] || [];
    const latest = jobLogs[0] || null;
    const nextRun = calculateNextRun(def.schedule);

    return {
      ...def,
      last_run: latest?.started_at || null,
      last_status: latest?.status || "never_run",
      last_message: latest?.message || null,
      next_run: nextRun,
    };
  });

  return NextResponse.json(result);
}

function calculateNextRun(cronExpression: string): string | null {
  const parts = cronExpression.split(" ");
  if (parts.length !== 5) return null;

  const [minute, hour, , ,] = parts;
  const now = new Date();
  const next = new Date(now);

  if (hour !== "*") {
    next.setHours(parseInt(hour), parseInt(minute) || 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
  } else {
    next.setMinutes(next.getMinutes() + 1);
  }

  return next.toISOString();
}
