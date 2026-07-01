"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast-provider";
import { MathText } from "@/components/MathText";
import {
  Download,
  Upload,
  FileText,
  ArrowDownUp,
  X,
  Check,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RefreshCw,
} from "lucide-react";

interface ImportRow {
  question_id: string;
  question_text: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_option: number;
  explanation: string;
  subject_name: string;
  year: string;
  difficulty: string;
  _status: "pending" | "editing" | "ready" | "error" | "duplicate";
  _error?: string;
}

interface QuestionImportExportProps {
  reports: any[];
  subjects: { id: string; name: string }[];
  onImportComplete?: () => void;
}

function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  const rawRows = text.split(/\r?\n/).filter((r) => r.trim());
  for (const rawRow of rawRows) {
    const cells: string[] = [];
    let cell = "";
    let inQ = false;
    for (let i = 0; i < rawRow.length; i++) {
      const c = rawRow[i];
      if (c === '"') {
        if (inQ && rawRow[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (c === "," && !inQ) {
        cells.push(cell.trim());
        cell = "";
      } else {
        cell += c;
      }
    }
    cells.push(cell.trim());
    result.push(cells);
  }
  return result;
}

function toCSV(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(",")
    )
    .join("\n");
}

export function QuestionImportExport({
  reports,
  subjects,
  onImportComplete,
}: QuestionImportExportProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"idle" | "import-regular" | "import-matching">("idle");
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const REGULAR_HEADER = [
    "question_id",
    "question_text",
    "option_1",
    "option_2",
    "option_3",
    "option_4",
    "correct_option",
    "explanation",
    "subject_name",
    "year",
    "difficulty",
  ];

  const MATCHING_HEADER = [
    "question_id",
    "question_text",
    "option_1",
    "option_2",
    "option_3",
    "option_4",
    "correct_option",
    "explanation",
    "subject_name",
    "year",
    "difficulty",
  ];

  const handleExport = () => {
    const supabase = createClient();
    const rows: string[][] = [
      [
        "question_id",
        "question_text",
        "option_1",
        "option_2",
        "option_3",
        "option_4",
        "correct_option",
        "explanation",
        "subject",
        "year",
        "report_type",
        "report_status",
        "report_description",
        "reporter",
        "created_at",
      ],
    ];

    for (const r of reports) {
      const q = r.questions;
      rows.push([
        r.question_id || "",
        q?.question_text || "",
        q?.option_1 || "",
        q?.option_2 || "",
        q?.option_3 || "",
        q?.option_4 || "",
        String(q?.correct_option || ""),
        q?.explanation || "",
        q?.subjects?.name || "",
        String(q?.year || ""),
        r.report_type || "",
        r.status || "",
        r.description || "",
        r.profiles?.full_name || r.profiles?.email || "",
        r.created_at || "",
      ]);
    }

    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reported_questions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${reports.length} reported questions`, "success");
  };

  const parseImportFile = (file: File, type: "regular" | "matching") => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const rows = parseCSV(text);
      if (rows.length < 2) {
        toast("CSV file is empty or has no data rows", "error");
        return;
      }

      const header = rows[0].map((h) => h.toLowerCase().trim());
      const expectedHeader = type === "regular" ? REGULAR_HEADER : MATCHING_HEADER;

      const headerValid = expectedHeader.every((h) => header.includes(h));
      if (!headerValid) {
        toast(
          `Invalid header. Expected: ${expectedHeader.join(", ")}`,
          "error"
        );
        return;
      }

      const mapIdx = (field: string) => header.indexOf(field);
      const qid = mapIdx("question_id");
      const qi = mapIdx("question_text");
      const o1 = mapIdx("option_1");
      const o2 = mapIdx("option_2");
      const o3 = mapIdx("option_3");
      const o4 = mapIdx("option_4");
      const co = mapIdx("correct_option");
      const ex = mapIdx("explanation");
      const sn = mapIdx("subject_name");
      const yr = mapIdx("year");
      const df = mapIdx("difficulty");

      const parsed: ImportRow[] = rows.slice(1).map((row) => {
        const correctOpt = parseInt(row[co]) || 1;
        return {
          question_id: row[qid] || "",
          question_text: row[qi] || "",
          option_1: row[o1] || "",
          option_2: row[o2] || "",
          option_3: row[o3] || "",
          option_4: row[o4] || "",
          correct_option: Math.min(4, Math.max(1, correctOpt)),
          explanation: row[ex] || "",
          subject_name: row[sn] || "",
          year: row[yr] || "",
          difficulty: row[df] || "",
          _status: "ready" as const,
        };
      });

      const withErrors = parsed.map((row) => {
        if (!row.question_text.trim()) {
          return { ...row, _status: "error" as const, _error: "Missing question text" };
        }
        if (!row.option_1.trim() || !row.option_2.trim()) {
          return { ...row, _status: "error" as const, _error: "Missing options" };
        }
        return row;
      });

      const seenIds = new Set<string>();
      const seenTexts = new Set<string>();
      const withDuplicates = withErrors.map((row) => {
        if (row._status === "error") return row;

        if (row.question_id && seenIds.has(row.question_id)) {
          return { ...row, _status: "duplicate" as const, _error: "Duplicate ID" };
        }
        if (row.question_id) seenIds.add(row.question_id);

        const textKey = row.question_text.trim().toLowerCase().slice(0, 200);
        if (seenTexts.has(textKey)) {
          return { ...row, _status: "duplicate" as const, _error: "Duplicate text" };
        }
        seenTexts.add(textKey);

        return row;
      });

      setImportRows(withDuplicates);
      setMode(type === "regular" ? "import-regular" : "import-matching");
      setEditingIdx(null);
    };
    reader.readAsText(file);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>, type: "regular" | "matching") => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseImportFile(file, type);
    if (e.target) e.target.value = "";
  };

  const updateRow = (idx: number, field: keyof ImportRow, value: any) => {
    setImportRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value, _error: undefined } : row))
    );
  };

  const removeRow = (idx: number) => {
    setImportRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const startImport = async () => {
    const readyRows = importRows.filter((r) => r._status === "ready" || r._status === "editing");
    if (readyRows.length === 0) {
      toast("No valid questions to import", "error");
      return;
    }

    setImporting(true);
    setImportProgress({ done: 0, total: readyRows.length });
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast("Not authenticated", "error");
      setImporting(false);
      return;
    }

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of readyRows) {
      try {
        let existingId = false;
        let existingText = false;

        if (row.question_id) {
          const { data: existing } = await supabase
            .from("questions")
            .select("id")
            .eq("id", row.question_id)
            .maybeSingle();
          if (existing) existingId = true;
        }

        if (!existingId) {
          const { data: existingTexts } = await supabase
            .from("questions")
            .select("id")
            .ilike("question_text", row.question_text.trim())
            .limit(1);
          if (existingTexts && existingTexts.length > 0) existingText = true;
        }

        if (existingId || existingText) {
          skipped++;
          setImportProgress((prev) => ({ done: prev.done + 1, total: prev.total }));
          continue;
        }

        let subjectId: string | null = null;
        if (row.subject_name.trim()) {
          const { data: subject } = await supabase
            .from("subjects")
            .select("id")
            .ilike("name", row.subject_name.trim())
            .maybeSingle();
          subjectId = subject?.id || null;
        }

        const insertData: any = {
          question_text: row.question_text,
          option_1: row.option_1,
          option_2: row.option_2,
          option_3: row.option_3,
          option_4: row.option_4,
          correct_option: row.correct_option,
          explanation: row.explanation || null,
          subject_id: subjectId,
          year: row.year ? parseInt(row.year) || null : null,
          difficulty: row.difficulty || null,
        };

        if (row.question_id) {
          insertData.id = row.question_id;
        }

        const { error } = await supabase.from("questions").insert(insertData);

        if (error) {
          failed++;
          console.error("Import error:", error);
        } else {
          imported++;
        }
      } catch {
        failed++;
      }
      setImportProgress((prev) => ({ done: prev.done + 1, total: prev.total }));
    }

    setImporting(false);
    setImportRows([]);
    setMode("idle");

    const parts = [`imported ${imported}`];
    if (skipped > 0) parts.push(`skipped ${skipped} duplicates`);
    if (failed > 0) parts.push(`${failed} failed`);
    toast(parts.join(", "), imported > 0 ? "success" : "error");
    onImportComplete?.();
  };

  if (mode === "idle") {
    return (
      <>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleImportFile(e, "regular")}
        />
        <input
          ref={editFileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleImportFile(e, "matching")}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Import Regular MCQ
          </Button>
          <Button variant="outline" size="sm" onClick={() => editFileRef.current?.click()} className="gap-1.5">
            <ArrowDownUp className="h-3.5 w-3.5" />
            Import Matching
          </Button>
        </div>
      </>
    );
  }

  const readyCount = importRows.filter((r) => r._status === "ready" || r._status === "editing").length;
  const errorCount = importRows.filter((r) => r._status === "error").length;
  const duplicateCount = importRows.filter((r) => r._status === "duplicate").length;
  const currentRow = editingIdx !== null ? importRows[editingIdx] : null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setMode("idle"); setImportRows([]); setEditingIdx(null); }}>
            <X className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-sm">
              {mode === "import-regular" ? "Import Regular MCQ" : "Import Matching Questions"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {importRows.length} parsed · {readyCount} ready · {duplicateCount} duplicates · {errorCount} errors
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={importing}
            onClick={() => { setMode("idle"); setImportRows([]); setEditingIdx(null); }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={importing || readyCount === 0}
            onClick={startImport}
            className="gap-1.5"
          >
            {importing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Importing {importProgress.done}/{importProgress.total}...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Import {readyCount} Questions
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Question list sidebar */}
        <div className="w-80 border-r overflow-y-auto shrink-0">
          <div className="p-2 space-y-1">
            {importRows.map((row, idx) => (
              <button
                key={idx}
                onClick={() => setEditingIdx(idx)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors ${
                  editingIdx === idx
                    ? "bg-primary/10 border border-primary/20"
                    : row._status === "error"
                    ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
                    : row._status === "duplicate"
                    ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
                    : "hover:bg-muted/50 border border-transparent"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground mt-0.5 shrink-0">#{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium leading-tight">
                      {row.question_text || "No question text"}
                    </p>
                    {row._error && (
                      <p className={`mt-0.5 flex items-center gap-1 ${
                        row._status === "duplicate" ? "text-amber-600 dark:text-amber-400" : "text-red-500"
                      }`}>
                        {row._status === "duplicate" ? (
                          <RefreshCw className="h-3 w-3 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                        )}
                        {row._error}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={row._status === "error" ? "destructive" : row._status === "duplicate" ? "outline" : "secondary"}
                    className={`text-[9px] shrink-0 ${
                      row._status === "duplicate" ? "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700" : ""
                    }`}
                  >
                    {row._status === "error" ? "Error" : row._status === "duplicate" ? "Duplicate" : "Ready"}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Edit panel */}
        <div className="flex-1 overflow-y-auto">
          {currentRow ? (
            <div className="max-w-2xl mx-auto p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit Question #{editingIdx! + 1}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={editingIdx === 0}
                    onClick={() => setEditingIdx((prev) => (prev !== null ? Math.max(0, prev - 1) : null))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {editingIdx! + 1} / {importRows.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={editingIdx === importRows.length - 1}
                    onClick={() => setEditingIdx((prev) => (prev !== null ? Math.min(importRows.length - 1, prev + 1) : null))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Question Text *</label>
                <textarea
                  value={currentRow.question_text}
                  onChange={(e) => updateRow(editingIdx!, "question_text", e.target.value)}
                  className="w-full min-h-[100px] rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none"
                />
              </div>

              {/* Options */}
              <div className="grid sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((n) => {
                  const field = `option_${n}` as keyof ImportRow;
                  const val = currentRow[field] as string;
                  return (
                    <div key={n} className="space-y-1.5">
                      <label className="text-xs font-medium">
                        Option {String.fromCharCode(64 + n)} *
                        {n === currentRow.correct_option && (
                          <Badge variant="default" className="ml-1.5 text-[9px]">Correct</Badge>
                        )}
                      </label>
                      <input
                        value={val}
                        onChange={(e) => updateRow(editingIdx!, field, e.target.value)}
                        className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Correct Option */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Correct Answer *</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => updateRow(editingIdx!, "correct_option", n)}
                      className={`h-10 w-10 rounded-lg border text-sm font-medium transition-all ${
                        currentRow.correct_option === n
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Explanation <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea
                  value={currentRow.explanation}
                  onChange={(e) => updateRow(editingIdx!, "explanation", e.target.value)}
                  className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none"
                />
              </div>

              {/* Metadata */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Subject</label>
                  <input
                    value={currentRow.subject_name}
                    onChange={(e) => updateRow(editingIdx!, "subject_name", e.target.value)}
                    placeholder="e.g. Civil Engineering"
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Year</label>
                  <input
                    value={currentRow.year}
                    onChange={(e) => updateRow(editingIdx!, "year", e.target.value)}
                    placeholder="e.g. 2024"
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Difficulty</label>
                  <select
                    value={currentRow.difficulty}
                    onChange={(e) => updateRow(editingIdx!, "difficulty", e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Preview */}
              <div className="border rounded-lg p-4 space-y-2 bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground">Preview</p>
                <div className="text-sm">
                  <MathText text={currentRow.question_text} />
                </div>
                <div className="space-y-1 mt-2">
                  {[1, 2, 3, 4].map((n) => {
                    const field = `option_${n}` as keyof ImportRow;
                    const val = currentRow[field] as string;
                    const isCorrect = n === currentRow.correct_option;
                    return (
                      <div
                        key={n}
                        className={`rounded-lg px-3 py-2 text-xs ${
                          isCorrect
                            ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                            : "bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        <span className="font-medium">{String.fromCharCode(64 + n)}.</span> {val}
                        {isCorrect && <Check className="h-3 w-3 inline ml-1" />}
                      </div>
                    );
                  })}
                </div>
                {currentRow.explanation && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="font-medium text-foreground">Explanation:</span> {currentRow.explanation}
                  </p>
                )}
              </div>

              {/* Delete row */}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  removeRow(editingIdx!);
                  setEditingIdx((prev) => (prev !== null ? Math.min(prev, importRows.length - 2) : null));
                }}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Remove Question
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <FileText className="h-10 w-10" />
              <p className="text-sm">Select a question from the list to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
