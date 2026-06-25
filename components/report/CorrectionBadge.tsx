"use client";

import { useState } from "react";
import { format } from "date-fns";

interface CorrectionBadgeProps {
  fieldChanged: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
}

export function CorrectionBadge({
  fieldChanged,
  oldValue,
  newValue,
  createdAt,
}: CorrectionBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  const formattedDate = (() => {
    try {
      return format(new Date(createdAt), "MMM d, yyyy");
    } catch {
      return createdAt;
    }
  })();

  const fieldLabel = fieldChanged
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 p-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span className="text-green-600 dark:text-green-400 text-sm leading-relaxed">
          &#10003; This question was corrected on {formattedDate}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-900 space-y-1.5">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Changed:</span>{" "}
            {fieldLabel}
          </p>
          <div className="text-xs space-y-1">
            <p>
              <span className="text-red-600 dark:text-red-400 font-medium">
                Old:
              </span>{" "}
              <span className="text-muted-foreground line-through">
                {oldValue}
              </span>
            </p>
            <p>
              <span className="text-green-600 dark:text-green-400 font-medium">
                New:
              </span>{" "}
              <span className="text-foreground">{newValue}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
