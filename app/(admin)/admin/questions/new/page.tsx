"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Check,
  ArrowLeft,
  Save,
  Plus,
  ImagePlus,
  X,
  Upload,
  ArrowDownUp,
  FileText,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { MatchingQuestionBuilder } from "@/components/admin/MatchingQuestionBuilder";
import { useToast } from "@/components/ui/toast-provider";

type QuestionType = "regular" | "matching";

export default function NewQuestionPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [exams, setExams] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [topics, setTopics] = useState<{ id: string; name: string; subject_id: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(null);
  const [questionType, setQuestionType] = useState<QuestionType>("regular");

  const [form, setForm] = useState({
    exam_id: "",
    subject_id: "",
    topic_id: "",
    year: "",
    paper: "",
    question_text: "",
    option_1: "",
    option_2: "",
    option_3: "",
    option_4: "",
    correct_option: 1,
    explanation: "",
    difficulty: "",
    image_url: "",
  });

  const supabase = createClient();

  useEffect(() => {
    supabase.from("exams").select("id, name").eq("is_active", true).order("name").then(({ data }) => {
      setExams(data || []);
      if (data && data.length > 0 && !form.exam_id) {
        setForm((prev) => ({ ...prev, exam_id: data[0].id }));
      }
    });
    supabase.from("subjects").select("id, name").order("name").then(({ data }) => {
      setSubjects(data || []);
    });
    supabase.from("topics").select("id, name, subject_id").order("name").then(({ data }) => {
      setTopics(data || []);
    });
  }, []);

  const filteredTopics = topics.filter((t) => t.subject_id === form.subject_id);

  const set = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast("Image too large. Max 5MB.", "error");
      return;
    }
    setImageFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setImagePreview(result);
      }
    };
    reader.onerror = () => {
      console.error("Failed to read file");
    };
    reader.readAsDataURL(file);
    setForm((prev) => ({ ...prev, image_url: "" }));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setUploadedImagePath(null);
    if (form.image_url) setForm((prev) => ({ ...prev, image_url: "" }));
  };

  const handleMatchingQuestionChange = (
    questionText: string,
    options: string[],
    correctOption: number
  ) => {
    setForm((prev) => ({
      ...prev,
      question_text: questionText,
      option_1: options[0] || "",
      option_2: options[1] || "",
      option_3: options[2] || "",
      option_4: options[3] || "",
      correct_option: correctOption,
    }));
  };

  const handleSave = async (addAnother: boolean) => {
    setSaving(true);
    let imageUrl = form.image_url;

    if (imageFile && !imageUrl) {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("questionId", "temp");
      const res = await fetch("/api/admin/questions/upload-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "Failed to upload image", "error");
        setSaving(false);
        setUploading(false);
        return;
      }
      const { url, path } = await res.json();
      imageUrl = url;
      setUploadedImagePath(path);
      setUploading(false);
    }

    const payload: Record<string, any> = {
      exam_id: form.exam_id,
      subject_id: form.subject_id,
      topic_id: form.topic_id || null,
      year: form.year ? parseInt(form.year) || null : null,
      paper: form.paper || null,
      question_text: form.question_text,
      option_1: form.option_1,
      option_2: form.option_2,
      option_3: form.option_3,
      option_4: form.option_4,
      correct_option: form.correct_option,
      explanation: form.explanation || null,
      difficulty: form.difficulty || null,
      image_url: imageUrl || null,
    };

    const { data, error } = await supabase.from("questions").insert(payload).select("id").single();

    setSaving(false);

    if (error) {
      if (uploadedImagePath) {
        await supabase.storage.from("question-images").remove([uploadedImagePath]);
        setUploadedImagePath(null);
      }
      toast(error.message, "error");
      return;
    }

    setSavedId(data.id);

    if (addAnother) {
      setForm({
        exam_id: form.exam_id,
        subject_id: form.subject_id,
        topic_id: "",
        year: "",
        paper: "",
        question_text: "",
        option_1: "",
        option_2: "",
        option_3: "",
        option_4: "",
        correct_option: 1,
        explanation: "",
        difficulty: "",
        image_url: "",
      });
      setImageFile(null);
      setImagePreview(null);
      setUploadedImagePath(null);
      setSavedId(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/admin/questions");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/questions">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add New Question</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Create a new question for the question bank</p>
      </div>

      {savedId && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-300">
            Question saved successfully!
          </p>
        </div>
      )}

      <div className="border rounded-xl p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Exam *</label>
            <select
              value={form.exam_id}
              onChange={(e) => set("exam_id", e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
              required
            >
              <option value="">Select exam</option>
              {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Subject *</label>
            <select
              value={form.subject_id}
              onChange={(e) => set("subject_id", e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
              required
            >
              <option value="">Select subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => set("difficulty", e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Select difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Year</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => set("year", e.target.value)}
              placeholder="e.g. 2023"
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Paper</label>
            <select
              value={form.paper}
              onChange={(e) => set("paper", e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Select paper</option>
              <option value="Paper-I">Paper-I</option>
              <option value="Paper-II">Paper-II</option>
            </select>
          </div>

          {filteredTopics.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Topic</label>
              <select
                value={form.topic_id}
                onChange={(e) => set("topic_id", e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Select topic</option>
                {filteredTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Question Type Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Question Type</label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={questionType === "regular" ? "default" : "outline"}
              size="sm"
              onClick={() => setQuestionType("regular")}
            >
              <FileText className="h-4 w-4 mr-1.5" />
              Regular Question
            </Button>
            <Button
              type="button"
              variant={questionType === "matching" ? "default" : "outline"}
              size="sm"
              onClick={() => setQuestionType("matching")}
            >
              <ArrowDownUp className="h-4 w-4 mr-1.5" />
              Matching Question
            </Button>
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Question Image <span className="text-muted-foreground font-normal">(optional)</span></label>
          {imagePreview ? (
            <div className="relative rounded-lg border overflow-hidden">
              <div className="relative w-full max-h-64 bg-muted/20">
                <img
                  src={imagePreview}
                  alt="Question image preview"
                  style={{ maxWidth: '100%', maxHeight: '256px', objectFit: 'contain' }}
                />
              </div>
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 p-1 rounded-full bg-background/80 border hover:bg-background transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-32 rounded-lg border border-dashed border-muted-foreground/30 cursor-pointer hover:bg-muted/20 transition-colors">
              <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Click to upload an image (max 5MB)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Question Content - Regular or Matching */}
        {questionType === "matching" ? (
          <MatchingQuestionBuilder
            onChange={handleMatchingQuestionChange}
            initialData={{
              questionText: form.question_text,
              options: [form.option_1, form.option_2, form.option_3, form.option_4],
              correctOption: form.correct_option,
            }}
          />
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Question Text *</label>
              <textarea
                value={form.question_text}
                onChange={(e) => set("question_text", e.target.value)}
                placeholder="Type or paste the question text here..."
                className="w-full min-h-[100px] rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Supports basic text. Use ^ for superscript (e.g., m^3 for m³).
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="space-y-1.5">
                  <label className="text-xs font-medium">
                    Option {String.fromCharCode(64 + n)} *
                  </label>
                  <input
                    value={(form as any)[`option_${n}`]}
                    onChange={(e) => set(`option_${n}`, e.target.value)}
                    placeholder={`Option ${n}`}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                    required
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Correct Answer *</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set("correct_option", n)}
                    className={`h-10 w-10 rounded-lg border text-sm font-medium transition-all ${
                      form.correct_option === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium">Explanation <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea
            value={form.explanation}
            onChange={(e) => set("explanation", e.target.value)}
            placeholder="Explain the correct answer..."
            className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        <Button
          variant="outline"
          onClick={() => handleSave(true)}
          disabled={saving || uploading || !form.subject_id || !form.question_text || !form.option_1}
        >
          {(saving || uploading) ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
          {uploading ? "Uploading image..." : "Save & Add Another"}
        </Button>
        <Button
          onClick={() => handleSave(false)}
          disabled={saving || uploading || !form.subject_id || !form.question_text || !form.option_1}
        >
          {(saving || uploading) ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
          {uploading ? "Uploading image..." : "Save Question"}
        </Button>
      </div>
    </div>
  );
}
