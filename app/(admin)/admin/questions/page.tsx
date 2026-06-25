"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  Search,
  Plus,
  Upload,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Check,
  ImageIcon,
  ImagePlus,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { MathText } from "@/components/MathText";

interface Question {
  id: string;
  exam_id: string;
  subject_id: string;
  year: number | null;
  paper: string | null;
  question_text: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_option: number;
  explanation: string | null;
  difficulty: string | null;
  created_at: string;
  topic_id: string | null;
  image_url: string | null;
  subjects?: { name: string } | { name: string }[];
}

interface Subject {
  id: string;
  name: string;
}

const SORT_OPTIONS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "reports", label: "Most Reported" },
  { key: "alpha", label: "Alphabetical" },
];

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [paperFilter, setPaperFilter] = useState("");
  const [explanationFilter, setExplanationFilter] = useState("all");
  const [reportsFilter, setReportsFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedQ, setSelectedQ] = useState<Question | null>(null);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const limit = 20;

  const supabase = createClient();

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const isReportBased = reportsFilter !== "all" || sort === "reports";

      if (isReportBased) {
        const { data: reportData } = await supabase
          .from("question_reports")
          .select("question_id");
        const rcMap: Record<string, number> = {};
        (reportData || []).forEach((r) => {
          rcMap[r.question_id] = (rcMap[r.question_id] || 0) + 1;
        });
        setReportCounts(rcMap);

        let query = supabase
          .from("questions")
          .select("*, subjects!inner(name)")
          .order("created_at", { ascending: false });

        if (search) query = query.ilike("question_text", `%${search}%`);
        if (subjectFilter) query = query.eq("subject_id", subjectFilter);
        if (yearFilter) query = query.eq("year", parseInt(yearFilter));
        if (paperFilter) query = query.eq("paper", paperFilter);
        if (explanationFilter === "yes") query = query.not("explanation", "is", null);
        if (explanationFilter === "no") query = query.is("explanation", null);

        const { data } = await query.limit(500);
        let result = (data || []) as Question[];

        const reportedIds = Object.keys(rcMap);
        if (reportsFilter === "yes") {
          result = result.filter((q) => reportedIds.includes(q.id));
        } else if (reportsFilter === "no") {
          result = result.filter((q) => !reportedIds.includes(q.id));
        }

        if (sort === "reports") {
          result = [...result].sort((a, b) => (rcMap[b.id] || 0) - (rcMap[a.id] || 0));
        }

        const from = (page - 1) * limit;
        const paged = result.slice(from, from + limit);
        setQuestions(paged);
        setTotal(result.length);
      } else {
        let query = supabase
          .from("questions")
          .select("*, subjects!inner(name)", { count: "exact" });

        if (search) query = query.ilike("question_text", `%${search}%`);
        if (subjectFilter) query = query.eq("subject_id", subjectFilter);
        if (yearFilter) query = query.eq("year", parseInt(yearFilter));
        if (paperFilter) query = query.eq("paper", paperFilter);
        if (explanationFilter === "yes") query = query.not("explanation", "is", null);
        if (explanationFilter === "no") query = query.is("explanation", null);

        switch (sort) {
          case "newest": query = query.order("created_at", { ascending: false }); break;
          case "oldest": query = query.order("created_at", { ascending: true }); break;
          case "alpha": query = query.order("question_text", { ascending: true }); break;
          default: query = query.order("created_at", { ascending: false }); break;
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, count } = await query;
        setQuestions((data || []) as Question[]);
        setTotal(count || 0);

        const { data: reportData } = await supabase
          .from("question_reports")
          .select("question_id");
        const rcMap: Record<string, number> = {};
        (reportData || []).forEach((r) => {
          rcMap[r.question_id] = (rcMap[r.question_id] || 0) + 1;
        });
        setReportCounts(rcMap);
      }
    } finally {
      setLoading(false);
    }
  }, [search, subjectFilter, yearFilter, paperFilter, explanationFilter, reportsFilter, sort, page, supabase]);

  useEffect(() => {
    const init = async () => {
      const { data: subjs } = await supabase.from("subjects").select("id, name").order("name");
      setSubjects(subjs || []);

      const { data: qs } = await supabase.from("questions").select("year");
      const uniqueYears = [...new Set((qs || []).map((q) => q.year).filter(Boolean))].sort((a, b) => b - a);
      setYears(uniqueYears as number[]);
    };
    init();
  }, [supabase]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const getSubject = (q: Question) => {
    if (!q.subjects) return "—";
    const s = Array.isArray(q.subjects) ? q.subjects[0] : q.subjects;
    return s?.name || "—";
  };

  const handleEdit = (q: Question) => {
    setEditingQ(q);
    setEditForm({
      question_text: q.question_text,
      option_1: q.option_1,
      option_2: q.option_2,
      option_3: q.option_3,
      option_4: q.option_4,
      correct_option: q.correct_option,
      explanation: q.explanation || "",
      image_url: q.image_url || "",
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!editingQ) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large. Max 5MB.");
      return;
    }
    setUploadingImg(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("questionId", editingQ.id);
    const res = await fetch("/api/admin/questions/upload-image", {
      method: "POST",
      body: formData,
    });
    setUploadingImg(false);
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to upload image");
      return;
    }
    const { url } = await res.json();
    setEditForm((prev: any) => ({ ...prev, image_url: url }));
  };

  const handleSaveEdit = async () => {
    if (!editingQ) return;
    setSaving(true);
    const res = await fetch(`/api/admin/questions/${editingQ.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    if (res.ok) {
      setEditingQ(null);
      fetchQuestions();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) {
      alert(error.message);
    } else {
      setDeleteConfirm(null);
      fetchQuestions();
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Questions Manager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} questions</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" asChild>
            <Link href="/admin/questions/new">
              <Plus className="h-4 w-4" />
              Add Question
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/questions/import">
              <Upload className="h-4 w-4" />
              Import CSV
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search question text..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-9"
          />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          suppressHydrationWarning
        >
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={yearFilter}
          onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          suppressHydrationWarning
        >
          <option value="">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={paperFilter}
          onChange={(e) => { setPaperFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          suppressHydrationWarning
        >
          <option value="">All papers</option>
          <option value="Paper-I">Paper-I</option>
          <option value="Paper-II">Paper-II</option>
        </select>
        <select
          value={explanationFilter}
          onChange={(e) => { setExplanationFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          suppressHydrationWarning
        >
          <option value="all">All explanations</option>
          <option value="yes">Has explanation</option>
          <option value="no">No explanation</option>
        </select>
        <select
          value={reportsFilter}
          onChange={(e) => { setReportsFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          suppressHydrationWarning
        >
          <option value="all">All reports</option>
          <option value="yes">Has reports</option>
          <option value="no">No reports</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          suppressHydrationWarning
        >
          {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-12">#</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-10">Img</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Question</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden md:table-cell">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Year</th>
                <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground hidden lg:table-cell">Answer</th>
                <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground hidden lg:table-cell">Reports</th>
                <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
              ) : questions.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No questions found</td></tr>
              ) : (
                questions.map((q, i) => (
                  <tr key={q.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{(page - 1) * limit + i + 1}</td>
                    <td className="px-4 py-3">
                      {q.image_url ? (
                        <Image
                          src={q.image_url}
                          alt=""
                          width={36}
                          height={36}
                          className="rounded object-cover w-9 h-9"
                        />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[280px]">
                      <MathText text={q.question_text} className="line-clamp-1" />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{getSubject(q)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{q.year || "—"}</td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-medium">
                        {String.fromCharCode(64 + q.correct_option)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      {reportCounts[q.id] ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          reportCounts[q.id] > 0 ? "bg-orange-50 dark:bg-orange-950/30 text-orange-600" : ""
                        }`}>
                          {reportCounts[q.id]}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedQ(q)}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleEdit(q)}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(q.id)}
                          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* View Modal */}
      {selectedQ && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSelectedQ(null)} />
          <div className="relative bg-background rounded-xl shadow-2xl border w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="font-semibold">Question Details</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedQ(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 rounded-full bg-muted">{getSubject(selectedQ)}</span>
                {selectedQ.year && <span className="px-2 py-0.5 rounded-full bg-muted">{selectedQ.year}</span>}
                {selectedQ.paper && <span className="px-2 py-0.5 rounded-full bg-muted">{selectedQ.paper}</span>}
                {selectedQ.difficulty && <span className="px-2 py-0.5 rounded-full bg-muted capitalize">{selectedQ.difficulty}</span>}
              </div>

              {selectedQ.image_url && (
                <div className="rounded-lg border overflow-hidden">
                  <Image
                    src={selectedQ.image_url}
                    alt="Question figure"
                    width={800}
                    height={400}
                    className="object-contain w-full h-auto max-h-72"
                  />
                </div>
              )}

              <MathText text={selectedQ.question_text} className="text-sm leading-relaxed" as="p" />

              <div className="space-y-1.5">
                {[1, 2, 3, 4].map((n) => {
                  const opt = (selectedQ as any)[`option_${n}`];
                  const isCorrect = n === selectedQ.correct_option;
                  return (
                    <div key={n} className={`rounded-lg border px-4 py-2.5 text-sm ${
                      isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-border"
                    }`}>
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-medium mr-3">
                        {String.fromCharCode(64 + n)}
                      </span>
                      {opt}
                      {isCorrect && <Check className="h-4 w-4 text-green-600 inline ml-2" />}
                    </div>
                  );
                })}
              </div>

              {selectedQ.explanation && (
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Explanation:</span> {selectedQ.explanation}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>Created: {format(new Date(selectedQ.created_at), "MMM d, yyyy HH:mm")}</span>
                {reportCounts[selectedQ.id] > 0 && (
                  <span className="text-orange-600">{reportCounts[selectedQ.id]} report(s)</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingQ && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-16">
          <div className="fixed inset-0 bg-black/60" onClick={() => setEditingQ(null)} />
          <div className="relative bg-background rounded-xl shadow-2xl border w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="font-semibold">Edit Question</h2>
              <Button variant="ghost" size="icon" onClick={() => setEditingQ(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              {/* Image in edit */}
              <div>
                <label className="text-xs font-medium">Question Image</label>
                {editForm.image_url ? (
                  <div className="relative mt-1 rounded-lg border overflow-hidden">
                    <div className="relative w-full max-h-48">
                      <Image
                        src={editForm.image_url}
                        alt="Question image"
                        width={400}
                        height={200}
                        className="object-contain w-full h-auto max-h-48"
                      />
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <label className="p-1.5 rounded-md bg-background/80 border hover:bg-background cursor-pointer transition-colors">
                        <ImagePlus className="h-4 w-4" />
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditForm((prev: any) => ({ ...prev, image_url: "" }))}
                        className="p-1.5 rounded-md bg-background/80 border hover:bg-background transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 mt-1 rounded-lg border border-dashed border-muted-foreground/30 cursor-pointer hover:bg-muted/20 transition-colors">
                    {uploadingImg ? (
                      <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="h-5 w-5 text-muted-foreground mb-1" />
                        <span className="text-[10px] text-muted-foreground">Upload image</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="hidden"
                      disabled={uploadingImg}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="text-xs font-medium">Question Text</label>
                <textarea
                  value={editForm.question_text}
                  onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
                />
              </div>
              {[1, 2, 3, 4].map((n) => (
                <div key={n}>
                  <label className="text-xs font-medium">Option {String.fromCharCode(64 + n)}</label>
                  <input
                    value={editForm[`option_${n}`]}
                    onChange={(e) => setEditForm({ ...editForm, [`option_${n}`]: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium">Correct Option</label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setEditForm({ ...editForm, correct_option: n })}
                      className={`h-8 w-8 rounded-lg border text-sm font-medium transition-all ${
                        editForm.correct_option === n
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Explanation</label>
                <textarea
                  value={editForm.explanation}
                  onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveEdit} disabled={saving || uploadingImg}>
                  {(saving || uploadingImg) && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  {uploadingImg ? "Uploading..." : "Save Changes"}
                </Button>
                <Button variant="ghost" onClick={() => setEditingQ(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-background rounded-xl shadow-2xl border w-full max-w-sm mx-4 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold">Delete Question</h3>
              <p className="text-sm text-muted-foreground mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
