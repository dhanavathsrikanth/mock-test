import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ExamStream } from "@/lib/stream-scope";

// The profile is the single source of truth; never fall back to another exam.
export const getExamContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, exam: null, profile: null, stream: null as ExamStream | null };
  const { data: profile, error } = await supabase.from("profiles")
    .select("target_exam_id, target_stream_id, full_name, email, role, avatar_url").eq("id", user.id).maybeSingle();
  if (error) throw error;
  if (!profile?.target_exam_id) return { user, exam: null, profile, stream: null as ExamStream | null };
  const { data: exam, error: examError } = await supabase.from("exams")
    .select("id, name, full_name, category, requires_stream").eq("id", profile.target_exam_id)
    .eq("is_active", true).maybeSingle();
  if (examError) throw examError;
  let stream: ExamStream | null = null;
  if (exam?.requires_stream && profile.target_stream_id) {
    const result = await supabase.from("exam_streams").select("id, exam_id, code, name")
      .eq("id", profile.target_stream_id).eq("exam_id", exam.id).eq("is_active", true).maybeSingle();
    if (result.error) throw result.error;
    stream = result.data;
  }
  return { user, exam, profile, stream };
});

export async function requireExamContext() {
  const { user, exam, profile, stream } = await getExamContext();
  if (!user) redirect("/auth/login");
  if (!exam || (exam.requires_stream && !stream)) redirect("/onboarding");
  return { user, exam, profile, stream };
}
