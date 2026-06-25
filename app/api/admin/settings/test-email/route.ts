import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role, email, full_name").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { fromName, fromEmail } = await req.json();
  const sender = fromName || "TGPSC Prep";

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Resend not configured. Set RESEND_API_KEY." }, { status: 500 });
  }

  if (!profile.email) {
    return NextResponse.json({ error: "Your admin account has no email address" }, { status: 400 });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `${sender} <noreply@tgpscprep.com>`,
      to: profile.email,
      subject: "Test Email from TGPSC Prep Settings",
      text: `Hi ${profile.full_name || "Admin"},\n\nThis is a test email from your TGPSC Prep admin settings.\n\nIf you received this, your email configuration is working correctly.\n\nFrom: ${sender}\nFrom Email: ${fromEmail || "not set"}\n\nBest,\nThe TGPSC Prep Team`,
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
