"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Download, FileSpreadsheet, Loader2, CheckCircle2, XCircle, Clock,
  FileJson, Filter, Search, Database, Calendar, Users as UsersIcon,
  BookOpen, Flag, Trash2, RefreshCw, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ExportStatus = { type: string; success: boolean; count?: number; message?: string } | null;

const USER_COLUMNS = [
  { key: "full_name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "xp", label: "XP" },
  { key: "created_at", label: "Joined Date" },
  { key: "current_streak", label: "Current Streak" },
  { key: "longest_streak", label: "Longest Streak" },
];

export default function ExportsPage() {
  const supabase = createClient();
  const [tab, setTab] = useState("questions");
  const [exports, setExports] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<ExportStatus>(null);

  // Question filters
  const [qSubject, setQSubject] = useState("");
  const [qYear, setQYear] = useState("");
  const [qPaper, setQPaper] = useState("");
  const [qDifficulty, setQDifficulty] = useState("");
  const [qFormat, setQFormat] = useState<"csv" | "json">("csv");

  // User filters
  const [uDateFrom, setUDateFrom] = useState("");
  const [uDateTo, setUDateTo] = useState("");
  const [uActive, setUActive] = useState("all");
  const [uColumns, setUColumns] = useState(USER_COLUMNS.map((c) => c.key));

  // Test result filters
  const [rDateFrom, setRDateFrom] = useState("");
  const [rDateTo, setRDateTo] = useState("");
  const [rSubject, setRSubject] = useState("");
  const [rUser, setRUser] = useState("");
  const [rMode, setRMode] = useState<"raw" | "aggregate">("raw");

  // Report filters
  const [pStatus, setPStatus] = useState("all");
  const [pDateFrom, setPDateFrom] = useState("");
  const [pDateTo, setPDateTo] = useState("");

  const [subjects, setSubjects] = useState<any[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [papers, setPapers] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("data_exports").select("*").order("created_at", { ascending: false }).limit(50).then(({ data }) => setExports(data || []));
    supabase.from("subjects").select("id, name").order("name").then(({ data }) => setSubjects(data || []));
    supabase.from("questions").select("year").not("year", "is", null).then(({ data }) => {
      const unique = [...new Set((data || []).map((q: any) => q.year))].sort((a, b) => b - a);
      setYears(unique);
    });
    supabase.from("questions").select("paper").not("paper", "is", null).then(({ data }) => {
      const unique = [...new Set((data || []).map((q: any) => q.paper))].sort();
      setPapers(unique);
    });
  }, []);

  const logExport = useCallback(async (type: string, format: string, count: number, filters: any) => {
    const user = await supabase.auth.getUser();
    await supabase.from("data_exports").insert({
      export_type: type, format, record_count: count, filters, created_by: user.data.user?.id,
    });
    const { data } = await supabase.from("data_exports").select("*").order("created_at", { ascending: false }).limit(50);
    setExports(data || []);
  }, [supabase]);

  const buildFilterDisplay = (filters: Record<string, string>) => {
    const parts = Object.entries(filters).filter(([, v]) => v && v !== "all");
    return parts.map(([k, v]) => `${k}: ${v}`).join(", ") || "none";
  };

  const exportQuestions = async () => {
    setExporting(true); setStatus(null);
    try {
      let query = supabase.from("questions").select("*, subjects!inner(name), exams(name)");
      if (qSubject) query = query.eq("subject_id", qSubject);
      if (qYear) query = query.eq("year", parseInt(qYear));
      if (qPaper) query = query.eq("paper", qPaper);
      if (qDifficulty) query = query.eq("difficulty", qDifficulty);
      const { data, error } = await query.limit(50000);
      if (error) throw error;
      const rows = (data || []).map((q: any) => ({
        id: q.id, question: q.question_text, option_1: q.option_1, option_2: q.option_2,
        option_3: q.option_3, option_4: q.option_4, correct_option: q.correct_option,
        explanation: q.explanation, difficulty: q.difficulty, subject: q.subjects?.name || "",
        exam: q.exams?.name || "", year: q.year, paper: q.paper,
      }));
      const filename = `questions-${new Date().toISOString().slice(0, 10)}`;
      if (qFormat === "json") {
        downloadBlob(JSON.stringify(rows, null, 2), `${filename}.json`, "application/json");
      } else {
        downloadCsv(rows, `${filename}.csv`);
      }
      const filters = { subject: qSubject, year: qYear, paper: qPaper, difficulty: qDifficulty };
      await logExport("questions", qFormat, rows.length, filters);
      setStatus({ type: "questions", success: true, count: rows.length, message: `${rows.length} questions exported as ${qFormat.toUpperCase()}` });
    } catch (e: any) {
      setStatus({ type: "questions", success: false, message: e.message });
    }
    setExporting(false);
  };

  const exportUsers = async () => {
    setExporting(true); setStatus(null);
    try {
      let query = supabase.from("profiles").select("*, streaks(*)");
      if (uDateFrom) query = query.gte("created_at", uDateFrom);
      if (uDateTo) query = query.lte("created_at", `${uDateTo}T23:59:59`);
      if (uActive === "active") query = query.not("streaks", "is", null);
      if (uActive === "inactive") query = query.is("streaks", null);
      const { data, error } = await query.limit(50000);
      if (error) throw error;
      const rows = (data || []).map((p: any) => {
        const row: Record<string, any> = {};
        uColumns.forEach((key) => {
          if (key === "current_streak") row[key] = p.streaks?.[0]?.current_streak ?? 0;
          else if (key === "longest_streak") row[key] = p.streaks?.[0]?.longest_streak ?? 0;
          else row[key] = p[key] ?? "";
        });
        return row;
      });
      const filename = `users-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsv(rows, filename);
      const filters = { joined_from: uDateFrom, joined_to: uDateTo, active_status: uActive, columns: uColumns.join(",") };
      await logExport("users", "csv", rows.length, filters);
      setStatus({ type: "users", success: true, count: rows.length, message: `${rows.length} users exported as CSV` });
    } catch (e: any) {
      setStatus({ type: "users", success: false, message: e.message });
    }
    setExporting(false);
  };

  const exportResults = async () => {
    setExporting(true); setStatus(null);
    try {
      let query = supabase.from("test_sessions").select("*, profiles!inner(full_name, email), exams(name)");
      if (rDateFrom) query = query.gte("completed_at", rDateFrom);
      if (rDateTo) query = query.lte("completed_at", `${rDateTo}T23:59:59`);
      if (rSubject) query = query.eq("subject_id", rSubject);
      if (rUser) {
        const { data: matchingUsers } = await supabase.from("profiles").select("id").ilike("full_name", `%${rUser}%`).limit(100);
        const ids = matchingUsers?.map((u: any) => u.id) || [];
        if (ids.length > 0) query = query.in("user_id", ids);
        else { setStatus({ type: "results", success: false, message: "No users match that name" }); setExporting(false); return; }
      }
      const { data, error } = await query.limit(50000);
      if (error) throw error;

      let filename = `test-results-${new Date().toISOString().slice(0, 10)}.csv`;
      if (rMode === "aggregate") {
        const agg: Record<string, any> = {};
        (data || []).forEach((s: any) => {
          const key = s.user_id;
          if (!agg[key]) agg[key] = {
            user: s.profiles?.full_name || "Unknown", email: s.profiles?.email || "",
            tests_taken: 0, total_score: 0, total_questions: 0,
          };
          agg[key].tests_taken++;
          agg[key].total_questions += s.total_questions || 0;
        });
        // Also fetch test_answers to compute scores
        const sessionIds = (data || []).map((s: any) => s.id);
        if (sessionIds.length > 0) {
          const { data: answers } = await supabase.from("test_answers").select("session_id, is_correct").in("session_id", sessionIds);
          (answers || []).forEach((a: any) => {
            if (agg[(data || []).find((s: any) => s.id === a.session_id)?.user_id]) {
              agg[(data || []).find((s: any) => s.id === a.session_id)?.user_id].total_score += a.is_correct ? 1 : 0;
            }
          });
        }
        const rows = Object.values(agg);
        downloadCsv(rows, filename);
        const filters = { date_from: rDateFrom, date_to: rDateTo, subject: rSubject, user: rUser, mode: "aggregate" };
        await logExport("results", "csv", rows.length, filters);
        setStatus({ type: "results", success: true, count: rows.length, message: `${rows.length} aggregated user stats exported as CSV` });
      } else {
        const rows = (data || []).map((s: any) => ({
          id: s.id, user: s.profiles?.full_name || "Unknown", email: s.profiles?.email || "",
          exam: s.exams?.name || "", subject: s.subject_id, year: s.year,
          mode: s.mode, total_questions: s.total_questions, duration_minutes: s.duration_minutes,
          started_at: s.started_at, completed_at: s.completed_at, status: s.status,
        }));
        downloadCsv(rows, filename);
        const filters = { date_from: rDateFrom, date_to: rDateTo, subject: rSubject, user: rUser, mode: "raw" };
        await logExport("results", "csv", rows.length, filters);
        setStatus({ type: "results", success: true, count: rows.length, message: `${rows.length} test session records exported as CSV` });
      }
    } catch (e: any) {
      setStatus({ type: "results", success: false, message: e.message });
    }
    setExporting(false);
  };

  const exportReports = async () => {
    setExporting(true); setStatus(null);
    try {
      let query = supabase.from("question_reports").select("*, profiles!question_reports_reported_by_fkey(full_name, email), resolved_profiles:profiles!question_reports_resolved_by_fkey(full_name)");
      if (pStatus !== "all") query = query.eq("status", pStatus);
      if (pDateFrom) query = query.gte("created_at", pDateFrom);
      if (pDateTo) query = query.lte("created_at", `${pDateTo}T23:59:59`);
      const { data, error } = await query.limit(50000);
      if (error) throw error;
      const rows = (data || []).map((r: any) => ({
        id: r.id, question_id: r.question_id, reported_by: r.profiles?.full_name || "Unknown",
        reporter_email: r.profiles?.email || "", report_type: r.report_type,
        description: r.description, status: r.status, admin_note: r.admin_note || "",
        resolved_by: r.resolved_profiles?.full_name || "", resolved_at: r.resolved_at,
        created_at: r.created_at,
      }));
      const filename = `reports-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsv(rows, filename);
      const filters = { status: pStatus, date_from: pDateFrom, date_to: pDateTo };
      await logExport("reports", "csv", rows.length, filters);
      setStatus({ type: "reports", success: true, count: rows.length, message: `${rows.length} reports exported as CSV` });
    } catch (e: any) {
      setStatus({ type: "reports", success: false, message: e.message });
    }
    setExporting(false);
  };

  const deleteExport = async (id: string) => {
    await supabase.from("data_exports").delete().eq("id", id);
    setExports((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Exports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Export platform data with filters and format options</p>
        </div>
      </div>

      {/* Status toast */}
      {status && (
        <div className={cn("border rounded-xl p-4 flex items-center gap-3",
          status.success
            ? "border-green-200 bg-green-50 dark:bg-green-950/10 dark:border-green-900"
            : "border-red-200 bg-red-50 dark:bg-red-950/10 dark:border-red-900"
        )}>
          {status.success ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <XCircle className="h-5 w-5 text-red-600 shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{status.success ? `Exported ${status.count} records` : "Export failed"}</p>
            <p className="text-xs text-muted-foreground truncate">{status.message}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setStatus(null)}><XCircle className="h-3.5 w-3.5" /></Button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-0 -mb-px">
          {[
            { id: "questions", label: "Questions", icon: BookOpen },
            { id: "users", label: "Users", icon: UsersIcon },
            { id: "results", label: "Test Results", icon: BarChart3 },
            { id: "reports", label: "Reports", icon: Flag },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Question Export */}
      {tab === "questions" && (
        <SectionCard icon={BookOpen} title="Export Questions" desc="Download question bank with subject, options, answer, and explanation">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <FilterSelect label="Subject" value={qSubject} onChange={setQSubject} options={subjects.map((s) => ({ value: s.id, label: s.name }))} placeholder="All Subjects" />
            <FilterSelect label="Year" value={qYear} onChange={setQYear} options={years.map((y) => ({ value: String(y), label: String(y) }))} placeholder="All Years" />
            <FilterSelect label="Paper" value={qPaper} onChange={setQPaper} options={papers.map((p) => ({ value: p, label: p }))} placeholder="All Papers" />
            <FilterSelect label="Difficulty" value={qDifficulty} onChange={setQDifficulty}
              options={[{ value: "easy", label: "Easy" }, { value: "medium", label: "Medium" }, { value: "hard", label: "Hard" }]}
              placeholder="All Difficulties" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 border rounded-md p-0.5">
              <button onClick={() => setQFormat("csv")} className={cn("px-2.5 py-1 text-xs rounded font-medium transition-colors", qFormat === "csv" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                <FileSpreadsheet className="h-3 w-3 inline mr-1" />CSV
              </button>
              <button onClick={() => setQFormat("json")} className={cn("px-2.5 py-1 text-xs rounded font-medium transition-colors", qFormat === "json" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                <FileJson className="h-3 w-3 inline mr-1" />JSON
              </button>
            </div>
            <Button size="sm" onClick={exportQuestions} disabled={exporting}>
              {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
              Export
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Users Export */}
      {tab === "users" && (
        <SectionCard icon={UsersIcon} title="Export Users" desc="Download user profiles with selectable columns">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Joined From</label>
              <input type="date" value={uDateFrom} onChange={(e) => setUDateFrom(e.target.value)}
                className="w-full mt-1 h-8 text-xs rounded-md border border-input bg-background px-2" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Joined To</label>
              <input type="date" value={uDateTo} onChange={(e) => setUDateTo(e.target.value)}
                className="w-full mt-1 h-8 text-xs rounded-md border border-input bg-background px-2" />
            </div>
            <FilterSelect label="Active Status" value={uActive} onChange={setUActive}
              options={[{ value: "all", label: "All Users" }, { value: "active", label: "Active Only" }, { value: "inactive", label: "Inactive Only" }]} />
          </div>
          <div className="mb-4">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Columns to Include</label>
            <div className="flex flex-wrap gap-2">
              {USER_COLUMNS.map((col) => (
                <label key={col.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" checked={uColumns.includes(col.key)}
                    onChange={() => setUColumns((prev) => prev.includes(col.key) ? prev.filter((c) => c !== col.key) : [...prev, col.key])}
                    className="rounded border-gray-300" />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
          <Button size="sm" onClick={exportUsers} disabled={exporting || uColumns.length === 0}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Export Users CSV
          </Button>
        </SectionCard>
      )}

      {/* Test Results Export */}
      {tab === "results" && (
        <SectionCard icon={BarChart3} title="Export Test Results" desc="Download test session data with aggregate or raw mode">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Date From</label>
              <input type="date" value={rDateFrom} onChange={(e) => setRDateFrom(e.target.value)}
                className="w-full mt-1 h-8 text-xs rounded-md border border-input bg-background px-2" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Date To</label>
              <input type="date" value={rDateTo} onChange={(e) => setRDateTo(e.target.value)}
                className="w-full mt-1 h-8 text-xs rounded-md border border-input bg-background px-2" />
            </div>
            <FilterSelect label="Subject" value={rSubject} onChange={setRSubject} options={subjects.map((s) => ({ value: s.id, label: s.name }))} placeholder="All Subjects" />
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">User</label>
              <input type="text" value={rUser} onChange={(e) => setRUser(e.target.value)} placeholder="Search by name"
                className="w-full mt-1 h-8 text-xs rounded-md border border-input bg-background px-2" />
            </div>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1 border rounded-md p-0.5">
              <button onClick={() => setRMode("raw")} className={cn("px-2.5 py-1 text-xs rounded font-medium transition-colors", rMode === "raw" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                Raw Data
              </button>
              <button onClick={() => setRMode("aggregate")} className={cn("px-2.5 py-1 text-xs rounded font-medium transition-colors", rMode === "aggregate" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                Aggregate Stats
              </button>
            </div>
            <Button size="sm" onClick={exportResults} disabled={exporting}>
              {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
              Export Results
            </Button>
          </div>
          {rMode === "aggregate" && (
            <p className="text-[10px] text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
              Aggregate mode groups by user and computes tests taken, total questions, and total correct answers.
            </p>
          )}
        </SectionCard>
      )}

      {/* Reports Export */}
      {tab === "reports" && (
        <SectionCard icon={Flag} title="Export Reports" desc="Download question reports with status">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <FilterSelect label="Status" value={pStatus} onChange={setPStatus}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "pending", label: "Pending" },
                { value: "resolved", label: "Resolved" },
                { value: "dismissed", label: "Dismissed" },
              ]} />
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Date From</label>
              <input type="date" value={pDateFrom} onChange={(e) => setPDateFrom(e.target.value)}
                className="w-full mt-1 h-8 text-xs rounded-md border border-input bg-background px-2" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Date To</label>
              <input type="date" value={pDateTo} onChange={(e) => setPDateTo(e.target.value)}
                className="w-full mt-1 h-8 text-xs rounded-md border border-input bg-background px-2" />
            </div>
          </div>
          <Button size="sm" onClick={exportReports} disabled={exporting}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Export Reports CSV
          </Button>
        </SectionCard>
      )}

      {/* Export History */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />Export History
          </h2>
          <span className="text-[10px] text-muted-foreground">{exports.length} exports</span>
        </div>
        {exports.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            <Database className="h-6 w-6 mx-auto mb-2 opacity-40" />
            No exports yet
          </div>
        ) : (
          <div className="divide-y">
            {exports.map((e: any) => (
              <div key={e.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-muted/10">
                <div className="flex items-center gap-2 min-w-0">
                  {e.format === "json" ? <FileJson className="h-4 w-4 text-muted-foreground shrink-0" /> : <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-xs font-medium capitalize truncate">{e.export_type} <span className="text-muted-foreground font-normal">({e.format})</span></p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {e.record_count} records
                      {e.filters && Object.keys(e.filters).some((k) => e.filters[k] && e.filters[k] !== "all" && e.filters[k] !== "") && (
                        <> &middot; {buildFilterDisplay(e.filters)}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap"><Clock className="h-3 w-3 inline mr-0.5" />{new Date(e.created_at).toLocaleDateString()}</span>
                  <button onClick={() => deleteExport(e.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scheduled Exports */}
      <div className="border rounded-xl p-5 border-dashed">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-8 w-8 text-muted-foreground/40" />
          <div>
            <h3 className="text-sm font-medium">Scheduled Exports</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Auto-export weekly stats to Google Sheets. Coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function SectionCard({ icon: Icon, title, desc, children }: { icon: any; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-[11px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 h-8 text-xs rounded-md border border-input bg-background px-2">
        <option value="">{placeholder || `All ${label}`}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function downloadCsv(data: any[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const header = keys.join(",");
  const rows = data.map((row) => keys.map((k) => {
    const v = row[k];
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(","));
  const csv = [header, ...rows].join("\n");
  downloadBlob(csv, filename, "text/csv");
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
