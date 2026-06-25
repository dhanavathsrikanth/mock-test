import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return user;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await checkAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await req.json();

  if (!reportId) {
    return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
  }

  const { data: report } = await supabase
    .from("question_reports")
    .select(`
      id, status,
      question_id,
      questions:question_id(id, question_text),
      profiles:reported_by(email, full_name)
    `)
    .eq("id", reportId)
    .single();

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const questions = Array.isArray(report.questions) ? report.questions[0] : report.questions;
  const reporterProfile = Array.isArray(report.profiles) ? report.profiles[0] : report.profiles;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({
      success: false,
      message: "Resend not configured. Set RESEND_API_KEY environment variable.",
    });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const reporterEmail = reporterProfile?.email;
    const reporterName = reporterProfile?.full_name || "User";
    const questionPreview = questions?.question_text?.slice(0, 80) || "";

    if (!reporterEmail) {
      return NextResponse.json({ error: "Reporter has no email" }, { status: 400 });
    }

    await resend.emails.send({
      from: "TGPSC Prep <noreply@tgpscprep.com>",
      to: reporterEmail,
      subject: "Your Question Report Has Been Reviewed",
      text: `Hi ${reporterName},\n\nYour report for "${questionPreview}..." has been reviewed and the question has been corrected. Thank you for helping improve our question bank!\n\nBest,\nThe TGPSC Prep Team`,
    });

    return NextResponse.json({ success: true, notified: reporterEmail });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
