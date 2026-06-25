"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReportStatusBadge } from "@/components/admin/ReportStatusBadge";
import { MathText } from "@/components/MathText";
import { ReportButton } from "@/components/report/ReportButton";
import {
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Clock,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Send,
} from "lucide-react";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "under_review", label: "Under Review" },
  { key: "resolved", label: "Resolved" },
  { key: "rejected", label: "Rejected" },
];

const REPORT_TYPE_LABELS: Record<string, string> = {
  wrong_answer: "Wrong Answer",
  unclear_question: "Unclear Question",
  typo_error: "Typo/Spelling",
  wrong_options: "Wrong Options",
  outdated_content: "Outdated Content",
  other: "Other",
};

const REPORT_TYPE_COLORS: Record<string, string> = {
  wrong_answer: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200",
  unclear_question: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200",
  typo_error: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200",
  wrong_options: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200",
  outdated_content: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200",
  other: "bg-gray-50 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300 border-gray-200",
};

interface Report {
  id: string;
  question_id: string;
  reported_by: string;
  report_type: string;
  description: string | null;
  status: "pending" | "under_review" | "resolved" | "rejected";
  admin_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: { full_name: string; email: string } | null;
  questions: {
    id: string;
    question_text: string;
    year: number | null;
    subject_id: string;
    subjects: { name: string } | null;
  };
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 20;

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusTab !== "all") params.set("status", statusTab);
      if (typeFilter) params.set("reportType", typeFilter);
      if (subjectFilter) params.set("subjectId", subjectFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/admin/reports?${params}`);
      const data = await res.json();
      setReports(data.reports || []);
      setTotal(data.total || 0);
      setStats(data.stats);
      if (data.subjects) setSubjects(data.subjects);
    } finally {
      setLoading(false);
    }
  }, [statusTab, typeFilter, subjectFilter, searchQuery, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateStatus = async (reportId: string, status: string) => {
    const res = await fetch(`/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setSelectedReport(null);
      fetchReports();
    }
  };

  const updateNote = async (reportId: string, adminNote: string) => {
    await fetch(`/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNote }),
    });
  };

  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const handleSaveNote = async () => {
    if (!selectedReport || !noteDraft.trim()) return;
    setSavingNote(true);
    await updateNote(selectedReport.id, noteDraft);
    setSavingNote(false);
    setSelectedReport({ ...selectedReport, admin_note: noteDraft });
  };

  const handleNotify = async (reportId: string) => {
    const res = await fetch("/api/admin/reports/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    if (res.ok) {
      alert("Notification sent to reporter!");
    } else {
      const data = await res.json();
      alert(data.message || data.error || "Failed to send notification");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Question Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review and manage user-submitted question reports
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Pending"
          value={stats?.total_pending ?? "—"}
          color="text-yellow-600 dark:text-yellow-400"
          bg="bg-yellow-50 dark:bg-yellow-950/20"
          badge={stats?.total_pending > 10 ? `${stats.total_pending}` : undefined}
        />
        <StatCard
          label="Under Review"
          value={stats?.total_under_review ?? "—"}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-950/20"
        />
        <StatCard
          label="Resolved This Week"
          value={stats?.total_resolved_this_week ?? "—"}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-50 dark:bg-green-950/20"
        />
        <StatCard
          label="Rejected"
          value={stats?.total_rejected ?? "—"}
          color="text-red-600 dark:text-red-400"
          bg="bg-red-50 dark:bg-red-950/20"
        />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusTab(tab.key); setPage(1); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                statusTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search question text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">All types</option>
            {Object.entries(REPORT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">ID</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Question</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Reporter</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No reports found
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    isExpanded={expandedId === report.id}
                    onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
                    onSelect={() => setSelectedReport(report)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Detail Slide-over */}
      {selectedReport && (
        <ReportDetailPanel
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onStatusChange={updateStatus}
          onRefresh={fetchReports}
          onNotify={handleNotify}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  bg,
  badge,
}: {
  label: string;
  value: string | number;
  color: string;
  bg: string;
  badge?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>
        {value}
        {badge && (
          <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
            {badge}
          </span>
        )}
      </p>
    </div>
  );
}

function ReportRow({
  report,
  isExpanded,
  onToggle,
  onSelect,
}: {
  report: Report;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const qText = report.questions?.question_text || "";
  const preview = qText.length > 50 ? qText.slice(0, 50) + "..." : qText;

  return (
    <>
      <tr
        className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={onSelect}
      >
        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
          {report.id.slice(0, 8)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="truncate max-w-[200px] lg:max-w-[300px]">
              {preview}
            </span>
            {report.questions?.year && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {report.questions.year}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <span
            className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full border ${
              REPORT_TYPE_COLORS[report.report_type] || ""
            }`}
          >
            {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
          </span>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
          {report.profiles?.full_name || "Unknown"}
        </td>
        <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
          {format(new Date(report.created_at), "MMM d, yyyy")}
        </td>
        <td className="px-4 py-3">
          <ReportStatusBadge status={report.status} />
        </td>
        <td className="px-4 py-3 text-right">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-muted/20">
          <td colSpan={7} className="px-4 py-4">
            <div className="text-sm space-y-2 max-w-2xl">
              <p className="leading-relaxed">{qText}</p>
              {report.description && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Note:</span> {report.description}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
                  Open Detail Panel
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ReportDetailPanel({
  report,
  onClose,
  onStatusChange,
  onRefresh,
  onNotify,
}: {
  report: Report;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onRefresh: () => void;
  onNotify: (id: string) => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qText, setQText] = useState(report.questions?.question_text || "");
  const [opt1, setOpt1] = useState("");
  const [opt2, setOpt2] = useState("");
  const [opt3, setOpt3] = useState("");
  const [opt4, setOpt4] = useState("");
  const [correctOpt, setCorrectOpt] = useState<number>(1);
  const [explanation, setExplanation] = useState("");
  const [noteDraft, setNoteDraft] = useState(report.admin_note || "");
  const [savingNote, setSavingNote] = useState(false);

  const [questionData, setQuestionData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data } = await supabase
        .from("questions")
        .select("*")
        .eq("id", report.question_id)
        .single();
      if (data) {
        setQuestionData(data);
        setQText(data.question_text);
        setOpt1(data.option_1);
        setOpt2(data.option_2);
        setOpt3(data.option_3);
        setOpt4(data.option_4);
        setCorrectOpt(data.correct_option);
        setExplanation(data.explanation || "");
      }
    }
    load();
  }, [report.question_id]);

  const handleSaveCorrection = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/questions/${report.question_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_text: qText,
          option_1: opt1,
          option_2: opt2,
          option_3: opt3,
          option_4: opt4,
          correct_option: correctOpt,
          explanation,
          reportId: report.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditMode(false);
        onRefresh();
        onClose();
      } else {
        alert(data.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    const res = await fetch(`/api/admin/reports/${report.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNote: noteDraft }),
    });
    setSavingNote(false);
    if (res.ok) {
      alert("Note saved");
    }
  };

  const statusActions = [
    { status: "pending", label: "Pending", disabled: report.status === "pending" },
    { status: "under_review", label: "Under Review", disabled: report.status === "under_review" },
    { status: "resolved", label: "Resolved", disabled: report.status === "resolved" },
    { status: "rejected", label: "Rejected", disabled: report.status === "rejected" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-background border-l shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-semibold">Report Detail</h2>
            <p className="text-xs text-muted-foreground">ID: {report.id.slice(0, 8)}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-6">
          {/* Section A - Report Info */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Report Information
            </h3>
            <div className="space-y-3">
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <p className="text-sm leading-relaxed"><MathText text={report.questions?.question_text || ""} /></p>
                {questionData && (
                  <div className="space-y-1 text-xs">
                    {[1, 2, 3, 4].map((n) => {
                      const opt = (questionData as any)[`option_${n}`];
                      const isCorrect = n === questionData.correct_option;
                      return (
                        <div
                          key={n}
                          className={`rounded px-2 py-1 ${
                            isCorrect
                              ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300"
                              : "text-muted-foreground"
                          }`}
                        >
                          {String.fromCharCode(64 + n)}. {opt}
                          {isCorrect && <span className="ml-1.5 text-[10px] font-medium">(Correct)</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-1.5 font-medium">
                    {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Reported by:</span>
                  <span className="ml-1.5 font-medium">
                    {report.profiles?.full_name || "Unknown"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <span className="ml-1.5 font-medium">
                    {format(new Date(report.created_at), "MMM d, yyyy HH:mm")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-1.5">
                    <ReportStatusBadge status={report.status} />
                  </span>
                </div>
              </div>

              {report.description && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Reporter&apos;s description:</p>
                  <p className="text-sm mt-0.5">{report.description}</p>
                </div>
              )}
            </div>
          </section>

          {/* Section B - Admin Actions: Status */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Status
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {statusActions.map((action) => (
                <Button
                  key={action.status}
                  size="sm"
                  variant={report.status === action.status ? "default" : "outline"}
                  disabled={action.disabled}
                  onClick={() => onStatusChange(report.id, action.status)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </section>

          {/* Section C - Edit Question */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Question
              </h3>
              {!editMode ? (
                <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                  Edit & Correct
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
              )}
            </div>

            {editMode && questionData ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Question Text</label>
                  <textarea
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((n) => {
                    const val = [opt1, opt2, opt3, opt4][n - 1];
                    const setter = [setOpt1, setOpt2, setOpt3, setOpt4][n - 1];
                    return (
                      <div key={n}>
                        <label className="text-xs font-medium">
                          Option {String.fromCharCode(64 + n)}
                        </label>
                        <input
                          value={val}
                          onChange={(e) => setter(e.target.value)}
                          className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    );
                  })}
                </div>
                <div>
                  <label className="text-xs font-medium">Correct Option</label>
                  <div className="flex gap-2 mt-1">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        onClick={() => setCorrectOpt(n)}
                        className={`h-8 w-8 rounded-lg border text-sm font-medium transition-all ${
                          correctOpt === n
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
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none"
                  />
                </div>
                <Button onClick={handleSaveCorrection} disabled={saving} className="w-full">
                  {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Save Correction
                </Button>
              </div>
            ) : questionData && (
              <div className="text-xs space-y-1.5">
                {[1, 2, 3, 4].map((n) => {
                  const opt = (questionData as any)[`option_${n}`];
                  const isCorrect = n === questionData.correct_option;
                  return (
                    <div
                      key={n}
                      className={`rounded px-2 py-1 ${
                        isCorrect
                          ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300"
                          : "text-muted-foreground"
                      }`}
                    >
                      {String.fromCharCode(64 + n)}. {opt}
                      {isCorrect && <Check className="h-3 w-3 inline ml-1" />}
                    </div>
                  );
                })}
                {(questionData as any).explanation && (
                  <p className="text-muted-foreground mt-2 pt-2 border-t">
                    {(questionData as any).explanation}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Admin Note */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Admin Note
            </h3>
            <div className="space-y-2">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Add internal note..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveNote}
                disabled={savingNote}
              >
                {savingNote ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </section>

          {/* Notify */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Notifications
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => onNotify(report.id)}
              disabled={report.status !== "resolved"}
            >
              <Send className="h-3.5 w-3.5" />
              Email Reporter
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1">
              Requires RESEND_API_KEY to be configured
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
