"use client";

interface StatusBadgeProps {
  status: "pending" | "under_review" | "resolved" | "rejected";
  className?: string;
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    dot: "bg-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900",
  },
  under_review: {
    label: "Under Review",
    dot: "bg-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900",
  },
  resolved: {
    label: "Resolved",
    dot: "bg-green-500",
    bg: "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900",
  },
  rejected: {
    label: "Rejected",
    dot: "bg-red-500",
    bg: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900",
  },
};

export function ReportStatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
