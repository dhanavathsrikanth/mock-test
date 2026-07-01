"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast-provider";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  Megaphone, Plus, Pencil, Trash2, Eye, EyeOff, Loader2,
  X, Info, AlertTriangle, CheckCircle, AlertCircle,
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "update" | "maintenance";
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

const emptyForm = {
  title: "",
  body: "",
  type: "info" as Announcement["type"],
  starts_at: "",
  expires_at: "",
};

const TYPE_CONFIG: Record<string, { icon: any; label: string; badge: string }> = {
  info: { icon: Info, label: "Info", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  warning: { icon: AlertTriangle, label: "Warning", badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  update: { icon: CheckCircle, label: "Update", badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  maintenance: { icon: AlertCircle, label: "Maintenance", badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export default function AnnouncementsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const { confirmDialog } = useConfirm();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("announcements").select("id, title, body, type, is_active, starts_at, expires_at, created_by, created_at").order("created_at", { ascending: false });
      setAnnouncements(data || []);
    } finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const resetForm = () => { setForm(emptyForm); setEditing(null); };

  const handleEdit = (a: Announcement) => {
    setForm({
      title: a.title || "",
      body: a.body || "",
      type: a.type,
      starts_at: a.starts_at ? new Date(a.starts_at).toISOString().slice(0, 16) : "",
      expires_at: a.expires_at ? new Date(a.expires_at).toISOString().slice(0, 16) : "",
    });
    setEditing(a);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      };

      if (editing) {
        const { error } = await supabase.from("announcements").update(payload).eq("id", editing.id);
        if (error) { toast(error.message, "error"); return; }
      } else {
        const { error } = await supabase.from("announcements").insert(payload);
        if (error) { toast(error.message, "error"); return; }
      }
      resetForm();
      fetchAnnouncements();
      toast(editing ? "Announcement updated" : "Announcement created", "success");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!await confirmDialog({ title: "Delete Announcement", message: "Delete this announcement?" })) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) { toast(error.message, "error"); return; }
    setAnnouncements(announcements.filter((a) => a.id !== id));
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("announcements").update({ is_active: !current }).eq("id", id);
    if (!error) fetchAnnouncements();
  };

  const getStatus = (a: Announcement) => {
    if (!a.is_active) return { label: "Draft", class: "bg-muted text-muted-foreground" };
    if (a.expires_at && new Date(a.expires_at) < new Date()) return { label: "Expired", class: "bg-red-50 dark:bg-red-950/30 text-red-600" };
    if (a.starts_at && new Date(a.starts_at) > new Date()) return { label: "Scheduled", class: "bg-blue-50 dark:bg-blue-950/30 text-blue-600" };
    return { label: "Active", class: "bg-green-50 dark:bg-green-950/30 text-green-600" };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Create banners, alerts, and notifications for your users</p>
      </div>

      {/* CREATE / EDIT FORM */}
      <div className="border rounded-xl p-5 space-y-5">
        <h2 className="font-semibold text-sm flex items-center gap-1.5">
          <Megaphone className="h-4 w-4" />
          {editing ? "Edit Announcement" : "Create Announcement"}
        </h2>

        <div>
          <label className="text-xs font-medium mb-2 block">Type</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
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

        <div>
          <label className="text-xs font-medium mb-1.5 block">Title *</label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Announcement title..."
          />
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block">Body *</label>
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none whitespace-pre-wrap"
            placeholder="Announcement body text..."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block">Starts At</label>
            <Input
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Leave empty for immediate</p>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block">Expires At</label>
            <Input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Leave empty for no expiry</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button onClick={handleSave} disabled={!form.title.trim() || !form.body.trim() || saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : editing ? <Pencil className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
            {editing ? "Update" : "Create"}
          </Button>
          {editing && <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
        </div>
      </div>

      {/* ANNOUNCEMENTS TABLE */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Announcements</h2>
          <span className="text-xs text-muted-foreground">{announcements.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-10">Type</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden md:table-cell">Expires</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Status</th>
                <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
              ) : announcements.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  <Megaphone className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  No announcements yet
                </td></tr>
              ) : (
                announcements.map((a) => {
                  const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.info;
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
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{a.body}</p>
                      </td>
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
