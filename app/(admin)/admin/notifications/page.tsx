"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Send,
  Loader2,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  BarChart3,
  History,
  Users,
  UserCheck,
  Flame,
  UserX,
  SlidersHorizontal,
  Eye,
  Calendar,
  Ban,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────

interface AdminNotification {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  audience_type: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_count: number;
  total_count: number;
  opened_count: number;
  clicked_count: number;
  sent_by_name: string;
  total_subscribers: number;
  created_at: string;
}

interface CronJob {
  name: string;
  label: string;
  schedule: string;
  description: string;
  max_duration: number;
  last_run: string | null;
  last_status: string;
  last_message: string | null;
  next_run: string | null;
}

// ─── Audience Labels ─────────────────────────────────────────────

const AUDIENCE_LABELS: Record<string, string> = {
  all: "All Users",
  active_7d: "Active (7 days)",
  streak_gt_7: "Streak > 7 days",
  inactive_3d: "Inactive 3+ days",
  custom: "Custom Filter",
};

const AUDIENCE_ICONS: Record<string, any> = {
  all: Users,
  active_7d: UserCheck,
  streak_gt_7: Flame,
  inactive_3d: UserX,
  custom: SlidersHorizontal,
};

// ─── Status Badge ────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-blue-50 dark:bg-blue-950/30 text-blue-600",
    sending: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600",
    sent: "bg-green-50 dark:bg-green-950/30 text-green-600",
    failed: "bg-red-50 dark:bg-red-950/30 text-red-600",
    cancelled: "bg-muted text-muted-foreground line-through",
    success: "bg-green-50 dark:bg-green-950/30 text-green-600",
    running: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600",
    never_run: "bg-muted text-muted-foreground",
  };

  const labels: Record<string, string> = {
    draft: "Draft",
    scheduled: "Scheduled",
    sending: "Sending...",
    sent: "Sent",
    failed: "Failed",
    cancelled: "Cancelled",
    success: "Success",
    running: "Running",
    never_run: "Never Run",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-muted text-muted-foreground"}`}>
      {status === "success" || status === "sent" ? <CheckCircle2 className="h-3 w-3" /> : status === "failed" ? <XCircle className="h-3 w-3" /> : status === "running" || status === "sending" ? <Loader2 className="h-3 w-3 animate-spin" /> : status === "scheduled" ? <Clock className="h-3 w-3" /> : null}
      {labels[status] || status}
    </span>
  );
}

// ─── Notification Preview ────────────────────────────────────────

function NotificationPreview({ title, body, url }: { title: string; body: string; url: string }) {
  return (
    <div className="border rounded-xl p-4 bg-gradient-to-br from-background to-muted/30 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{title || "Notification Title"}</p>
          {body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{body}</p>}
          {url && <p className="text-[10px] text-primary mt-1 truncate">{url}</p>}
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        just now
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export default function NotificationsPage() {
  const [tab, setTab] = useState<"send" | "history" | "cron">("send");

  // ── Tab: Send Broadcast ──
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/daily");
  const [audienceType, setAudienceType] = useState("all");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // ── Tab: Notification History ──
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── Tab: Cron Jobs ──
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loadingCron, setLoadingCron] = useState(false);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  // ── Audience count ──
  const fetchAudienceCount = useCallback(async (type: string) => {
    try {
      const res = await fetch("/api/admin/notifications/audience-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience_type: type, audience_filter: {} }),
      });
      if (res.ok) {
        const data = await res.json();
        setAudienceCount(data.count);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchAudienceCount(audienceType);
  }, [audienceType, fetchAudienceCount]);

  // ── Fetch history ──
  const fetchNotifications = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/admin/notifications");
      if (res.ok) setNotifications(await res.json());
    } finally { setLoadingHistory(false); }
  }, []);

  // ── Fetch cron jobs ──
  const fetchCronJobs = useCallback(async () => {
    setLoadingCron(true);
    try {
      const res = await fetch("/api/admin/cron-jobs");
      if (res.ok) setCronJobs(await res.json());
    } finally { setLoadingCron(false); }
  }, []);

  useEffect(() => { fetchNotifications(); fetchCronJobs(); }, [fetchNotifications, fetchCronJobs]);

  // ── Send handlers ──
  const handleSendTest = async () => {
    if (!title.trim()) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url: url.trim() || "/daily" }),
      });
      const data = await res.json();
      setTestResult(res.ok ? "Test notification sent! Check your device." : data.error || "Failed to send test");
    } catch { setTestResult("Failed to send test notification"); }
    finally { setSendingTest(false); }
  };

  const handleSend = async () => {
    if (!title.trim()) return;
    setSending(true);
    try {
      let scheduledAt: string | null = null;
      if (sendMode === "schedule" && scheduledDate && scheduledTime) {
        scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || null,
          url: url.trim() || "/daily",
          audience_type: audienceType,
          audience_filter: {},
          scheduled_at: scheduledAt,
        }),
      });

      if (res.ok) {
        setTitle("");
        setBody("");
        setUrl("/daily");
        setShowConfirm(false);
        fetchNotifications();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to send");
      }
    } finally { setSending(false); }
  };

  // ── Cancel notification ──
  const handleCancel = async (id: string) => {
    const res = await fetch(`/api/admin/notifications/${id}`, { method: "DELETE" });
    if (res.ok) fetchNotifications();
  };

  // ── Run cron job ──
  const handleRunCron = async (name: string) => {
    setRunningJob(name);
    try {
      const res = await fetch(`/api/admin/cron-jobs/${name}/run`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Job failed");
      }
      fetchCronJobs();
    } finally { setRunningJob(null); }
  };

  // ── Computed ──
  const charsRemainingTitle = Math.max(0, 50 - title.length);
  const charsRemainingBody = Math.max(0, 150 - body.length);
  const isFormValid = title.trim().length > 0;
  const AudienceIcon = AUDIENCE_ICONS[audienceType] || Users;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Send push broadcasts, view history, and manage cron jobs</p>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {[
          { key: "send" as const, label: "Send Broadcast", icon: Send },
          { key: "history" as const, label: "History", icon: History },
          { key: "cron" as const, label: "Cron Jobs", icon: BarChart3 },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════
          TAB 1: SEND BROADCAST
          ════════════════════════════════════════════════════════════ */}
      {tab === "send" && (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Composer */}
          <div className="lg:col-span-3 border rounded-xl p-5 space-y-5">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <Bell className="h-4 w-4" /> Notification Composer
            </h2>

            {/* Title */}
            <div>
              <label className="text-xs font-medium mb-1.5 flex items-center justify-between">
                <span>Title</span>
                <span className={`text-[10px] font-mono ${charsRemainingTitle <= 5 ? "text-red-500" : "text-muted-foreground"}`}>
                  {title.length}/50
                </span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 50))}
                placeholder="Notification title (max 50 chars)"
                className={charsRemainingTitle <= 5 ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
            </div>

            {/* Body */}
            <div>
              <label className="text-xs font-medium mb-1.5 flex items-center justify-between">
                <span>Body</span>
                <span className={`text-[10px] font-mono ${charsRemainingBody <= 15 ? "text-red-500" : "text-muted-foreground"}`}>
                  {body.length}/150
                </span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 150))}
                placeholder="Notification body (max 150 chars, optional)"
                className={`w-full min-h-[80px] rounded-lg border px-3 py-2 text-sm resize-none bg-background ${
                  charsRemainingBody <= 15 ? "border-red-500" : "border-input"
                }`}
              />
            </div>

            {/* URL */}
            <div>
              <label className="text-xs font-medium mb-1.5">Deep Link URL</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/daily"
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Page users land on when tapping the notification</p>
            </div>

            {/* Preview */}
            <div>
              <label className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <Eye className="h-3 w-3" /> Preview
              </label>
              <NotificationPreview title={title} body={body} url={url} />
            </div>
          </div>

          {/* Sidebar: Audience + Schedule + Actions */}
          <div className="lg:col-span-2 space-y-4">
            {/* Audience */}
            <div className="border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Audience
              </h3>
              <div className="space-y-1.5">
                {[
                  { value: "all", label: "All Users", icon: Users },
                  { value: "active_7d", label: "Active (practiced last 7 days)", icon: UserCheck },
                  { value: "streak_gt_7", label: "Users with streak &gt; 7", icon: Flame },
                  { value: "inactive_3d", label: "Haven't practiced in 3+ days", icon: UserX },
                  { value: "custom", label: "Custom (by level)", icon: SlidersHorizontal },
                ].map((option) => {
                  const Icon = option.icon;
                  const active = audienceType === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setAudienceType(option.value)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
              {audienceCount !== null && (
                <div className="flex items-center justify-between pt-1 border-t text-xs">
                  <span className="text-muted-foreground">Estimated reach</span>
                  <span className="font-semibold">{audienceCount.toLocaleString()} users</span>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Schedule
              </h3>
              <div className="space-y-1.5">
                <button
                  onClick={() => setSendMode("now")}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                    sendMode === "now" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send immediately
                </button>
                <button
                  onClick={() => setSendMode("schedule")}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                    sendMode === "schedule" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Schedule for later
                </button>
              </div>
              {sendMode === "schedule" && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleSendTest}
                disabled={!isFormValid || sendingTest}
              >
                {sendingTest ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Bell className="h-4 w-4 mr-1.5" />}
                Send Test to Myself
              </Button>
              {testResult && (
                <p className={`text-xs px-3 py-1.5 rounded-lg ${testResult.includes("sent") ? "bg-green-50 dark:bg-green-950/30 text-green-600" : "bg-red-50 dark:bg-red-950/30 text-red-600"}`}>
                  {testResult}
                </p>
              )}
              <Button
                size="sm"
                className="w-full"
                disabled={!isFormValid || sending}
                onClick={() => setShowConfirm(true)}
              >
                {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                {sendMode === "schedule" ? "Schedule Broadcast" : "Send Broadcast"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Send Confirmation Modal ─── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-background rounded-xl shadow-2xl border w-full max-w-sm mx-4 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Send className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{sendMode === "schedule" ? "Schedule Broadcast" : "Send Broadcast"}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {sendMode === "schedule"
                  ? `This will schedule a notification to ${(audienceCount || 0).toLocaleString()} users.`
                  : `This will send to ${(audienceCount || 0).toLocaleString()} users. Confirm?`}
              </p>
              {title && <p className="text-sm font-medium mt-2 bg-muted rounded-lg px-3 py-2">"{title}"</p>}
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button onClick={handleSend} disabled={sending}>
                {sending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {sendMode === "schedule" ? "Schedule" : "Send Now"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 2: NOTIFICATION HISTORY
          ════════════════════════════════════════════════════════════ */}
      {tab === "history" && (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <History className="h-4 w-4" /> Notification History
            </h2>
            <Button variant="ghost" size="sm" onClick={fetchNotifications} className="text-xs h-7">
              Refresh
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Message</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden md:table-cell">Audience</th>
                  <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Sent</th>
                  <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground hidden lg:table-cell">Opened</th>
                  <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground hidden lg:table-cell">Clicked</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
                ) : notifications.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    No notifications sent yet
                  </td></tr>
                ) : (
                  notifications.map((n) => {
                    const AudienceIcon = AUDIENCE_ICONS[n.audience_type] || Users;
                    const openRate = n.total_count > 0 ? Math.round((n.opened_count / n.total_count) * 100) : 0;
                    const clickRate = n.total_count > 0 ? Math.round((n.clicked_count / n.total_count) * 100) : 0;
                    return (
                      <tr key={n.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {n.sent_at ? new Date(n.sent_at).toLocaleDateString() : n.scheduled_at ? new Date(n.scheduled_at).toLocaleDateString() : "—"}
                          <br />
                          <span className="text-[10px]">{n.sent_at ? new Date(n.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          {n.body && <p className="text-xs text-muted-foreground truncate">{n.body}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                          <span className="inline-flex items-center gap-1">
                            <AudienceIcon className="h-3 w-3" />
                            {AUDIENCE_LABELS[n.audience_type] || n.audience_type}
                          </span>
                          <br />
                          <span className="text-[10px]">{n.sent_by_name}</span>
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <span className="text-sm font-medium">{n.sent_count || 0}</span>
                          <span className="text-xs text-muted-foreground">/{n.total_count}</span>
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">{openRate}%</span>
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">{clickRate}%</span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <StatusBadge status={n.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {n.status === "scheduled" ? (
                            <button
                              onClick={() => handleCancel(n.id)}
                              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              title="Cancel"
                            >
                              <Ban className="h-4 w-4 text-destructive" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCancel(n.id)}
                              className="p-1.5 rounded-md hover:bg-muted transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 3: CRON JOBS STATUS
          ════════════════════════════════════════════════════════════ */}
      {tab === "cron" && (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" /> Cron Jobs
            </h2>
            <Button variant="ghost" size="sm" onClick={fetchCronJobs} className="text-xs h-7">
              Refresh
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Schedule</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden md:table-cell">Last Run</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden lg:table-cell">Next Run</th>
                  <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingCron ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
                ) : cronJobs.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No cron jobs found</td></tr>
                ) : (
                  cronJobs.map((job) => (
                    <tr key={job.name} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{job.label}</p>
                        <p className="text-[10px] text-muted-foreground hidden sm:block">{job.description}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden sm:table-cell">{job.schedule}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                        {job.last_run ? new Date(job.last_run).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={job.last_status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                        {job.next_run ? new Date(job.next_run).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleRunCron(job.name)}
                          disabled={runningJob === job.name}
                        >
                          {runningJob === job.name ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3 mr-1" />
                          )}
                          Run Now
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
