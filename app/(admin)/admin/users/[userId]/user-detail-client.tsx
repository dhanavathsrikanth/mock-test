"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Shield,
  Mail,
  Calendar,
  Zap,
  Activity,
  Bookmark,
  Flag,
  Trophy,
  Award,
  Skull,
  Bell,
  Ban,
  Trash2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  Brain,
  Target,
  MessageSquare,
  Clock,
  ChevronRight,
  BarChart3,
  LineChart,
  Sun,
  Flame,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart as RechartsLineChart, Line,
} from "recharts";

interface UserDetail {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  xp: number;
  banned: boolean;
  createdAt: string;
  level: number;
  levelName: string;
  streak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

interface Stats {
  totalTests: number;
  completedTests: number;
  avgScore: number;
  totalAttempted: number;
  correctCount: number;
  accuracy: number;
  bookmarks: number;
  reports: number;
  totalXpEarned: number;
  subjectBreakdown: Record<string, number>;
  dailyQTotal: number;
  dailyQCorrect: number;
  dailyQAccuracy: number;
}

interface SessionStats {
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
}

interface Session {
  id: string;
  totalQuestions: number;
  mode: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  sessionStats: SessionStats;
}

interface Report {
  id: string;
  reportType: string;
  status: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

interface Badge {
  badgeType: string;
  unlockedAt: string;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function UserDetailClient({
  user, stats, sessions, reports, transactions, badges,
  subjectAccuracy, accuracyTrend, xpTimeline, notifications,
}: {
  user: UserDetail;
  stats: Stats;
  sessions: Session[];
  reports: Report[];
  transactions: Transaction[];
  badges: Badge[];
  subjectAccuracy: { name: string; accuracy: number; attempts: number }[];
  accuracyTrend: { date: string; accuracy: number }[];
  xpTimeline: { date: string; xp: number }[];
  notifications: NotificationItem[];
}) {
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    setActionLoading(action);
    const supabase = createClient();
    try {
      switch (action) {
        case "reset progress": {
          await supabase.from("test_sessions").delete().eq("user_id", user.id);
          await supabase.from("test_answers").delete().eq("session_id", "none");
          await supabase.from("bookmarks").delete().eq("user_id", user.id);
          await supabase.from("xp_transactions").delete().eq("user_id", user.id);
          await supabase.from("user_levels").delete().eq("user_id", user.id);
          await supabase.from("streaks").delete().eq("user_id", user.id);
          await supabase.from("spaced_repetition").delete().eq("user_id", user.id);
          break;
        }
        case "ban": {
          await supabase.from("profiles").update({ banned: !user.banned }).eq("id", user.id);
          break;
        }
        case "delete": {
          await supabase.from("profiles").delete().eq("id", user.id);
          router.push("/admin/users");
          return;
        }
        case "grant admin": {
          await supabase.from("profiles").update({ role: "admin" }).eq("id", user.id);
          break;
        }
      }
      router.refresh();
    } catch (e) {
      alert("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim()) return;
    setSending(true);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          type: "admin",
          title: notifTitle,
          message: notifBody || null,
          link: null,
        }),
      });
      // Also attempt push notification (best-effort)
      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, title: notifTitle, body: notifBody }),
      }).catch(() => {});
      setNotifOpen(false);
      setNotifTitle("");
      setNotifBody("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users"><ArrowLeft className="h-4 w-4" /> Back to Users</Link>
        </Button>
      </div>

      {/* Profile Card */}
      <div className="border rounded-xl p-6 flex flex-col sm:flex-row items-start gap-5">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold shrink-0">
          {user.fullName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{user.fullName}</h1>
            {user.role === "admin" && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                <Shield className="h-3 w-3" /> Admin
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> {user.email}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Last active {user.lastActiveDate ? new Date(user.lastActiveDate).toLocaleDateString() : "Never"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setNotifOpen(true)} className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Notify
          </Button>
        </div>
      </div>

      {/* Level & Streak */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="border rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Level</p>
          <p className="text-2xl font-bold mt-0.5">{user.level}</p>
          <p className="text-xs text-muted-foreground capitalize">{user.levelName}</p>
        </div>
        <div className="border rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Total XP</p>
          <p className="text-2xl font-bold mt-0.5">{user.xp.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{stats.totalXpEarned.toLocaleString()} all time</p>
        </div>
        <div className="border rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Streak</p>
          <p className="text-2xl font-bold mt-0.5">{user.streak}</p>
          <p className="text-xs text-muted-foreground">Best: {user.longestStreak} days</p>
        </div>
        <div className="border rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Accuracy</p>
          <p className="text-2xl font-bold mt-0.5">{stats.accuracy}%</p>
          <p className="text-xs text-muted-foreground">{stats.correctCount}/{stats.totalAttempted} correct</p>
        </div>
        <div className="border rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Daily Q's</p>
          <p className="text-2xl font-bold mt-0.5">{stats.dailyQTotal}</p>
          <p className="text-xs text-muted-foreground">{stats.dailyQAccuracy}% accuracy</p>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="border rounded-xl p-5">
        <h2 className="font-semibold text-sm mb-4">Activity Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Total Tests</p>
            <p className="text-lg font-bold">{stats.totalTests}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-lg font-bold">{stats.completedTests}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Questions Attempted</p>
            <p className="text-lg font-bold">{stats.totalAttempted.toLocaleString()}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Avg Score</p>
            <p className="text-lg font-bold">{stats.avgScore}</p>
          </div>
        </div>
      </div>

      {/* Subject-wise Accuracy */}
      {subjectAccuracy.length > 0 && (
        <div className="border rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Target className="h-4 w-4" /> Subject-Wise Accuracy</h2>
          <div className="space-y-2">
            {subjectAccuracy.slice(0, 8).map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-xs w-28 truncate shrink-0">{s.name}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.accuracy}%`, background: s.accuracy >= 60 ? "#22c55e" : s.accuracy >= 40 ? "#f59e0b" : "#ef4444" }} />
                </div>
                <span className="text-xs font-medium w-10 text-right">{s.accuracy}%</span>
                <span className="text-[10px] text-muted-foreground w-16 text-right">{s.attempts} attempts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts: Accuracy Trend + XP Timeline */}
      <div className="grid sm:grid-cols-2 gap-4">
        {accuracyTrend.length > 1 && (
          <div className="border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><LineChart className="h-4 w-4" /> Accuracy Trend</h2>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsLineChart data={accuracyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="accuracy" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: "#8b5cf6", r: 3 }} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        )}
        {xpTimeline.length > 0 && (
          <div className="border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Zap className="h-4 w-4" /> XP Earned (Daily)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={xpTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="xp" stroke="#22c55e" fill="#22c55e20" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Test History */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Test History</h2>
          <span className="text-xs text-muted-foreground">{sessions.length} sessions</span>
        </div>
        {sessions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No test sessions</div>
        ) : (
          <div className="divide-y">
            {sessions.slice(0, 15).map((s) => {
              const st = s.sessionStats;
              const sessionAcc = st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0;
              return (
                <div key={s.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {s.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : s.status === "in_progress" ? (
                        <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <p className="text-sm font-medium capitalize">{s.mode.replace(/_/g, " ")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {st.total > 0 && (
                    <div className="flex items-center gap-3 text-xs ml-6">
                      <span className="text-green-600 font-medium">{st.correct} correct</span>
                      <span className="text-red-500">{st.wrong} wrong</span>
                      <span className="text-muted-foreground">{st.skipped} skipped</span>
                      <span className="text-muted-foreground">· {sessionAcc}%</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[120px]">
                        <div className="h-full rounded-full" style={{ width: `${sessionAcc}%`, background: sessionAcc >= 60 ? "#22c55e" : sessionAcc >= 40 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bookmarks & Daily Questions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bookmark className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Bookmarks</h2>
            <span className="text-xs text-muted-foreground ml-auto">{stats.bookmarks} total</span>
          </div>
          {Object.keys(stats.subjectBreakdown).length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookmarks yet</p>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(stats.subjectBreakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([subject, count]) => (
                  <div key={subject} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate">{subject}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Daily Questions */}
        <div className="border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sun className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Daily Questions</h2>
            <span className="text-xs text-muted-foreground ml-auto">{stats.dailyQTotal} total</span>
          </div>
          {stats.dailyQTotal === 0 ? (
            <p className="text-sm text-muted-foreground">No daily questions answered</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Answered</span>
                <span className="font-medium">{stats.dailyQTotal}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600">Correct</span>
                <span className="font-medium text-green-600">{stats.dailyQCorrect}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-500">Wrong</span>
                <span className="font-medium text-red-500">{stats.dailyQTotal - stats.dailyQCorrect}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">Accuracy</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${stats.dailyQAccuracy}%` }} />
                </div>
                <span className="text-xs font-medium">{stats.dailyQAccuracy}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* XP Transaction History */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold text-sm">XP History</h2>
          <span className="text-xs text-muted-foreground">{transactions.length} entries</span>
        </div>
        {transactions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No XP transactions</div>
        ) : (
          <div className="divide-y max-h-[300px] overflow-y-auto">
            {transactions.map((t) => (
              <div key={t.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <TrendingUp className={`h-3.5 w-3.5 shrink-0 ${t.amount > 0 ? "text-green-500" : "text-red-500"}`} />
                  <span className="text-sm truncate">{t.reason}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-medium ${t.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                    {t.amount > 0 ? "+" : ""}{t.amount}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Award className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Badges</h2>
        </div>
        {badges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No badges earned yet</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {badges.map((b, i) => (
              <div key={i} className="border rounded-xl p-3 text-center">
                <div className="w-8 h-8 rounded-full bg-yellow-50 dark:bg-yellow-950/30 flex items-center justify-center mx-auto mb-1">
                  <Trophy className="h-4 w-4 text-yellow-600" />
                </div>
                <p className="text-[10px] font-medium capitalize">{b.badgeType.replace(/_/g, " ")}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(b.unlockedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reports Submitted */}
      <div className="border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flag className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Reports Submitted</h2>
          <span className="text-xs text-muted-foreground ml-auto">{stats.reports} total</span>
        </div>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports submitted</p>
        ) : (
          <div className="space-y-2">
            {reports.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm truncate">{r.reportType.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                  r.status === "pending" ? "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600" :
                  r.status === "resolved" ? "bg-green-50 dark:bg-green-950/30 text-green-600" :
                  "bg-blue-50 dark:bg-blue-950/30 text-blue-600"
                }`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notifications History */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" /> Notifications Sent
          </h2>
          <span className="text-xs text-muted-foreground">{notifications.length} total</span>
        </div>
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications sent yet</div>
        ) : (
          <div className="divide-y max-h-[300px] overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className="px-4 py-2.5">
                <div className="flex items-start gap-2">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.isRead ? "bg-muted-foreground/30" : "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{n.title}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] capitalize px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{n.type}</span>
                      {n.isRead ? (
                        <span className="text-[10px] text-muted-foreground">Read</span>
                      ) : (
                        <span className="text-[10px] text-primary font-medium">Unread</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="border border-red-200 dark:border-red-900 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900 flex items-center gap-2">
          <Skull className="h-4 w-4 text-destructive" />
          <h2 className="font-semibold text-sm text-destructive">Danger Zone</h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Reset Progress</p>
              <p className="text-xs text-muted-foreground">Delete all test sessions, answers, bookmarks, and XP</p>
            </div>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
              onClick={() => handleAction("reset progress")} disabled={!!actionLoading}>
              {actionLoading === "reset progress" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Reset
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{user.banned ? "Unban User" : "Ban User"}</p>
              <p className="text-xs text-muted-foreground">{user.banned ? "Restore this user's access" : "Prevent this user from accessing the app"}</p>
            </div>
            <Button variant="outline" size="sm" className={user.banned ? "text-green-600 border-green-300 hover:bg-green-50 gap-1.5" : "text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"}
              onClick={() => handleAction("ban")} disabled={!!actionLoading}>
              {actionLoading === "ban" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : user.banned ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
              {user.banned ? "Unban" : "Ban"}
            </Button>
          </div>
          {user.role !== "admin" && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Grant Admin</p>
                <p className="text-xs text-muted-foreground">Elevate this user to admin role</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => handleAction("grant admin")} disabled={!!actionLoading}>
                {actionLoading === "grant admin" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                Grant
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently remove this user and all data</p>
            </div>
            <Button variant="destructive" size="sm" className="gap-1.5"
              onClick={() => handleAction("delete")} disabled={!!actionLoading}>
              {actionLoading === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setNotifOpen(false)} />
          <div className="relative bg-background rounded-xl shadow-2xl border w-full max-w-md mx-4 p-6 space-y-4">
            <h2 className="font-semibold">Send Notification</h2>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Title</label>
              <Input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} placeholder="Notification title" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Body</label>
              <textarea
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                placeholder="Notification body (optional)"
                className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setNotifOpen(false)}>Cancel</Button>
              <Button onClick={handleSendNotification} disabled={!notifTitle.trim() || sending}>
                {sending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
