import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookmarksContent } from "./bookmarks-content";

export const metadata = { title: "Bookmarks | TGPSC AEE Civil Prep" };

export default async function BookmarksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const userId = user.id;

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select(
      `
      question_id,
      created_at,
      questions (
        id,
        question_text,
        option_1,
        option_2,
        option_3,
        option_4,
        correct_option,
        year,
        subject_id,
        exam_id,
        explanation,
        subjects ( name )
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const list = (bookmarks || []) as any[];

  const subjects = [
    ...new Set(
      list.map(
        (b) => (b.questions as any)?.subjects?.name
      ).filter(Boolean)
    ),
  ] as string[];

  const { data: reports } = await supabase
    .from("question_reports")
    .select("question_id")
    .eq("reported_by", userId);

  const reportedQuestionIds = (reports || []).map((r) => r.question_id);

  return (
    <BookmarksContent
      bookmarks={list}
      subjects={subjects}
      userId={userId}
      reportedQuestionIds={reportedQuestionIds}
    />
  );
}
