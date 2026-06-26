"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Megaphone, Plus, Pencil, Trash2, Eye, EyeOff, Loader2, Calendar,
  X, Check, Info, AlertTriangle, CheckCircle, AlertCircle,
  Monitor, Globe, Link2, Clock, Ban, Send, Bell,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────

interface Announcement {
  id: string;
  type: "info" | "warning" | "success" | "alert";
  message: string;
  audience: "all" | "free" | "pro";
  show_on: "dashboard" | "all_pages" | "specific";
  specific_page: string | null;
  cta_text: string | null;
  cta_url: string | null;
  is_dismissible: boolean;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const emptyForm: {
  type: "info" | "warning" | "success" | "alert";
  message: string;
  audience: "all" | "free" | "pro";
  show_on: "dashboard" | "all_pages" | "specific";
  specific_page: string;
  cta_text: string;
  cta_url: string;
  is_dismissible: boolean;
  expires_at: string;
} = {
  type: "info",
  message: "",
  audience: "all",
  show_on: "dashboard",
  specific_page: "",
  cta_text: "",
  cta_url: "",
  is_dismissible: true,
  expires_at: "",
};

// ─── Type Config ─────────────────────────────────────────────────

const TYPE_CONFIG = {
  info: { icon: Info, label: "Info", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", btn: "bg-blue-500 hover:bg-blue-600" },
  warning: { icon: AlertTriangle, label: "Warning", bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300", badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", btn: "bg-yellow-500 hover:bg-yellow-600" },
  success: { icon: CheckCircle, label: "Success", bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300", badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", btn: "bg-green-500 hover:bg-green-600" },
  alert: { icon: AlertCircle, label: "Alert", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300", badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", btn: "bg-red-500 hover:bg-red-600" },
};

// ─── Announcement Preview ────────────────────────────────────────

function AnnouncementPreview({ type, message, ctaText, ctaUrl, isDismissible }: { type: string; message: string; ctaText?: string; ctaUrl?: string; isDismissible: boolean }) {
  const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.info;
  const Icon = cfg.icon;
  return (
    <div className={`rounded-xl border p-4 ${cfg.bg} flex items-start gap-3`}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{message || "Your announcement message appears here"}</p>
        {ctaText && ctaUrl && (
          <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className={`inline-block mt-2 text-xs px-3 py-1 rounded-md text-white ${cfg.btn}`}>
            {ctaText}
          </a>
        )}
      </div>
      {isDismissible && (
        <button className="shrink-0 p-0.5 rounded hover:bg-black/10"><X className="h-4 w-4" /></button>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export default function AnnouncementsPage() {
  const supabase = createClient();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      setAnnouncements(data || []);
    } finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const resetForm = () => { setForm(emptyForm); setEditing(null); };

  const handleEdit = (a: Announcement) => {
    setForm({
      type: a.type,
      message: a.message,
      audience: a.audience,
      show_on: a.show_on,
      specific_page: a.specific_page || "",
      cta_text: a.cta_text || "",
      cta_url: a.cta_url || "",
      is_dismissible: a.is_dismissible,
      expires_at: a.expires_at ? new Date(a.expires_at).toISOString().slice(0, 16) : "",
    });
    setEditing(a);
  };

  const handleSave = async () => {
    if (!form.message.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        type: form.type,
        message: form.message.trim(),
        audience: form.audience,
        show_on: form.show_on,
        specific_page: form.show_on === "specific" ? form.specific_page.trim() || null : null,
        cta_text: form.cta_text.trim() || null,
        cta_url: form.cta_url.trim() || null,
        is_dismissible: form.is_dismissible,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        is_active: editing?.is_active ?? true,
      };

      if (editing) {
        const { error } = await supabase.from("announcements").update(payload).eq("id", editing.id);
        if (error) { alert(error.message); return; }
      } else {
        const { error } = await supabase.from("announcements").insert(payload);
        if (error) { alert(error.message); return; }
      }
      resetForm();
      fetchAnnouncements();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    setAnnouncements(announcements.filter((a) => a.id !== id));
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("announcements").update({ is_active: !current }).eq("id", id);
    if (!error) fetchAnnouncements();
  };

  const [notifying, setNotifying] = useState<string | null>(null);

  const notifyUsers = async (a: Announcement) => {
    if (!confirm(`Send push notification about this announcement to ${a.audience === "all" ? "all users" : a.audience === "free" ? "free users" : "pro users"}?`)) return;
    setNotifying(a.id);
    try {
      const res = await fetch("/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "announcement",
          title: a.type.charAt(0).toUpperCase() + a.type.slice(1),
          message: a.message,
          link: null,
          audience: a.audience,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Notification sent to ${data.sent} users`);
      } else {
        alert(data.error || "Failed");
      }
    } finally {
      setNotifying(null);
    }
  };

  const getStatus = (a: Announcement) => {
    if (!a.is_active) return { label: "Draft", class: "bg-muted text-muted-foreground" };
    if (a.expires_at && new Date(a.expires_at) < new Date()) return { label: "Expired", class: "bg-red-50 dark:bg-red-950/30 text-red-600" };
    if (a.expires_at && new Date(a.expires_at) > new Date(Date.now() + 86400000)) return { label: "Scheduled", class: "bg-blue-50 dark:bg-blue-950/30 text-blue-600" };
    return { label: "Active", class: "bg-green-50 dark:bg-green-950/30 text-green-600" };
  };

  const AUDIENCE_LABELS: Record<string, string> = { all: "All Users", free: "Free Only", pro: "Pro Only" };
  const SHOW_ON_LABELS: Record<string, string> = { dashboard: "Dashboard", all_pages: "All Pages", specific: "Specific Page" };

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Create banners, alerts, and notifications for your users</p>
      </div>

      {/* ════════════════════════════════════════════════════════════
          CREATE / EDIT FORM
          ════════════════════════════════════════════════════════════ */}
      <div className="border rounded-xl p-5 space-y-5">
        <h2 className="font-semibold text-sm flex items-center gap-1.5">
          <Megaphone className="h-4 w-4" />
          {editing ? "Edit Announcement" : "Create Announcement"}
        </h2>

        {/* Type Selector */}
        <div>
          <label className="text-xs font-medium mb-2 block">Type</label>
          <div className="flex gap-2">
            {(Object.entries(TYPE_CONFIG) as [string, typeof TYPE_CONFIG.info][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const active = form.type === key;
              return (
                <button
                  key={key}
                  onClick={() => setForm({ ...form, type: key as any })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    active ? `${cfg.badge} border-current` : "border-input text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="text-xs font-medium mb-1.5 block">Message</label>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
            placeholder="Announcement message text..."
          />
        </div>

        {/* CTA Button */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block">CTA Button Text (optional)</label>
            <Input
              value={form.cta_text}
              onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
              placeholder="e.g. Learn More"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block">CTA Button URL (optional)</label>
            <Input
              value={form.cta_url}
              onChange={(e) => setForm({ ...form, cta_url: e.target.value })}
              placeholder="e.g. https://example.com"
            />
          </div>
        </div>

        {/* Audience + Show On */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block">Audience</label>
            <select
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value as any })}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Users</option>
              <option value="free">Free Only</option>
              <option value="pro">Pro Only</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block">Show On</label>
            <select
              value={form.show_on}
              onChange={(e) => setForm({ ...form, show_on: e.target.value as any })}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="dashboard">Dashboard</option>
              <option value="all_pages">All Pages</option>
              <option value="specific">Specific Page</option>
            </select>
          </div>
        </div>

        {/* Specific Page URL */}
        {form.show_on === "specific" && (
          <div>
            <label className="text-xs font-medium mb-1.5 block">Page URL</label>
            <Input
              value={form.specific_page}
              onChange={(e) => setForm({ ...form, specific_page: e.target.value })}
              placeholder="e.g. /test/select"
            />
          </div>
        )}

        {/* Expires + Dismissible */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block">Expires</label>
            <Input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Leave empty for &quot;Until dismissed&quot;</p>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                type="button"
                onClick={() => setForm({ ...form, is_dismissible: !form.is_dismissible })}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.is_dismissible ? "bg-green-500" : "bg-muted-foreground/30"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${form.is_dismissible ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className="text-xs font-medium">Dismissible by users</span>
            </label>
          </div>
        </div>

        {/* Preview */}
        <div>
          <label className="text-xs font-medium mb-2 flex items-center gap-1.5">
            <Eye className="h-3 w-3" /> Preview
          </label>
          <AnnouncementPreview
            type={form.type}
            message={form.message}
            ctaText={form.cta_text}
            ctaUrl={form.cta_url}
            isDismissible={form.is_dismissible}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button onClick={handleSave} disabled={!form.message.trim() || saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : editing ? <Pencil className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
            {editing ? "Update Announcement" : "Create Announcement"}
          </Button>
          {editing && <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          EXAMPLES
          ════════════════════════════════════════════════════════════ */}
      <details className="border rounded-xl">
        <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 select-none">
          <Megaphone className="h-4 w-4" /> Example Announcements
        </summary>
        <div className="px-4 pb-4 space-y-2">
          {[
            { message: "TGPSC AEE 2025 notification released! Check official website.", type: "info" as const },
            { message: "New questions added for 2023 paper.", type: "success" as const },
            { message: "Scheduled maintenance on Sunday 2AM.", type: "warning" as const },
          ].map((ex, i) => (
            <button
              key={i}
              onClick={() => { setForm({ ...form, message: ex.message, type: ex.type }); setEditing(null); }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-accent transition-colors border border-input flex items-center justify-between gap-2"
            >
              <span>{ex.message}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_CONFIG[ex.type].badge}`}>{TYPE_CONFIG[ex.type].label}</span>
            </button>
          ))}
        </div>
      </details>

      {/* ════════════════════════════════════════════════════════════
          ANNOUNCEMENTS TABLE
          ════════════════════════════════════════════════════════════ */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Active Announcements</h2>
          <span className="text-xs text-muted-foreground">{announcements.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-10">Type</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Message</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Audience</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden md:table-cell">Expires</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Status</th>
                <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
              ) : announcements.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <Megaphone className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  No announcements yet
                </td></tr>
              ) : (
                announcements.map((a) => {
                  const cfg = TYPE_CONFIG[a.type];
                  const Icon = cfg.icon;
                  const status = getStatus(a);
                  return (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${cfg.badge}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[250px]">
                        <p className="text-sm font-medium truncate">{a.message}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground"><Monitor className="h-3 w-3 inline mr-0.5" />{SHOW_ON_LABELS[a.show_on] || a.show_on}</span>
                          {a.cta_text && <span className="text-[10px] text-muted-foreground"><Link2 className="h-3 w-3 inline mr-0.5" />{a.cta_text}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{AUDIENCE_LABELS[a.audience] || a.audience}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                        {a.expires_at ? new Date(a.expires_at).toLocaleDateString() : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => notifyUsers(a)} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Notify Users" disabled={notifying === a.id}>
                            {notifying === a.id ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" /> : <Bell className="h-4 w-4 text-muted-foreground" />}
                          </button>
                          <button onClick={() => toggleActive(a.id, a.is_active)} className="p-1.5 rounded-md hover:bg-muted transition-colors" title={a.is_active ? "Deactivate" : "Activate"}>
                            {a.is_active ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                          </button>
                          <button onClick={() => handleEdit(a)} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Edit">
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors" title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
