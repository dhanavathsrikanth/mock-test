const TYPE_LABELS: Record<string, string> = {
  MCQ: "Multiple Choice Question",
  MSQ: "Multiple Select Question",
  NAT: "Numerical Answer Type",
};

export function QuestionTypeTag({ type = "MCQ" }: { type?: string | null }) {
  const label = type || "MCQ";
  return (
    <span
      title={TYPE_LABELS[label] || label}
      aria-label={`Question type: ${label}`}
      className="inline-flex items-center rounded-md border border-green-200 bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800 dark:border-green-700 dark:bg-green-200 dark:text-green-950"
    >
      {label}
    </span>
  );
}
