import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return user;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const user = await checkAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, adminNote } = body;

  if (!status && adminNote === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updateData: Record<string, string | null> = {};
  if (status) updateData.status = status;
  if (adminNote !== undefined) updateData.admin_note = adminNote;
  if (status === "resolved" || status === "rejected") {
    updateData.resolved_by = user.id;
    updateData.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("question_reports")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, report: data });
}
