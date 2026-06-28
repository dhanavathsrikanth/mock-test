"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewExamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", fullName: "", category: "Engineering", examType: "state", isActive: true });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("exams").insert({
      name: form.name,
      full_name: form.fullName,
      category: form.category,
      exam_type: form.examType,
      is_active: form.isActive,
    }).select("id").single();
    setSaving(false);
    if (error) { toast(error.message, "error"); return; }
    router.push(`/admin/exams/${data.id}`);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild><Link href="/admin/exams"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
      <h1 className="text-2xl font-bold tracking-tight">Add New Exam</h1>
      <div className="border rounded-xl p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Short Name *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. TSPSC AEE" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Full Name</label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Full exam name" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="Engineering">Engineering</option>
              <option value="Medical">Medical</option>
              <option value="Civil Services">Civil Services</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Type</label>
            <select value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value })}
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
          <button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })}
            className={`relative h-6 w-11 rounded-full transition-colors ${form.isActive ? "bg-primary" : "bg-muted"}`}>
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.isActive ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />} Create Exam
        </Button>
      </div>
    </div>
  );
}
