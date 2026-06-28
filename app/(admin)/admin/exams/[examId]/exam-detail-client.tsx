"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Pencil, Save, Loader2, BookOpen, Check, X } from "lucide-react";
import Link from "next/link";

const EMOJIS = ["📚", "📐", "🔬", "📖", "🧮", "⚡", "🌍", "🧬", "📝", "🎯", "💡", "📊", "🏛️", "🔢", "🧪", "📜"];

export function ExamDetailClient({ exam, subjects }: { exam: any; subjects: any[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { confirmDialog } = useConfirm();
  const [examForm, setExamForm] = useState({
    name: exam.name, fullName: exam.full_name || "", category: exam.category || "Engineering",
    examType: exam.exam_type || "state", isActive: exam.is_active,
  });
  const [saving, setSaving] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: "", slug: "", icon: "📚" });
  const [adding, setAdding] = useState(false);
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", icon: "", isActive: true });
  const supabase = createClient();

  const handleSaveExam = async () => {
    setSaving(true);
    await supabase.from("exams").update({
      name: examForm.name, full_name: examForm.fullName, category: examForm.category,
      exam_type: examForm.examType, is_active: examForm.isActive,
    }).eq("id", exam.id);
    setSaving(false);
    router.refresh();
  };

  const handleAddSubject = async () => {
    if (!newSubject.name.trim()) return;
    setAdding(true);
    const slug = newSubject.slug || newSubject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { error } = await supabase.from("subjects").insert({
      exam_id: exam.id, name: newSubject.name.trim(), slug, icon: newSubject.icon,
    });
    setAdding(false);
    if (error) { toast(error.message, "error"); return; }
    setNewSubject({ name: "", slug: "", icon: "📚" });
    router.refresh();
  };

  const handleDeleteSubject = async (id: string) => {
    if (!await confirmDialog({ title: "Delete Subject", message: "Delete this subject and all its questions?" })) return;
    await supabase.from("subjects").delete().eq("id", id);
    router.refresh();
  };

  const startEdit = (s: any) => {
    setEditingSubject(s.id);
    setEditForm({ name: s.name, slug: s.slug, icon: s.icon || "📚", isActive: s.is_active !== false });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim()) return;
    await supabase.from("subjects").update({
      name: editForm.name, slug: editForm.slug, icon: editForm.icon, is_active: editForm.isActive,
    }).eq("id", id);
    setEditingSubject(null);
    router.refresh();
  };

  const cancelEdit = () => setEditingSubject(null);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild><Link href="/admin/exams"><ArrowLeft className="h-4 w-4" /> Back to Exams</Link></Button>
      <h1 className="text-2xl font-bold tracking-tight">{exam.name}</h1>

      <div className="border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-sm">Exam Details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><label className="text-xs font-medium">Short Name</label><Input value={examForm.name} onChange={(e) => setExamForm({ ...examForm, name: e.target.value })} /></div>
          <div className="space-y-1.5"><label className="text-xs font-medium">Full Name</label><Input value={examForm.fullName} onChange={(e) => setExamForm({ ...examForm, fullName: e.target.value })} /></div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Category</label>
            <select value={examForm.category} onChange={(e) => setExamForm({ ...examForm, category: e.target.value })}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="Engineering">Engineering</option>
              <option value="Medical">Medical</option>
              <option value="Civil Services">Civil Services</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Type</label>
            <select value={examForm.examType} onChange={(e) => setExamForm({ ...examForm, examType: e.target.value })}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="state">State</option>
              <option value="central">Central</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">Show this exam to users</p>
          </div>
          <button type="button" onClick={() => setExamForm({ ...examForm, isActive: !examForm.isActive })}
            className={`relative h-6 w-11 rounded-full transition-colors ${examForm.isActive ? "bg-primary" : "bg-muted"}`}>
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${examForm.isActive ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <Button onClick={handleSaveExam} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />} Save Changes
        </Button>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> Subjects</h2>
          <span className="text-xs text-muted-foreground">{subjects.length} subjects</span>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-8" />
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Slug</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Questions</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Active</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
          </tr></thead>
          <tbody>
            {subjects.map((s) => (
              editingSubject === s.id ? (
                <tr key={s.id} className="border-b last:border-0 bg-muted/20">
                  <td className="px-4 py-2">
                    <Input value={editForm.icon} onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })} className="w-12 h-8 text-center text-lg" />
                  </td>
                  <td className="px-4 py-2"><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-8" /></td>
                  <td className="px-4 py-2 hidden md:table-cell"><Input value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} className="h-8 text-xs" /></td>
                  <td className="px-4 py-2 text-center text-muted-foreground hidden sm:table-cell">{s.questions}</td>
                  <td className="px-4 py-2 text-center hidden sm:table-cell">
                    <button onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${editForm.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {editForm.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => saveEdit(s.id)} className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-950/20"><Check className="h-3.5 w-3.5 text-green-600" /></button>
                      <button onClick={cancelEdit} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20"><X className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-lg">{s.icon || "📚"}</td>
                  <td className="px-4 py-3"><span className="font-medium">{s.name}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell"><code className="text-[10px] bg-muted px-1 py-0.5 rounded">{s.slug}</code></td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">{s.questions}</td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.is_active !== false ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {s.is_active !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => startEdit(s)} className="p-1.5 rounded-md hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => handleDeleteSubject(s.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t bg-muted/10">
          <p className="text-xs font-medium text-muted-foreground mb-2">Add Subject</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="relative">
              <select value={newSubject.icon} onChange={(e) => setNewSubject({ ...newSubject, icon: e.target.value })}
                className="h-9 rounded-lg border border-input bg-background px-2 text-lg w-12 text-center appearance-none cursor-pointer">
                {EMOJIS.map((emoji) => <option key={emoji} value={emoji}>{emoji}</option>)}
              </select>
            </div>
            <Input value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
              placeholder="Subject name" className="h-9 flex-1 min-w-[160px]" />
            <Input value={newSubject.slug} onChange={(e) => setNewSubject({ ...newSubject, slug: e.target.value })}
              placeholder="slug (auto)" className="h-9 w-28 text-xs hidden md:block" />
            <Button size="sm" onClick={handleAddSubject} disabled={!newSubject.name.trim() || adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
