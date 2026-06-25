import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CRON_JOB_URLS: Record<string, string> = {
  "daily-question": "/api/cron/daily-question",
  "daily-question-alert": "/api/cron/daily-question-alert",
  "daily-reminder": "/api/cron/daily-reminder",
  "streak-alert": "/api/cron/streak-alert",
};

export async function POST(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name } = await params;
  const url = CRON_JOB_URLS[name];

  if (!url) {
    return NextResponse.json({ error: `Unknown cron job: ${name}` }, { status: 404 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const logId = crypto.randomUUID();
  await supabase.from("cron_job_logs").insert({
    id: logId,
    job_name: name,
    status: "running",
    started_at: new Date().toISOString(),
  });

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const response = await fetch(`${origin}${url}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    await supabase.from("cron_job_logs").update({
      status: response.ok ? "success" : "failed",
      finished_at: new Date().toISOString(),
      message: response.ok ? JSON.stringify(result) : result.error || "Unknown error",
    }).eq("id", logId);

    if (!response.ok) {
      return NextResponse.json({ error: result.error || "Job failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    await supabase.from("cron_job_logs").update({
      status: "failed",
      finished_at: new Date().toISOString(),
      message: err instanceof Error ? err.message : "Request failed",
    }).eq("id", logId);

    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to trigger job" }, { status: 500 });
  }
}
