import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, ExternalLink, BookOpen, HelpCircle } from "lucide-react";

export default async function AdminExamsPage() {
  const supabase = await createClient();
  const { data: exams } = await supabase.from("exams").select("id, name, full_name, category, exam_type, is_active, created_at").order("name");
  const { data: subjectCounts } = await supabase.from("subjects").select("exam_id, count:exam_id", { count: "exact", head: true });
  const { data: questionCounts } = await supabase.from("questions").select("exam_id, count:exam_id", { count: "exact", head: true });

  const subCounts: Record<string, number> = {};
  (subjectCounts || []).forEach((s: any) => { subCounts[s.exam_id] = (subCounts[s.exam_id] || 0) + 1; });
  const qCounts: Record<string, number> = {};
  (questionCounts || []).forEach((q: any) => { qCounts[q.exam_id] = (qCounts[q.exam_id] || 0) + 1; });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Exams</h1><p className="text-sm text-muted-foreground mt-0.5">{exams?.length || 0} exams</p></div>
        <Button size="sm" asChild><Link href="/admin/exams/new"><Plus className="h-4 w-4 mr-1.5" />Add New Exam</Link></Button>
      </div>
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Status</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Subjects</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Questions</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Category / Type</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
          </tr></thead>
          <tbody>
            {(exams || []).map((e) => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.full_name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center hidden sm:table-cell">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${e.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                    {e.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground hidden sm:table-cell">{subCounts[e.id] || 0}</td>
                <td className="px-4 py-3 text-center text-muted-foreground hidden md:table-cell">{qCounts[e.id] || 0}</td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground">{e.category || "—"}</span>
                  <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded ${e.exam_type === "central" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"}`}>
                    {e.exam_type || "state"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild><Link href={`/admin/exams/${e.id}`}><Pencil className="h-3.5 w-3.5" /></Link></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild><Link href={`/admin/exams/${e.id}`}><ExternalLink className="h-3.5 w-3.5" /></Link></Button>
                  </div>
                </td>
              </tr>
            ))}
            {(!exams || exams.length === 0) && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No exams yet. <Link href="/admin/exams/new" className="text-primary underline">Create one</Link></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
