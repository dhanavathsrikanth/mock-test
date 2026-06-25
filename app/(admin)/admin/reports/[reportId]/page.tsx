import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ReportStatusBadge } from "@/components/admin/ReportStatusBadge";
import { MathText } from "@/components/MathText";
import Link from "next/link";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: report } = await supabase
    .from("question_reports")
    .select(`
      *,
      profiles!question_reports_reported_by_fkey(full_name, email),
      questions(*, subjects(name))
    `)
    .eq("id", reportId)
    .single();

  if (!report) redirect("/admin/reports");

  const { data: corrections } = await supabase
    .from("question_corrections")
    .select("*")
    .eq("question_id", report.question_id)
    .order("created_at", { ascending: false });

  const { count: otherReportsCount } = await supabase
    .from("question_reports")
    .select("*", { count: "exact", head: true })
    .eq("question_id", report.question_id)
    .neq("id", reportId);

  const reportTypeLabels: Record<string, string> = {
    wrong_answer: "Wrong Answer",
    unclear_question: "Unclear Question",
    typo_error: "Typo/Spelling",
    wrong_options: "Wrong Options",
    outdated_content: "Outdated Content",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/reports"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Reports
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold">Report Detail</h1>
        <p className="text-sm text-muted-foreground">ID: {reportId}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-sm">Question</h2>
            <p className="text-sm leading-relaxed">
              <MathText text={report.questions.question_text} />
            </p>
            <div className="space-y-1.5 text-sm">
              {[1, 2, 3, 4].map((n) => {
                const opt = (report.questions as any)[`option_${n}`];
                const isCorrect = n === report.questions.correct_option;
                return (
                  <div
                    key={n}
                    className={`rounded-lg border px-3 py-2 ${
                      isCorrect
                        ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                        : "border-border"
                    }`}
                  >
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border text-xs font-medium mr-2">
                      {String.fromCharCode(64 + n)}
                    </span>
                    {opt}
                    {isCorrect && (
                      <span className="ml-2 text-xs text-green-600 font-medium">
                        Correct
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {report.questions.explanation && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Explanation:</span>{" "}
                {report.questions.explanation}
              </div>
            )}
          </section>

          <section className="border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-sm">Correction History</h2>
            {corrections && corrections.length > 0 ? (
              <div className="space-y-2">
                {corrections.map((c) => (
                  <div key={c.id} className="border rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span className="font-medium text-foreground">
                        {c.field_changed.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                      <span>{format(new Date(c.created_at), "MMM d, yyyy HH:mm")}</span>
                    </div>
                    <p className="text-red-600 dark:text-red-400 line-through text-xs">
                      {c.old_value}
                    </p>
                    <p className="text-green-600 dark:text-green-400 text-xs mt-0.5">
                      {c.new_value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No corrections yet.</p>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="border rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-sm">Report Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <ReportStatusBadge status={report.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span>{reportTypeLabels[report.report_type] || report.report_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reporter</span>
                <span>{report.profiles?.full_name || "Unknown"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="text-xs">{report.profiles?.email || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{format(new Date(report.created_at), "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subject</span>
                <span>{report.questions.subjects?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Year</span>
                <span>{report.questions.year || "—"}</span>
              </div>
            </div>
          </section>

          {report.description && (
            <section className="border rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-2">Description</h2>
              <p className="text-sm text-muted-foreground">{report.description}</p>
            </section>
          )}

          {otherReportsCount !== null && otherReportsCount > 0 && (
            <section className="border rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-2">Other Reports</h2>
              <p className="text-sm text-muted-foreground">
                {otherReportsCount} other user{otherReportsCount !== 1 ? "s" : ""} reported this question
              </p>
            </section>
          )}

          <section className="border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-2">Admin Note</h2>
            <p className="text-sm text-muted-foreground">
              {report.admin_note || "No notes yet."}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
