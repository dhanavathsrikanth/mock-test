"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  FileText,
} from "lucide-react";
import Link from "next/link";

interface ParsedRow {
  row: number;
  year: string;
  paper: string;
  subject_slug: string;
  question_text: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_option: string;
  explanation: string;
  difficulty: string;
  error?: string;
}

const REQUIRED_COLS = [
  "question_text",
  "option_1",
  "option_2",
  "option_3",
  "option_4",
  "correct_option",
  "subject_slug",
];

const TEMPLATE_HEADER = [
  "year", "paper", "subject_slug", "question_text",
  "option_1", "option_2", "option_3", "option_4",
  "correct_option", "explanation", "difficulty",
];

export default function ImportQuestionsPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; skipped: number; total?: number; errors: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const csvContent = [
      TEMPLATE_HEADER.join(","),
      '2024,Paper-I,fluid-mechanics,"What is the unit of pressure?",Pa,bar,atm,psi,1,"Pressure unit",medium',
      '2023,Paper-II,solid-mechanics,"Young modulus measures:",Stiffness,Hardness,Toughness,Plasticity,1,,easy',
      '2024,Paper-I,environmental,"Match list I with list II:\n\n| **List I** | **List II** |\n| --- | --- |\n| **1. Ethnic** | **a.** Either only one or two level government |\n| **2. Majoritarianism** | **b.** A violent conflict opposing groups within a country |\n| **3. Civil war** | **c.** Belief that the majority community should be able to rule a country |\n| **4. Unitary system** | **d.** A social division based on culture |","1. d), 2. a), 3. c), 4. b)","1. b), 2. d), 3. a), 4. c)","1. c), 2. a), 3. b), 4. d)","1. d), 2. c), 3. b), 4. a)",4,,medium',
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "questions_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      alert("CSV must have a header row and at least one data row");
      return;
    }

    const header = parseCSVLine(lines[0]);
    const colMap = new Map<string, number>();
    header.forEach((col, i) => colMap.set(col.trim(), i));

    const missing = REQUIRED_COLS.filter((c) => !colMap.has(c));
    if (missing.length > 0) {
      alert(`Missing required columns: ${missing.join(", ")}`);
      return;
    }

    const parsed: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      const get = (col: string) => vals[colMap.get(col)!]?.trim() || "";

      const row: ParsedRow = {
        row: i + 1,
        year: get("year"),
        paper: get("paper"),
        subject_slug: get("subject_slug"),
        question_text: get("question_text"),
        option_1: get("option_1"),
        option_2: get("option_2"),
        option_3: get("option_3"),
        option_4: get("option_4"),
        correct_option: get("correct_option"),
        explanation: get("explanation"),
        difficulty: get("difficulty"),
      };

      const errors: string[] = [];
      if (!row.question_text) errors.push("Empty question text");
      if (!row.subject_slug) errors.push("Missing subject_slug");
      if (!row.option_1 || !row.option_2 || !row.option_3 || !row.option_4) errors.push("Missing options");
      const co = parseInt(row.correct_option);
      if (isNaN(co) || co < 1 || co > 4) errors.push("Invalid correct_option (must be 1-4)");

      if (errors.length > 0) {
        row.error = errors.join("; ");
      }

      parsed.push(row);
    }

    setRows(parsed);
    setResult(null);
  };

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    const valid = rows.filter((r) => !r.error);
    if (valid.length === 0) return;

    setImporting(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 90));
    }, 200);

    try {
      const res = await fetch("/api/admin/questions/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: valid }),
      });
      const data = await res.json();
      setProgress(100);
      setTimeout(() => setProgress(0), 1200);
      setResult(data);
      if (res.ok) {
        setRows([]);
      }
    } finally {
      clearInterval(progressInterval);
      setImporting(false);
    }
  };

  const validCount = rows.filter((r) => !r.error).length;
  const errorCount = rows.filter((r) => r.error).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/questions">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bulk Import Questions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Import multiple questions at once using a CSV file
        </p>
      </div>

      <div className="border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm">Step 1: Download Template</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Use our CSV template to format your questions correctly
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1.5" />
            Download CSV Template
          </Button>
        </div>

        <div className="border-t pt-4">
          <h2 className="font-semibold text-sm">Step 2: Upload CSV</h2>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              Drag and drop or click to select your CSV file. Supports regular questions and matching questions (with table format).
            </p>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium mt-2">
              Drop CSV file here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Supported columns: year, paper, subject_slug, question_text, option_1-4, correct_option, explanation, difficulty
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              <strong>Matching questions:</strong> Use markdown tables in question_text with | separators. Options format: "1. d), 2. a), 3. c), 4. b)"
            </p>
          </div>
        </div>
      </div>

      {/* Preview Table */}
      {rows.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium">{rows.length} rows</span>
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> {validCount} valid
              </span>
              {errorCount > 0 && (
                <span className="text-red-600 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" /> {errorCount} errors
                </span>
              )}
            </div>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">#</th>
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Question</th>
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium hidden sm:table-cell">Subject</th>
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Year</th>
                  <th className="text-center px-3 py-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Answer</th>
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.row} className={`border-b last:border-0 text-xs ${
                    row.error ? "bg-red-50 dark:bg-red-950/10" : ""
                  }`}>
                    <td className="px-3 py-2 text-muted-foreground font-mono">{row.row}</td>
                    <td className="px-3 py-2 max-w-[250px]">
                      <span className="line-clamp-1">{row.question_text || <span className="italic text-muted-foreground">(empty)</span>}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{row.subject_slug || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{row.year || "—"}</td>
                    <td className="px-3 py-2 text-center hidden md:table-cell">{row.correct_option || "—"}</td>
                    <td className="px-3 py-2">
                      {row.error ? (
                        <span className="text-red-600 flex items-center gap-1" title={row.error}>
                          <AlertTriangle className="h-3 w-3 shrink-0" /> Error
                        </span>
                      ) : (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 shrink-0" /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {importing && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Importing questions...
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Import Button */}
      {validCount > 0 && !result && (
        <div className="flex justify-end">
          <Button onClick={handleImport} disabled={importing} size="lg">
            {importing ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1.5" />
            )}
            Import {validCount} Question{validCount !== 1 ? "s" : ""}
          </Button>
        </div>
      )}

      {/* Result Summary */}
      {result && (
        <div className={`rounded-xl border p-6 ${
          result.imported > 0
            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
            : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
        }`}>
          <div className="flex items-center gap-3">
            {result.imported > 0 ? (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {result.imported > 0
                  ? `${result.imported} question${result.imported !== 1 ? "s" : ""} imported successfully`
                  : "Import failed"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {result.imported} imported, {result.skipped} skipped
                {result.total && ` (${result.total} total)`}
              </p>
            </div>
          </div>
          {result.errors && result.errors.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                View skipped rows ({result.skipped})
              </summary>
              <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
                {result.errors.map((e: any, i: number) => (
                  <p key={i} className="text-xs text-red-600">
                    Row {e.row}: {e.error}
                  </p>
                ))}
              </div>
            </details>
          )}
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/admin/questions">
              <FileText className="h-4 w-4 mr-1.5" />
              View Questions
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}
