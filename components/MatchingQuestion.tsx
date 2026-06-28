"use client";

import { MathText } from "@/components/MathText";
import {
  parseMatchingQuestion,
  type ParsedMatchingQuestion,
} from "@/lib/matching-question-utils";

interface MatchingQuestionProps {
  text: string;
  className?: string;
}

export function MatchingQuestion({ text, className }: MatchingQuestionProps) {
  const parsed = parseMatchingQuestion(text);

  if (!parsed) {
    return <MathText text={text} className={className} as="div" />;
  }

  const isNumberedFormat = parsed.list1.length > 0 && /^\d+$/.test(parsed.list1[0].key);

  return (
    <div className={className}>
      {parsed.preamble && (
        <MathText
          text={parsed.preamble}
          className="text-base lg:text-lg leading-relaxed font-medium mb-4"
          as="div"
        />
      )}

      <div className="rounded-xl border bg-muted/30 overflow-hidden">
        <div className="grid grid-cols-2 divide-x">
          <div className="p-3 sm:p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {parsed.list1Label}
            </h4>
            <div className="space-y-2.5">
              {parsed.list1.map((item) => (
                <div key={item.key} className="flex items-start gap-2">
                  <span className={`inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded-md text-xs font-bold shrink-0 ${
                    isNumberedFormat 
                      ? "bg-primary/10 text-primary" 
                      : "bg-primary/10 text-primary"
                  }`}>
                    {item.key}{isNumberedFormat ? "." : ""}
                  </span>
                  <MathText
                    text={item.value}
                    className="text-sm leading-relaxed"
                    as="span"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 sm:p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {parsed.list2Label}
            </h4>
            <div className="space-y-2.5">
              {parsed.list2.length > 0 ? (
                parsed.list2.map((item) => (
                  <div key={item.key} className="flex items-start gap-2">
                    <span className={`inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded-md text-xs font-bold shrink-0 ${
                      isNumberedFormat 
                        ? "bg-secondary text-secondary-foreground" 
                        : "bg-secondary text-secondary-foreground"
                    }`}>
                      {item.key}{isNumberedFormat ? "." : ""}
                    </span>
                    <MathText
                      text={item.value}
                      className="text-sm leading-relaxed"
                      as="span"
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Items as described in the question
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {parsed.list2.length === 0 && (
        <div className="mt-3 p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs text-muted-foreground">
            Match items from {parsed.list1Label} with the corresponding items in {parsed.list2Label}.
          </p>
        </div>
      )}
    </div>
  );
}
