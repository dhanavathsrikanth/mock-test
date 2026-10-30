import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getExamContext } from "@/lib/exam-context";
import { ExamPicker } from "./exam-picker";

export const metadata = { title: "Choose your exam | Exam Prep" };

export default async function OnboardingPage() {
  const { user, exam, stream } = await getExamContext();
  if (!user) redirect("/auth/login");
  const supabase = await createClient();
  const { data: exams, error } = await supabase.from("exams")
    .select("id, name, full_name, category, requires_stream").eq("is_active", true).order("name");
  if (error) throw error;
  const { data: streams, error: streamError } = await supabase.from("exam_streams")
    .select("id, exam_id, code, name").eq("is_active", true).order("name");
  if (streamError) throw streamError;
  return <main className="min-h-screen bg-background px-4 py-12">
    <div className="mx-auto max-w-lg space-y-6">
      <div><p className="text-sm font-medium text-primary">Exam Prep</p><h1 className="mt-2 text-3xl font-bold">Choose your exam</h1><p className="mt-2 text-muted-foreground">Your practice, subjects, results and revision will follow this selection. You can switch exams anytime.</p></div>
      {exams?.length ? <ExamPicker exams={exams} streams={streams || []} selectedId={exam?.id} selectedStreamId={stream?.id} /> : <p className="rounded-lg border p-4">No exams are available yet. Please check back soon.</p>}
      {exam && (!exam.requires_stream || stream) && <Link href="/dashboard" className="block text-center text-sm underline">Keep preparing for {exam.name}{stream ? ` · ${stream.name}` : ''}</Link>}
    </div>
  </main>;
}
