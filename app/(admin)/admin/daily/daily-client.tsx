"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  CheckCircle2,
  BarChart3,
  Clock,
  Zap,
  Plus,
  Trash2,
  Settings2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Users,
  Eye,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { MathText } from "@/components/MathText";

interface DQItem {
  id: string;
  date: string;
  questionId: string;
  questionText: string | null;
  subject: string | null;
  year: number | null;
  difficulty: string | null;
  userAnswers: number;
  accuracy: number | null;
}

interface SubjectAccuracy {
  name: string;
  accuracy: number;
  total: number;
}

interface Stats {
  scheduledAhead: number;
  answeredToday: number;
  avgAccuracy: number;
  neverUsed: number;
  totalQuestions: number;
}

interface DailySettings {
  autoSchedule: boolean;
  noConsecutiveSame: boolean;
  diffRotation: string;
  notifTime: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STORAGE_KEY = "admin-daily-settings";

function loadSettings(): DailySettings {
  if (typeof window === "undefined") return { autoSchedule: true, noConsecutiveSame: true, diffRotation: "balanced", notifTime: "08:00" };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { autoSchedule: true, noConsecutiveSame: true, diffRotation: "balanced", notifTime: "08:00" };
}

export function DailyClient({
  today,
  stats,
  upcoming,
  past,
  subjectAccuracy,
}: {
  today: string;
  stats: Stats;
  upcoming: DQItem[];
  past: DQItem[];
  subjectAccuracy: SubjectAccuracy[];
}) {
  const [view, setView] = useState<"calendar" | "list">("list");
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [scheduleModal, setScheduleModal] = useState(false);
  const [previewModal, setPreviewModal] = useState<DQItem | null>(null);
  const [autoFilling, setAutoFilling] = useState(false);
  const [settings, setSettings] = useState<DailySettings>(loadSettings);
  const [questionSearch, setQuestionSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedQId, setSelectedQId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }, [settings]);

  const scheduleByDate = useMemo(() => {
    const map: Record<string, DQItem> = {};
    upcoming.forEach((d) => { map[d.date] = d; });
    past.forEach((d) => { map[d.date] = d; });
    return map;
  }, [upcoming, past]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [firstDayOfWeek, daysInMonth]);

  const formatDate = (d: number) => {
    const m = String(month + 1).padStart(2, "0");
    const day = String(d).padStart(2, "0");
    return `${year}-${m}-${day}`;
  };

  const searchQuestions = async (q: string) => {
    setQuestionSearch(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/questions?search=${encodeURIComponent(q)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.questions || []);
      }
    } finally { setSearching(false); }
  };

  const handleAutoFill = async (days: number) => {
    setAutoFilling(true);
    try {
      const res = await fetch("/api/cron/daily-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, subjectRotation: settings.noConsecutiveSame, difficulty: settings.diffRotation }),
      });
      if (res.ok) window.location.reload();
      else { const err = await res.json(); alert(err.error || "Auto-fill failed"); }
    } finally { setAutoFilling(false); }
  };

  const handleAssign = async () => {
    if (!selectedDate || !selectedQId) return;
    const res = await fetch("/api/daily-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDate, questionId: selectedQId }),
    });
    if (res.ok) { setScheduleModal(false); setSelectedQId(null); setQuestionSearch(""); setSearchResults([]); window.location.reload(); }
    else { const err = await res.json(); alert(err.error || "Failed to assign"); }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this daily question?")) return;
    const supabase = (await import("@/lib/supabase/client")).createClient();
    await supabase.from("daily_questions").delete().eq("id", id);
    window.location.reload();
  };

  const handleReuse = async (item: DQItem) => {
    if (!confirm(`Re-use this question on a future date?`)) return;
    setSelectedDate(null);
    setSelectedQId(item.questionId);
    setScheduleModal(true);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const allScheduled = [...upcoming, ...past];
  const sortedByDate = [...allScheduled].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Questions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage the daily question schedule</p>
        </div>
        <Button size="sm" onClick={() => setScheduleModal(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Schedule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Scheduled Ahead</span><Calendar className="h-4 w-4 text-blue-500" /></div>
          <p className="text-xl font-bold mt-1">{stats.scheduledAhead}</p>
          <p className="text-xs text-muted-foreground">{stats.totalQuestions > 0 ? `${Math.round((stats.scheduledAhead / stats.totalQuestions) * 100)}% of question bank` : "No questions yet"}</p>
        </div>
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Answered Today</span><CheckCircle2 className="h-4 w-4 text-green-500" /></div>
          <p className="text-xl font-bold mt-1">{stats.answeredToday}</p>
        </div>
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Avg Accuracy</span><BarChart3 className="h-4 w-4 text-purple-500" /></div>
          <p className="text-xl font-bold mt-1">{stats.avgAccuracy}%</p>
        </div>
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Never Used</span><Clock className="h-4 w-4 text-orange-500" /></div>
          <p className="text-xl font-bold mt-1">{stats.neverUsed}</p>
          <p className="text-xs text-muted-foreground">{stats.totalQuestions > 0 ? `${Math.round((stats.neverUsed / stats.totalQuestions) * 100)}% available` : "—"}</p>
        </div>
      </div>

      {/* View toggle + Quick Schedule */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 border rounded-lg p-0.5">
          <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button onClick={() => setView("calendar")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <CalendarDays className="h-3.5 w-3.5" /> Calendar
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => handleAutoFill(7)} disabled={autoFilling || stats.totalQuestions === 0} className="text-xs gap-1">
            {autoFilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Auto-fill 7 days
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAutoFill(30)} disabled={autoFilling || stats.totalQuestions === 0} className="text-xs gap-1">
            {autoFilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Auto-fill 30 days
          </Button>
        </div>
      </div>

      {/* Calendar */}
      {view === "calendar" && (
        <div className="border rounded-xl overflow-hidden">
          <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-semibold text-sm">{MONTHS[month]} {year}</span>
            <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
              ))}
              {calendarDays.map((d, i) => {
                if (d === null) return <div key={`e-${i}`} />;
                const dateStr = formatDate(d);
                const isToday = dateStr === today;
                const s = scheduleByDate[dateStr];
                return (
                  <div key={dateStr}
                    onClick={() => { setSelectedDate(dateStr); setScheduleModal(true); }}
                    className={`border rounded-lg p-1.5 min-h-[72px] cursor-pointer hover:bg-muted/30 transition-colors relative ${isToday ? "border-primary ring-1 ring-primary" : "border-border"}`}
                  >
                    <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{d}</span>
                    {s ? (
                      <div className="mt-0.5 space-y-0.5">
                        <span className="text-[8px] px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-600 block truncate font-medium">
                          {s.subject || "Q"}
                        </span>
                        {s.userAnswers > 0 && (
                          <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
                            <Users className="h-2.5 w-2.5" /> {s.userAnswers}
                            {s.accuracy !== null && <span className="text-green-600">{s.accuracy}%</span>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[8px] text-muted-foreground/50 block mt-2">Empty</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Queue Table */}
      {view === "list" && (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <h2 className="font-semibold text-sm">Schedule Queue</h2>
            <span className="text-xs text-muted-foreground">{sortedByDate.length} entries</span>
          </div>
          {sortedByDate.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground space-y-2">
              <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p>No daily questions scheduled yet</p>
              <p className="text-xs">Use the auto-fill buttons or manually schedule a question</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Question</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Subject</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Year</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Answered</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Accuracy</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedByDate.map((d) => {
                    const isPast = d.date < today;
                    return (
                      <tr key={d.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${isPast ? "opacity-60" : ""}`}>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${d.date === today ? "text-primary" : ""}`}>
                            {new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          {d.date === today && <span className="text-[10px] text-primary ml-1.5 font-medium">Today</span>}
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <span className="text-sm truncate block"><MathText text={d.questionText || "—"} /></span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                          {d.subject && <span className="px-1.5 py-0.5 rounded bg-muted text-xs">{d.subject}</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{d.year || "—"}</td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          <span className="text-xs">{d.userAnswers > 0 ? d.userAnswers : "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          {d.accuracy !== null ? (
                            <span className={`text-xs font-medium ${d.accuracy >= 70 ? "text-green-600" : d.accuracy >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                              {d.accuracy}%
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => setPreviewModal(d)} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Preview">
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => { setSelectedDate(d.date); setSelectedQId(d.questionId); setScheduleModal(true); }}
                              className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Change">
                              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleRemove(d.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors" title="Remove">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Past Questions with Stats */}
      {past.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h2 className="font-semibold text-sm">Past Daily Questions</h2>
          </div>
          <div className="divide-y max-h-[320px] overflow-y-auto">
            {past.slice(0, 20).map((d) => (
              <div key={d.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-muted/20">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground shrink-0 w-16">
                    {new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className="text-sm truncate max-w-[240px]"><MathText text={d.questionText || "—"} /></span>
                  {d.subject && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">{d.subject}</span>}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {d.userAnswers > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> {d.userAnswers}
                    </span>
                  )}
                  {d.accuracy !== null && (
                    <span className={`text-xs font-medium ${d.accuracy >= 70 ? "text-green-600" : d.accuracy >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                      {d.accuracy}%
                    </span>
                  )}
                  <button onClick={() => handleReuse(d)} className="text-xs text-primary hover:underline flex items-center gap-0.5" title="Re-use in future">
                    <RotateCcw className="h-3 w-3" /> Re-use
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject Accuracy */}
      {subjectAccuracy.length > 0 && (
        <div className="border rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-muted-foreground" /> Avg Accuracy by Subject
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {subjectAccuracy.sort((a, b) => b.total - a.total).map((s) => (
              <div key={s.name} className="border rounded-lg p-3">
                <p className="text-xs font-medium truncate">{s.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-lg font-bold ${s.accuracy >= 70 ? "text-green-600" : s.accuracy >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                    {s.accuracy}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">({s.total} answers)</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                  <div className={`h-full rounded-full ${s.accuracy >= 70 ? "bg-green-500" : s.accuracy >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${s.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setPreviewModal(null)} />
          <div className="relative bg-background rounded-xl shadow-2xl border w-full max-w-lg mx-4 p-6 space-y-4">
            <h2 className="font-semibold">Question Preview</h2>
            <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
              {previewModal.subject && <span className="px-2 py-0.5 rounded-full bg-muted">{previewModal.subject}</span>}
              {previewModal.year && <span className="px-2 py-0.5 rounded-full bg-muted">{previewModal.year}</span>}
              {previewModal.difficulty && <span className="px-2 py-0.5 rounded-full bg-muted capitalize">{previewModal.difficulty}</span>}
            </div>
            <p className="text-sm leading-relaxed"><MathText text={previewModal.questionText || "No question text"} /></p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {previewModal.userAnswers} answers</span>
              {previewModal.accuracy !== null && (
                <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> {previewModal.accuracy}% accuracy</span>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPreviewModal(null)}>Close</Button>
              <Button variant="outline" size="sm" onClick={() => { setSelectedDate(previewModal.date); setSelectedQId(previewModal.questionId); setScheduleModal(true); setPreviewModal(null); }}>Change</Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20">
          <div className="fixed inset-0 bg-black/60" onClick={() => { setScheduleModal(false); setSelectedQId(null); setQuestionSearch(""); setSearchResults([]); }} />
          <div className="relative bg-background rounded-xl shadow-2xl border w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b px-6 py-4 rounded-t-xl">
              <h2 className="font-semibold">Schedule Question</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedDate ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Pick a date and question"}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Date</label>
                <Input type="date" value={selectedDate || ""} onChange={(e) => setSelectedDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Search Question</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={questionSearch} onChange={(e) => searchQuestions(e.target.value)} placeholder="Search by text..." className="pl-8" />
                </div>
              </div>
              <div className="border rounded-lg max-h-[250px] overflow-y-auto">
                {searching ? (
                  <div className="p-4 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 mx-auto animate-spin" /></div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y">
                    {searchResults.map((q: any) => (
                      <button key={q.id} type="button" onClick={() => setSelectedQId(q.id)}
                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted/30 transition-colors ${selectedQId === q.id ? "bg-primary/5 ring-1 ring-primary" : ""}`}
                      >
                        <span className="line-clamp-1"><MathText text={q.question_text} /></span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">
                          {q.subjects?.name || "No subject"} {q.year ? `· ${q.year}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : questionSearch.trim() ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No questions found</div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {stats.totalQuestions === 0 ? (
                      <>No questions in the bank yet. <Link href="/admin/questions/new" className="text-primary underline">Add one</Link></>
                    ) : "Type to search questions"}
                  </div>
                )}
              </div>
              {selectedQId && searchResults.find((q: any) => q.id === selectedQId) && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm border">
                  <p className="font-medium text-xs text-muted-foreground mb-1">Preview</p>
                  <p><MathText text={(searchResults.find((q: any) => q.id === selectedQId) as any).question_text} /></p>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-background border-t px-6 py-4 rounded-b-xl flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setScheduleModal(false); setSelectedQId(null); setQuestionSearch(""); setSearchResults([]); }}>Cancel</Button>
              <Button onClick={handleAssign} disabled={!selectedDate || !selectedQId}>Assign</Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Card */}
      <div className="border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Schedule Settings</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">Auto-schedule</p><p className="text-xs text-muted-foreground">Fill unscheduled days automatically</p></div>
            <button onClick={() => setSettings({ ...settings, autoSchedule: !settings.autoSchedule })}>
              {settings.autoSchedule ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">No Consecutive Same Subject</p><p className="text-xs text-muted-foreground">Avoid same subject two days in a row</p></div>
            <button onClick={() => setSettings({ ...settings, noConsecutiveSame: !settings.noConsecutiveSame })}>
              {settings.noConsecutiveSame ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
            </button>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Difficulty Rotation</label>
            <select value={settings.diffRotation} onChange={(e) => setSettings({ ...settings, diffRotation: e.target.value })}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="balanced">Balanced (even mix)</option>
              <option value="easy-hard">Easy Mon/Wed, Hard Tue/Thu/Fri</option>
              <option value="random">Random</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Notification Time (IST)</label>
            <Input type="time" value={settings.notifTime} onChange={(e) => setSettings({ ...settings, notifTime: e.target.value })} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Settings saved locally</p>
      </div>
    </div>
  );
}
