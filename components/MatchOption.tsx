"use client";

import { parseMatchCode, isMatchCodeOption } from "@/lib/matching-question-utils";

interface MatchOptionProps {
  text: string;
  className?: string;
}

export function MatchOption({ text, className }: MatchOptionProps) {
  if (!isMatchCodeOption(text)) {
    return <span className={className}>{text}</span>;
  }

  const pairs = parseMatchCode(text);

  if (pairs.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`inline-flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {pairs.map((pair, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted border text-sm font-medium"
        >
          <span className="font-bold text-primary">{pair.from}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-bold text-primary">{pair.to}</span>
        </span>
      ))}
    </span>
  );
}
