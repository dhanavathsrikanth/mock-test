"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  Settings2,
  Calendar,
  Bell,
  Shield,
  Sliders,
  Skull,
  Save,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  ChevronRight,
  ExternalLink,
  Download,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  UserX,
  Star,
} from "lucide-react";

const TABS = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "exam-dates", label: "Exam Dates", icon: Calendar },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "access", label: "Access Control", icon: Shield },
  { id: "content", label: "Content Rules", icon: Sliders },
  { id: "danger", label: "Danger Zone", icon: Skull },
];

interface Countdown {
  id: string;
  examId: string;
  label: string;
  examDate: string;
  isOfficial: boolean;
  isActive: boolean;
  createdAt: string;
}

interface AdminProfile {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export function SettingsClient({
  config: initialConfig,
  exams,
  countdowns: initialCountdowns,
  adminProfiles: initialAdminProfiles,
}: {
  config: Record<string, any>;
  exams: any[];
  countdowns: Countdown[];
  adminProfiles: AdminProfile[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [config, setConfig] = useState(initialConfig);
  const [general, setGeneral] = useState(initialConfig.general || {});
  const [contentRules, setContentRules] = useState(initialConfig.content_rules || {});

  const [countdowns, setCountdowns] = useState<Countdown[]>(initialCountdowns);
  const [countdownForm, setCountdownForm] = useState({ label: "", examDate: "", isOfficial: false, examId: exams[0]?.id || "" });
  const [editingCountdown, setEditingCountdown] = useState<string | null>(null);

  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>(initialAdminProfiles);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantRole, setGrantRole] = useState("admin");
  const [granting, setGranting] = useState(false);

  const [notifConfig, setNotifConfig] = useState(initialConfig.notifications || { pushEnabled: true, emailFromName: "TGPSC Prep", emailFromAddr: "" });
  const [cronStatus, setCronStatus] = useState<any[]>([]);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [clearBeforeDate, setClearBeforeDate] = useState("");
  const [reportAgeDays, setReportAgeDays] = useState(30);
  const [countdownSearch, setCountdownSearch] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetch("/api/admin/cron-jobs")
      .then((r) => r.json())
      .then(setCronStatus)
      .catch(() => {});
  }, []);

  const showSave = (msg: string) => { setSaveMsg(msg); setTimeout(() => setSaveMsg(null), 2500); };

  const saveConfig = async (key: string, value: any) => {
    setSaving(true);
    const { error } = await supabase.from("app_config").upsert({ key, value, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) showSave("Error saving: " + error.message);
    else { showSave("Saved!"); setConfig({ ...config, [key]: value }); }
  };

  const handleSaveGeneral = async () => {
    setConfig({ ...config, general });
    await saveConfig("general", general);
  };

  const handleSaveContent = async () => {
    setConfig({ ...config, content_rules: contentRules });
    await saveConfig("content_rules", contentRules);
  };

  const handleAddCountdown = async () => {
    if (!countdownForm.label || !countdownForm.examDate) return;
    const { data, error } = await supabase.from("exam_countdown").insert({
      exam_id: countdownForm.examId || exams[0]?.id,
      label: countdownForm.label,
      exam_date: countdownForm.examDate,
      is_official: countdownForm.isOfficial,
      is_active: true,
    }).select().single();
    if (error) { alert(error.message); return; }
    setCountdowns([...countdowns, {
      id: data.id,
      examId: data.exam_id,
      label: data.label,
      examDate: data.exam_date,
      isOfficial: data.is_official,
      isActive: data.is_active,
      createdAt: data.created_at,
    }]);
    setCountdownForm({ label: "", examDate: "", isOfficial: false, examId: exams[0]?.id || "" });
  };

  const handleUpdateCountdown = async (id: string, updates: any) => {
    const { error } = await supabase.from("exam_countdown").update(updates).eq("id", id);
    if (error) { alert(error.message); return; }
    setCountdowns(countdowns.map((c) => c.id === id ? { ...c, ...updates } : c));
    setEditingCountdown(null);
  };

  const handleDeleteCountdown = async (id: string) => {
    if (!confirm("Delete this exam date?")) return;
    await supabase.from("exam_countdown").delete().eq("id", id);
    setCountdowns(countdowns.filter((c) => c.id !== id));
  };

  const handleGrantAdmin = async () => {
    if (!grantEmail.trim()) return;
    setGranting(true);
    const { data: users } = await supabase.from("profiles").select("id, full_name, email").ilike("email", grantEmail.trim());
    if (!users || users.length === 0) {
      alert("User not found with that email");
      setGranting(false);
      return;
    }
    const user = users[0];
    const { error } = await supabase.from("admin_profiles").insert({ user_id: user.id, role: grantRole });
    if (error) { alert(error.message); setGranting(false); return; }
    if (grantRole === "admin") {
      await supabase.from("profiles").update({ role: "admin" }).eq("id", user.id);
    }
    setAdminProfiles([...adminProfiles, {
      id: crypto.randomUUID(),
      userId: user.id,
      email: user.email,
      name: user.full_name || "User",
      role: grantRole,
      createdAt: new Date().toISOString(),
    }]);
    setGrantEmail("");
    setGranting(false);
  };

  const handleRevokeAdmin = async (ap: AdminProfile) => {
    if (!confirm(`Revoke admin access from ${ap.email}?`)) return;
    await supabase.from("admin_profiles").delete().eq("user_id", ap.userId);
    await supabase.from("profiles").update({ role: "user" }).eq("id", ap.userId);
    setAdminProfiles(adminProfiles.filter((a) => a.id !== ap.id));
  };

  const handleDangerAction = async (action: string, extra?: any) => {
    if (!confirm(`Are you sure? This cannot be undone.`)) return;
    setActionLoading(action);
    try {
      switch (action) {
        case "clear-sessions": {
          const sessionQuery = supabase.from("test_sessions").select("id");
          const filteredQuery = extra?.before ? sessionQuery.lt("created_at", extra.before) : sessionQuery;
          const { data: sessions } = await filteredQuery;
          const ids = (sessions || []).map((s: any) => s.id);
          if (ids.length > 0) {
            await supabase.from("test_answers").delete().in("session_id", ids);
            await supabase.from("test_sessions").delete().in("id", ids);
          }
          break;
        }
        case "reset-leaderboard": {
          await supabase.from("xp_transactions").delete().neq("id", "none");
          await supabase.from("user_levels").delete().neq("user_id", "none");
          break;
        }
        case "delete-old-reports": {
          const daysAgo = extra?.days || 30;
          const date = new Date(Date.now() - daysAgo * 86400000).toISOString();
          await supabase.from("question_reports").delete().eq("status", "pending").lt("created_at", date);
          break;
        }
        case "export-csv": {
          const { data } = await supabase.from("questions").select("*");
          if (data) {
            const csv = ["id,question_text,option_1,option_2,option_3,option_4,correct_option,explanation,year,paper,difficulty"]
              .concat(data.map((q: any) => `"${q.id}","${(q.question_text || "").replace(/"/g, '""')}","${(q.option_1 || "").replace(/"/g, '""')}","${(q.option_2 || "").replace(/"/g, '""')}","${(q.option_3 || "").replace(/"/g, '""')}","${(q.option_4 || "").replace(/"/g, '""')}",${q.correct_option},"${(q.explanation || "").replace(/"/g, '""')}","${q.year || ""}","${q.paper || ""}","${q.difficulty || ""}"`))
              .join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "questions_export.csv"; a.click();
            URL.revokeObjectURL(url);
          }
          break;
        }
      }
      showSave("Action completed!");
    } catch (e: any) { alert(e.message || "Action failed"); }
    finally { setActionLoading(null); }
  };

  const handleTriggerCron = async (job: string) => {
    setActionLoading("cron-" + job);
    try {
      const res = await fetch(`/api/admin/cron-jobs/${job}/run`, { method: "POST" });
      if (res.ok) showSave(`${job} triggered!`);
      else { const err = await res.json(); alert(err.error || "Failed"); }
    } finally {
      setActionLoading(null);
      fetch("/api/admin/cron-jobs").then((r) => r.json()).then(setCronStatus).catch(() => {});
    }
  };

  const cronJobs = [
    { id: "daily-question", label: "Daily Question Assignment", desc: "Auto-assigns questions for upcoming days" },
    { id: "daily-question-alert", label: "Daily Question Alert", desc: "Sends push notification about today's question" },
    { id: "daily-reminder", label: "Daily Reminder", desc: "Reminds users to practice daily" },
    { id: "streak-alert", label: "Streak Alert", desc: "Warns users about to lose their streak" },
  ];

  const renderTab = () => {
    switch (tab) {
      case "general": return (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">App Name</label>
              <Input value={general.appName || ""} onChange={(e) => setGeneral({ ...general, appName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">App Tagline</label>
              <Input value={general.tagline || ""} onChange={(e) => setGeneral({ ...general, tagline: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Contact Email</label>
              <Input type="email" value={general.contactEmail || ""} onChange={(e) => setGeneral({ ...general, contactEmail: e.target.value })} placeholder="admin@example.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">WhatsApp Number <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input value={general.whatsapp || ""} onChange={(e) => setGeneral({ ...general, whatsapp: e.target.value })} placeholder="+91XXXXXXXXXX" />
            </div>
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <p className="text-sm font-medium flex items-center gap-2">
                {general.maintenanceMode ? <WifiOff className="h-4 w-4 text-destructive" /> : <Wifi className="h-4 w-4 text-green-500" />}
                Maintenance Mode
              </p>
              <p className="text-xs text-muted-foreground">
                {general.maintenanceMode ? "Users see maintenance page" : "App is live"}
              </p>
            </div>
            <button onClick={() => setGeneral({ ...general, maintenanceMode: !general.maintenanceMode })}>
              {general.maintenanceMode ? <ToggleRight className="h-6 w-6 text-destructive" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
            </button>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">App Version</label>
            <Input value={general.appVersion || ""} onChange={(e) => setGeneral({ ...general, appVersion: e.target.value })} placeholder="1.0.0" className="h-9 max-w-[200px]" />
          </div>
          <div className="flex justify-end border-t pt-4">
            <Button onClick={handleSaveGeneral} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save General Settings
            </Button>
          </div>
        </div>
      );

      case "exam-dates": {
        const filteredCountdowns = countdownSearch
          ? countdowns.filter((c) => c.label.toLowerCase().includes(countdownSearch.toLowerCase()))
          : countdowns;
        return (
        <div className="space-y-5">
          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium shrink-0">Exam Countdowns</h3>
              <Input
                placeholder="Search countdowns..." value={countdownSearch}
                onChange={(e) => setCountdownSearch(e.target.value)}
                className="h-8 text-xs max-w-[200px]"
              />
              <span className="text-xs text-muted-foreground shrink-0">{filteredCountdowns.length} entries</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Label</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Official</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Active</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCountdowns.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                    {editingCountdown === c.id ? (
                      <>
                        <td className="px-4 py-2"><Input value={c.label} onChange={(e) => setCountdowns(countdowns.map((x) => x.id === c.id ? { ...x, label: e.target.value } : x))} className="h-8 text-sm" /></td>
                        <td className="px-4 py-2 hidden sm:table-cell"><Input type="date" value={c.examDate} onChange={(e) => setCountdowns(countdowns.map((x) => x.id === c.id ? { ...x, examDate: e.target.value } : x))} className="h-8 text-sm" /></td>
                        <td className="px-4 py-2 text-center hidden md:table-cell">
                          <button onClick={() => setCountdowns(countdowns.map((x) => x.id === c.id ? { ...x, isOfficial: !x.isOfficial } : x))}>
                            {c.isOfficial ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />}
                          </button>
                        </td>
                        <td className="px-4 py-2 text-center hidden md:table-cell">
                          {c.isActive ? <span className="text-xs text-green-600 font-medium">Active</span> : <span className="text-xs text-muted-foreground">Inactive</span>}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleUpdateCountdown(c.id, { label: c.label, exam_date: c.examDate, is_official: c.isOfficial })}>Save</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingCountdown(null)}>Cancel</Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium">{c.label}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{new Date(c.examDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          {c.isOfficial ? <Star className="h-4 w-4 text-yellow-500 mx-auto" /> : <span className="text-xs text-muted-foreground">Expected</span>}
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? "bg-green-50 dark:bg-green-950/30 text-green-600" : "bg-muted text-muted-foreground"}`}>
                            {c.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingCountdown(c.id)}>Edit</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs"
                              onClick={() => handleUpdateCountdown(c.id, { is_active: !c.isActive })}>
                              {c.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <button onClick={() => handleDeleteCountdown(c.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-medium">Add Exam Date</h3>
            <div className="grid sm:grid-cols-4 gap-3">
              <Input value={countdownForm.label} onChange={(e) => setCountdownForm({ ...countdownForm, label: e.target.value })} placeholder="Label (e.g. TGPSC AEE 2026)" className="h-9" />
              <Input type="date" value={countdownForm.examDate} onChange={(e) => setCountdownForm({ ...countdownForm, examDate: e.target.value })} className="h-9" />
              <select value={countdownForm.isOfficial ? "official" : "expected"} onChange={(e) => setCountdownForm({ ...countdownForm, isOfficial: e.target.value === "official" })}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="expected">Expected Date</option>
                <option value="official">Official Date</option>
              </select>
              <Button onClick={handleAddCountdown} disabled={!countdownForm.label || !countdownForm.examDate}>
                <Plus className="h-4 w-4 mr-1.5" /> Add
              </Button>
            </div>
          </div>
        </div>
      );}

      case "notifications": return (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">Push Notifications</p><p className="text-xs text-muted-foreground">Globally enable/disable all push notifications</p></div>
            <button onClick={() => setNotifConfig({ ...notifConfig, pushEnabled: !notifConfig.pushEnabled })}>
              {notifConfig.pushEnabled ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
            </button>
          </div>
          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="text-sm font-medium">Cron Jobs</h3>
              <span className="text-xs text-muted-foreground">{cronStatus.length} jobs</span>
            </div>
            <div className="divide-y">
              {(cronStatus.length > 0 ? cronStatus : cronJobs).map((job: any) => (
                <div key={job.id || job.name} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{job.label}</p>
                    <p className="text-xs text-muted-foreground">{job.description}</p>
                    {job.last_run && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Last run: {new Date(job.last_run).toLocaleString()} &middot;
                        Status: <span className={job.last_status === "success" ? "text-green-600" : job.last_status === "failed" ? "text-destructive" : ""}>{job.last_status}</span>
                        {job.next_run && <> &middot; Next: {new Date(job.next_run).toLocaleString()}</>}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="text-xs gap-1 shrink-0 ml-3"
                    onClick={() => handleTriggerCron(job.id || job.name)} disabled={actionLoading === "cron-" + (job.id || job.name)}>
                    {actionLoading === "cron-" + (job.id || job.name) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Run Now
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Email Sender</h3>
              <Button variant="outline" size="sm" onClick={async () => { await saveConfig("notifications", notifConfig); }} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Save
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">From Name</label>
                <Input value={notifConfig.emailFromName || ""} onChange={(e) => setNotifConfig({ ...notifConfig, emailFromName: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">From Email</label>
                <Input type="email" value={notifConfig.emailFromAddr || ""} onChange={(e) => setNotifConfig({ ...notifConfig, emailFromAddr: e.target.value })} placeholder="noreply@yourdomain.com" className="h-9" />
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
              <p className="font-medium text-xs text-muted-foreground">Email Template Preview</p>
              <p className="border-b pb-1">Subject: Daily Question — {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
              <p>Hi {`{{user_name}}`},</p>
              <p className="text-muted-foreground">Your daily question for today is ready. Click below to answer.</p>
              <p className="text-primary text-xs">[View Daily Question]</p>
              <p className="text-xs text-muted-foreground pt-1">— {notifConfig.emailFromName || "TGPSC Prep"} Team</p>
            </div>
          </div>
        </div>
      );

      case "access": return (
        <div className="space-y-5">
          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <h3 className="text-sm font-medium">Admin Users</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Role</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Added</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminProfiles.map((ap) => (
                  <tr key={ap.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{ap.name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{ap.email}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        <Shield className="h-3 w-3" /> {ap.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{new Date(ap.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleRevokeAdmin(ap)}>
                        <UserX className="h-3.5 w-3.5 mr-1" /> Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
                {adminProfiles.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No admin users</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-medium">Grant Admin Access</h3>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium">User Email</label>
                <Input value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} placeholder="user@example.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Role</label>
                <select value={grantRole} onChange={(e) => setGrantRole(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>
              <Button onClick={handleGrantAdmin} disabled={!grantEmail.trim() || granting}>
                {granting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <UserCheck className="h-4 w-4 mr-1.5" />}
                Grant
              </Button>
            </div>
          </div>
          <div className="border rounded-xl p-5">
            <h3 className="text-sm font-medium mb-3">Role Permissions</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Permission</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Admin</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Moderator</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["View reports", "✓", "✓"],
                  ["Resolve reports", "✓", "✓"],
                  ["Edit questions", "✓", "✓"],
                  ["Manage users", "✓", "—"],
                  ["Grant admin", "✓", "—"],
                  ["Delete questions", "✓", "—"],
                  ["Access settings", "✓", "—"],
                ].map(([perm, admin, mod], i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2">{perm}</td>
                    <td className="px-3 py-2 text-center text-green-600">{admin}</td>
                    <td className="px-3 py-2 text-center">{mod === "✓" ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

      case "content": {
        const CONTENT_DEFAULTS = { questionsPerTest: 150, timePerQuestion: 60, negativeMarking: false, negativeMarkValue: 0.33, maxBookmarks: null, dailyQuestionTime: "07:00", srsMinEase: 1.3, srsMaxEase: 2.5, srsInitialInterval: 1 };
        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
        return (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Questions per Test</label>
              <Input type="number" min={1} max={500} value={contentRules.questionsPerTest ?? 150} onChange={(e) => setContentRules({ ...contentRules, questionsPerTest: clamp(parseInt(e.target.value) || 150, 1, 500) })} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Time per Question (seconds)</label>
              <Input type="number" min={10} max={600} value={contentRules.timePerQuestion ?? 60} onChange={(e) => setContentRules({ ...contentRules, timePerQuestion: clamp(parseInt(e.target.value) || 60, 10, 600) })} className="h-9" />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Negative Marking</p><p className="text-xs text-muted-foreground">Deduct points for wrong answers</p></div>
              <button onClick={() => setContentRules({ ...contentRules, negativeMarking: !contentRules.negativeMarking })}>
                {contentRules.negativeMarking ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Negative Mark Value</label>
              <Input type="number" min={0} max={1} step="0.01" value={contentRules.negativeMarkValue ?? 0.33} onChange={(e) => setContentRules({ ...contentRules, negativeMarkValue: clamp(parseFloat(e.target.value) || 0.33, 0, 1) })} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Max Bookmarks per User</label>
              <Input type="number" min={0} value={contentRules.maxBookmarks ?? ""} placeholder="Unlimited" onChange={(e) => setContentRules({ ...contentRules, maxBookmarks: e.target.value ? parseInt(e.target.value) : null })} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Daily Question Time (IST)</label>
              <Input type="time" value={contentRules.dailyQuestionTime || "07:00"} onChange={(e) => setContentRules({ ...contentRules, dailyQuestionTime: e.target.value })} className="h-9" />
            </div>
          </div>
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-medium">SRS Algorithm Settings</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Min Ease Factor</label>
                <Input type="number" min={1.0} max={3.0} step="0.1" value={contentRules.srsMinEase ?? 1.3} onChange={(e) => setContentRules({ ...contentRules, srsMinEase: clamp(parseFloat(e.target.value) || 1.3, 1.0, 3.0) })} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Max Ease Factor</label>
                <Input type="number" min={1.0} max={5.0} step="0.1" value={contentRules.srsMaxEase ?? 2.5} onChange={(e) => setContentRules({ ...contentRules, srsMaxEase: clamp(parseFloat(e.target.value) || 2.5, 1.0, 5.0) })} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Initial Interval (days)</label>
                <Input type="number" min={1} max={90} value={contentRules.srsInitialInterval ?? 1} onChange={(e) => setContentRules({ ...contentRules, srsInitialInterval: clamp(parseInt(e.target.value) || 1, 1, 90) })} className="h-9" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setContentRules(CONTENT_DEFAULTS); }}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Reset to Defaults
            </Button>
            <Button onClick={handleSaveContent} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save Content Rules
            </Button>
          </div>
        </div>
      );}

      case "danger": return (
        <div className="space-y-4">
          <div className="border rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium flex items-center gap-2"><Trash2 className="h-4 w-4 text-destructive" /> Clear All Test Sessions</p>
                <p className="text-xs text-muted-foreground">Delete all test sessions and answers. Optionally filter by date.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input type="date" value={clearBeforeDate} onChange={(e) => setClearBeforeDate(e.target.value)} className="h-8 text-xs w-[140px]" title="Only clear sessions before this date" />
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                  onClick={() => handleDangerAction("clear-sessions", clearBeforeDate ? { before: new Date(clearBeforeDate).toISOString() } : undefined)} disabled={!!actionLoading}>
                  {actionLoading === "clear-sessions" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Clear{clearBeforeDate ? " Old" : " All"}
                </Button>
              </div>
            </div>
          </div>
          <div className="border rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 mt-0.5 text-destructive" />
              <div>
                <p className="text-sm font-medium">Reset Leaderboard Data</p>
                <p className="text-xs text-muted-foreground">Delete all XP transactions and level data. User profiles preserved.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0 ml-3"
              onClick={() => handleDangerAction("reset-leaderboard")} disabled={!!actionLoading}>
              {actionLoading === "reset-leaderboard" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Reset
            </Button>
          </div>
          <div className="border rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 mt-0.5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Export Questions as CSV</p>
                <p className="text-xs text-muted-foreground">Download all questions in CSV format for backup.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-blue-600 border-blue-600/30 hover:bg-blue-50 shrink-0 ml-3"
              onClick={() => handleDangerAction("export-csv")} disabled={!!actionLoading}>
              {actionLoading === "export-csv" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Export
            </Button>
          </div>
          <div className="border rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-600" /> Delete Old Pending Reports</p>
                <p className="text-xs text-muted-foreground">Remove pending reports older than a specified number of days.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Older than</span>
                  <Input type="number" min={1} max={365} value={reportAgeDays} onChange={(e) => setReportAgeDays(parseInt(e.target.value) || 30)} className="h-8 text-xs w-[60px]" />
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
                <Button variant="outline" size="sm" className="text-orange-600 border-orange-600/30 hover:bg-orange-50 shrink-0"
                  onClick={() => handleDangerAction("delete-old-reports", { days: reportAgeDays })} disabled={!!actionLoading}>
                  {actionLoading === "delete-old-reports" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure app-wide settings and preferences</p>
      </div>

      {saveMsg && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {saveMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 border-b pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
                tab === t.id ? "bg-card border-border text-foreground -mb-px" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="border rounded-xl p-6">
        {renderTab()}
      </div>
    </div>
  );
}
