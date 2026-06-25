"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Flag,
  AlertTriangle,
  HelpCircle,
  Type,
  List,
  CalendarClock,
  MessageSquare,
  Loader2,
} from "lucide-react";

interface ReportButtonProps {
  questionId: string;
  questionText?: string;
  subjectName?: string;
  year?: number;
  questionNumber?: number;
  className?: string;
}

export function ReportButton({
  questionId,
  questionText,
  subjectName,
  year,
  questionNumber,
  className = "",
}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reportStatus, setReportStatus] = useState<"none" | "reported" | "corrected">("none");
  const [showToast, setShowToast] = useState(false);

  const handleReportSubmit = () => {
    setReportStatus("reported");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  if (reportStatus === "corrected") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
        <span className="text-green-500">&#10003;</span>
        Corrected
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
          reportStatus === "reported"
            ? "text-orange-500"
            : "text-muted-foreground hover:text-foreground"
        } ${className}`}
        title="Report an issue"
      >
        <Flag
          className={`h-3.5 w-3.5 ${
            reportStatus === "reported" ? "fill-orange-500" : ""
          }`}
        />
        {reportStatus === "reported" ? "Reported" : null}
      </button>

      {showToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
          &#10003; Report submitted! Our team will review it.
        </div>
      )}

      {isOpen && (
        <ReportModal
          questionId={questionId}
          questionText={questionText}
          subjectName={subjectName}
          year={year}
          questionNumber={questionNumber}
          onClose={() => setIsOpen(false)}
          onSuccess={handleReportSubmit}
        />
      )}
    </>
  );
}

interface ReportTypeOption {
  value: string;
  label: string;
  description: string;
  icon: typeof Flag;
}

const REPORT_TYPES: ReportTypeOption[] = [
  {
    value: "wrong_answer",
    label: "Wrong Answer",
    description: "The correct answer marked is wrong",
    icon: AlertTriangle,
  },
  {
    value: "unclear_question",
    label: "Unclear Question",
    description: "Question is ambiguous or confusing",
    icon: HelpCircle,
  },
  {
    value: "typo_error",
    label: "Typo/Spelling Error",
    description: "There's a spelling mistake",
    icon: Type,
  },
  {
    value: "wrong_options",
    label: "Wrong Options",
    description: "One or more options are incorrect",
    icon: List,
  },
  {
    value: "outdated_content",
    label: "Outdated Content",
    description: "This info is no longer accurate",
    icon: CalendarClock,
  },
  {
    value: "other",
    label: "Other",
    description: "Something else is wrong",
    icon: MessageSquare,
  },
];

interface ReportModalProps {
  questionId: string;
  questionText?: string;
  subjectName?: string;
  year?: number;
  questionNumber?: number;
  onClose: () => void;
  onSuccess: () => void;
}

function ReportModal({
  questionId,
  questionText,
  subjectName,
  year,
  questionNumber,
  onClose,
  onSuccess,
}: ReportModalProps) {
  const [reportType, setReportType] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [suggestedCorrectOption, setSuggestedCorrectOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const truncatedQuestion = questionText
    ? questionText.length > 80
      ? questionText.slice(0, 80) + "..."
      : questionText
    : null;

  const handleSubmit = async () => {
    if (!reportType) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          reportType,
          description: description || null,
          suggestedCorrectOption,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 409) {
          alert(err.error);
        } else {
          alert(err.error || "Failed to submit report");
        }
        return;
      }

      onSuccess();
      onClose();
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-24">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-background rounded-xl shadow-2xl border w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-6 py-4 rounded-t-xl">
          <h2 className="text-lg font-semibold">Report an Issue</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Help us improve question quality
          </p>
        </div>

        <div className="px-6 py-4 space-y-5">
          {truncatedQuestion && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">
                {subjectName && `Q.${questionNumber || "?"} — ${subjectName}`}
                {year && ` · ${year}`}
              </p>
              <p className="text-sm leading-relaxed">{truncatedQuestion}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">What kind of issue?</label>
            <div className="space-y-1.5">
              {REPORT_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = reportType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setReportType(type.value)}
                    className={`w-full flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-accent/50"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      <Icon
                        className={`h-4 w-4 ${
                          isSelected ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </span>
                    <div className="min-w-0">
                      <span
                        className={`font-medium ${
                          isSelected ? "text-foreground" : ""
                        }`}
                      >
                        {type.label}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {type.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {reportType === "wrong_answer" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                What do you think the correct answer is?
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() =>
                      setSuggestedCorrectOption(
                        suggestedCorrectOption === num ? null : num
                      )
                    }
                    className={`flex items-center justify-center h-10 w-10 rounded-lg border text-sm font-medium transition-all ${
                      suggestedCorrectOption === num
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-accent/50 text-muted-foreground"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setDescription(e.target.value);
                }
              }}
              placeholder="Describe the issue (optional)..."
              className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-background border-t px-6 py-4 rounded-b-xl flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reportType || submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </div>
    </div>
  );
}
