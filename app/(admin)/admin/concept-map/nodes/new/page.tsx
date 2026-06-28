"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewTopicPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [form, setForm] = useState({ subjectId: "", parentId: "", name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("subjects").select("id, name").order("name").then(({ data }) => setSubjects(data || []));
    supabase.from("topics").select("id, name, subject_id").order("name").then(({ data }) => setTopics(data || []));
  }, []);

  const parentOptions = topics.filter((t) => t.subject_id === form.subjectId);

  const handleSave = async () => {
    if (!form.name.trim() || !form.subjectId) return;
    setSaving(true);
    const { error } = await supabase.from("topics").insert({
      subject_id: form.subjectId, parent_id: form.parentId || null, name: form.name.trim(), description: form.description || null, sort_order: 0,
    });
    setSaving(false);
    if (error) { toast(error.message, "error"); return; }
    router.push("/admin/concept-map");
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild><Link href="/admin/concept-map"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
      <h1 className="text-2xl font-bold tracking-tight">Add Topic</h1>
      <div className="border rounded-xl p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Subject *</label>
          <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value, parentId: "" })}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="">Select subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Parent Topic <span className="text-muted-foreground font-normal">(optional)</span></label>
          <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="">None (root topic)</option>
            {parentOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Name *</label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Topic name" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" />
        </div>
        <Button onClick={handleSave} disabled={!form.name.trim() || !form.subjectId || saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />} Create Topic
        </Button>
      </div>
    </div>
  );
}
