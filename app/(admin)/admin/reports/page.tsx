"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReportStatusBadge } from "@/components/admin/ReportStatusBadge";
import { MathText } from "@/components/MathText";
import { isMatchingQuestion } from "@/lib/matching-question-utils";
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
  Info,
  MessageSquare,
  History,
  Bell,
  Edit3,
  User,
  Calendar,
  Tag,
  BookOpen,
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCw,
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
  const { toast } = useToast();
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

  const handleNotify = async (reportId: string) => {
    const res = await fetch("/api/admin/reports/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    if (res.ok) {
      toast("Notification sent to reporter!", "success");
    } else {
      const data = await res.json();
      toast(data.message || data.error || "Failed to send notification", "error");
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

const PANEL_TABS = [
  { key: "info", label: "Report Info", icon: Info },
  { key: "question", label: "Question", icon: BookOpen },
  { key: "activity", label: "Activity", icon: History },
  { key: "notifications", label: "Notifications", icon: Bell },
];

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
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");
  const [editMode, setEditMode] = useState(false);
  const [mcqMode, setMcqMode] = useState(false);
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

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

  useEffect(() => {
    if (activeTab === "notifications" && report.reported_by) {
      setLoadingNotifs(true);
      fetch(`/api/notifications?userId=${report.reported_by}`)
        .then((r) => r.json())
        .then((data) => setNotifications(data.notifications || []))
        .finally(() => setLoadingNotifs(false));
    }
  }, [activeTab, report.reported_by]);

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
        toast(data.error || "Failed to save", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToMcq = async () => {
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
        setMcqMode(false);
        onRefresh();
        onClose();
      } else {
        toast(data.error || "Failed to save", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: noteDraft }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Failed to save note", "error");
        return;
      }
      onRefresh();
    } finally {
      setSavingNote(false);
    }
  };

  const statusActions = [
    { status: "pending", label: "Pending", icon: Clock, disabled: report.status === "pending" },
    { status: "under_review", label: "Under Review", icon: Search, disabled: report.status === "under_review" },
    { status: "resolved", label: "Resolved", icon: CheckCircle2, disabled: report.status === "resolved" },
    { status: "rejected", label: "Rejected", icon: XCircle, disabled: report.status === "rejected" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-background border-l shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-semibold">Report Detail</h2>
            <p className="text-xs text-muted-foreground">ID: {report.id.slice(0, 8)}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-muted/30 overflow-x-auto">
          {PANEL_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "info" && (
            <div className="space-y-5">
              {/* Reporter Details */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Reporter Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium mt-0.5">{report.profiles?.full_name || "Unknown"}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium mt-0.5 text-sm truncate">{report.profiles?.email || "—"}</p>
                  </div>
                </div>
              </section>

              {/* Report Details */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Report Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Type</p>
                    <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full border ${
                      REPORT_TYPE_COLORS[report.report_type] || ""
                    }`}>
                      {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                    </span>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-0.5"><ReportStatusBadge status={report.status} /></div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="font-medium mt-0.5">{format(new Date(report.created_at), "MMM d, yyyy HH:mm")}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="font-medium mt-0.5">{format(new Date(report.updated_at), "MMM d, yyyy HH:mm")}</p>
                  </div>
                </div>
              </section>

              {/* Description */}
              {report.description && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Reporter&apos;s Description
                  </h3>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm">{report.description}</p>
                  </div>
                </section>
              )}

              {/* Admin Note */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Admin Note
                </h3>
                <div className="space-y-2">
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Add internal note..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveNote}
                      disabled={savingNote}
                    >
                      {savingNote ? "Saving..." : "Save Note"}
                    </Button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "question" && (
            <div className="space-y-5">
              {/* Status Actions */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Status
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {statusActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.status}
                        size="sm"
                        variant={report.status === action.status ? "default" : "outline"}
                        disabled={action.disabled}
                        onClick={() => onStatusChange(report.id, action.status)}
                        className="gap-1.5"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {action.label}
                      </Button>
                    );
                  })}
                </div>
              </section>

              {/* Question Display / Edit */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Question
                  </h3>
                  {!editMode && !mcqMode ? (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMcqMode(true);
                          setQText("");
                          setOpt1("");
                          setOpt2("");
                          setOpt3("");
                          setOpt4("");
                          setCorrectOpt(1);
                          setExplanation("");
                        }}
                        className="gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Convert to MCQ
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-1.5">
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit & Correct
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => { setEditMode(false); setMcqMode(false); }}>
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
                ) : mcqMode ? (
                  <div className="space-y-3">
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                      <p className="font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Convert to Multiple Choice
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Write a new MCQ below. This will replace the current question entirely.
                      </p>
                    </div>

                    {/* Reference: Original Matching Question */}
                    {questionData && (
                      <details className="rounded-lg border border-dashed border-muted-foreground/25 overflow-hidden">
                        <summary className="px-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors select-none">
                          View Original Question (List 1, List 2 &amp; Options)
                        </summary>
                        <div className="px-3 pb-3 space-y-2 text-sm border-t">
                          <div className="mt-2">
                            <MathText text={questionData.question_text} />
                          </div>
                          <div className="space-y-1 pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground">Options:</p>
                            {[1, 2, 3, 4].map((n) => {
                              const opt = questionData[`option_${n}`];
                              const isCorrect = n === questionData.correct_option;
                              return (
                                <div
                                  key={n}
                                  className={`rounded-lg px-3 py-1.5 text-xs ${
                                    isCorrect
                                      ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                                      : "bg-muted/30 text-muted-foreground"
                                  }`}
                                >
                                  <span className="font-medium">{String.fromCharCode(64 + n)}.</span> {opt}
                                  {isCorrect && <Check className="h-3 w-3 inline ml-1" />}
                                </div>
                              );
                            })}
                          </div>
                          {questionData.explanation && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-2 text-xs mt-2">
                              <span className="font-medium">Explanation:</span> {questionData.explanation}
                            </div>
                          )}
                        </div>
                      </details>
                    )}

                    <div>
                      <label className="text-xs font-medium">New Question Text</label>
                      <textarea
                        value={qText}
                        onChange={(e) => setQText(e.target.value)}
                        placeholder="Enter the new multiple choice question..."
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
                              placeholder={`Option ${String.fromCharCode(64 + n)}`}
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
                        placeholder="Optional explanation..."
                        className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none"
                      />
                    </div>
                    <Button
                      onClick={handleConvertToMcq}
                      disabled={saving || !qText.trim() || !opt1.trim() || !opt2.trim() || !opt3.trim() || !opt4.trim()}
                      className="w-full"
                    >
                      {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                      {saving ? "Saving..." : "Save as Multiple Choice"}
                    </Button>
                  </div>
                ) : questionData && (
                  <div className="text-sm space-y-2">
                    <p className="leading-relaxed"><MathText text={questionData.question_text} /></p>
                    <div className="space-y-1">
                      {[1, 2, 3, 4].map((n) => {
                        const opt = (questionData as any)[`option_${n}`];
                        const isCorrect = n === questionData.correct_option;
                        return (
                          <div
                            key={n}
                            className={`rounded-lg px-3 py-2 ${
                              isCorrect
                                ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                                : "bg-muted/30 text-muted-foreground"
                            }`}
                          >
                            <span className="font-medium">{String.fromCharCode(64 + n)}.</span> {opt}
                            {isCorrect && <Check className="h-3.5 w-3.5 inline ml-1.5" />}
                          </div>
                        );
                      })}
                    </div>
                    {(questionData as any).explanation && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-sm mt-3">
                        <p className="text-xs text-muted-foreground mb-1">Explanation:</p>
                        <p>{(questionData as any).explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-5">
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Report Timeline
                </h3>
                <div className="space-y-3">
                  <ActivityItem
                    icon={AlertTriangle}
                    color="text-yellow-500"
                    title="Report Created"
                    description={`Reported as "${REPORT_TYPE_LABELS[report.report_type] || report.report_type}"`}
                    time={report.created_at}
                  />
                  {report.status === "under_review" && (
                    <ActivityItem
                      icon={Search}
                      color="text-blue-500"
                      title="Marked as Under Review"
                      time={report.updated_at}
                    />
                  )}
                  {report.status === "resolved" && (
                    <ActivityItem
                      icon={CheckCircle2}
                      color="text-green-500"
                      title="Resolved"
                      description={report.admin_note ? `Note: ${report.admin_note}` : undefined}
                      time={report.resolved_at || report.updated_at}
                    />
                  )}
                  {report.status === "rejected" && (
                    <ActivityItem
                      icon={XCircle}
                      color="text-red-500"
                      title="Rejected"
                      description={report.admin_note ? `Note: ${report.admin_note}` : undefined}
                      time={report.resolved_at || report.updated_at}
                    />
                  )}
                  <ActivityItem
                    icon={History}
                    color="text-muted-foreground"
                    title="Last Updated"
                    time={report.updated_at}
                    muted
                  />
                </div>
              </section>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-5">
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Send Notification
                </h3>
                <div className="flex flex-wrap gap-2">
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
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Requires RESEND_API_KEY to be configured
                </p>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Notification History
                </h3>
                {loadingNotifs ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notifications sent yet.</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notif: any) => (
                      <div key={notif.id} className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                        <div className={`mt-0.5 ${notif.is_read ? "text-muted-foreground" : "text-primary"}`}>
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{notif.title}</p>
                          {notif.message && (
                            <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(notif.created_at), "MMM d, yyyy HH:mm")}
                            {notif.is_read && " • Read"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({
  icon: Icon,
  color,
  title,
  description,
  time,
  muted,
}: {
  icon: any;
  color: string;
  title: string;
  description?: string;
  time: string;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-lg p-3 ${muted ? "" : "bg-muted/30"}`}>
      <div className={`mt-0.5 ${muted ? "text-muted-foreground" : color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${muted ? "text-muted-foreground" : ""}`}>{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {format(new Date(time), "MMM d, yyyy HH:mm")}
        </p>
      </div>
    </div>
  );
}
