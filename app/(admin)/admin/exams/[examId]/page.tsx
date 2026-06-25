import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExamDetailClient } from "./exam-detail-client";

export default async function ExamDetailPage(props: { params: Promise<{ examId: string }> }) {
  const { examId } = await props.params;
  const supabase = await createClient();
  const { data: exam } = await supabase.from("exams").select("*").eq("id", examId).single();
  if (!exam) notFound();

  const { data: subjects } = await supabase.from("subjects").select("id, name, slug, icon, is_active, created_at").eq("exam_id", examId).order("name");
  const { data: topicCounts } = await supabase.from("topics").select("subject_id, count:subject_id", { count: "exact", head: true });
  const { data: questionCounts } = await supabase.from("questions").select("subject_id, count:subject_id", { count: "exact", head: true }).eq("exam_id", examId);

  const tCounts: Record<string, number> = {};
  (topicCounts || []).forEach((t: any) => { tCounts[t.subject_id] = (tCounts[t.subject_id] || 0) + 1; });
  const qCounts: Record<string, number> = {};
  (questionCounts || []).forEach((q: any) => { qCounts[q.subject_id] = (qCounts[q.subject_id] || 0) + 1; });

  return <ExamDetailClient exam={exam} subjects={(subjects || []).map((s) => ({ ...s, topics: tCounts[s.id] || 0, questions: qCounts[s.id] || 0 }))} />;
}
