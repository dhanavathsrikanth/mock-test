import { requireExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import { BookmarksContent, type BookmarkItem } from "./bookmarks-content";

export const metadata = { title: "Bookmarks | Exam Prep" };

export default async function BookmarksPage() {
  const supabase = await createClient();
  const { user, exam, stream } = await requireExamContext();

  const userId = user.id;

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select(
      `
      question_id,
      created_at,
      questions!inner (
        id,
        question_text,
        option_1,
        option_2,
        option_3,
        option_4,
        correct_option,
        correct_options,
        correct_option_sets,
        question_type,
        marks_to_all,
        answer_min,
        answer_max,
        answer_ranges,
        year,
        subject_id,
        exam_id,
        stream_id,
        explanation,
        subjects ( name )
      )
    `
    )
    .eq("user_id", userId)
    .eq("questions.exam_id", exam.id)
    .or(stream ? `stream_id.eq.${stream.id}` : "stream_id.is.null", { referencedTable: "questions" })
    .order("created_at", { ascending: false });

  const list = (bookmarks || []) as unknown as BookmarkItem[];

  const subjects = [
    ...new Set(
      list.map(
        (b) => b.questions.subjects?.name
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
