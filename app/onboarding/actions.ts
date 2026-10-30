"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function selectExam(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const examId = formData.get("examId");
  if (typeof examId !== "string") return { error: "Choose an exam." };
  const { data: exam, error } = await supabase.from("exams").select("id, requires_stream")
    .eq("id", examId).eq("is_active", true).maybeSingle();
  if (error || !exam) return { error: "This exam is unavailable. Please choose another." };
  let streamId: string | null = null;
  if (exam.requires_stream) {
    const requested = formData.get("streamId");
    if (typeof requested !== "string" || !requested) return { error: "Choose your stream." };
    const { data: stream, error: streamError } = await supabase.from("exam_streams").select("id")
      .eq("id", requested).eq("exam_id", exam.id).eq("is_active", true).maybeSingle();
    if (streamError || !stream) return { error: "Choose an available stream for this exam." };
    streamId = stream.id;
  }
  const selection = { target_exam_id: exam.id, target_stream_id: streamId };

  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("id").eq("id", user.id).maybeSingle();
  if (profileError) return { error: "Unable to load your profile. Please try again." };
  const result = profile
    ? await supabase.from("profiles").update(selection).eq("id", user.id).select("id").single()
    : await supabase.from("profiles").insert({ id: user.id, email: user.email || "", full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User", ...selection }).select("id").single();
  if (result.error) return { error: "Unable to save your exam. Please try again." };
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
