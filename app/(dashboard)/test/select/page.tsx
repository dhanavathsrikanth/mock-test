import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TestSelectForm } from "./test-select-form";

export const metadata = { title: "New Test | TGPSC AEE Civil Prep" };

export default async function TestSelectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const userId = user.id;

  const { data: exam } = await supabase
    .from("exams")
    .select("id")
    .eq("name", "TSPSC AEE")
    .single();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("exam_id", exam?.id)
    .order("name");

  const { data: yearsData } = await supabase
    .from("questions")
    .select("year")
    .eq("exam_id", exam?.id)
    .not("year", "is", null)
    .order("year", { ascending: false });

  const years = [
    ...new Set((yearsData || []).map((y) => y.year).filter(Boolean)),
  ] as number[];

  return (
    <TestSelectForm
      userId={userId}
      examId={exam?.id || ""}
      subjects={subjects || []}
      years={years}
    />
  );
}
