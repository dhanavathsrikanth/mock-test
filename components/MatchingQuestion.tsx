"use client";

import { useMemo } from "react";
import { MathText } from "./MathText";

interface MatchingQuestionProps {
  questionText: string;
  className?: string;
}

interface ParsedList {
  label: string;
  items: { code: string; text: string }[];
}

function parseMatchingQuestion(text: string): {
  intro: string;
  list1: ParsedList | null;
  list2: ParsedList | null;
} {
  const result = { intro: text, list1: null as ParsedList | null, list2: null as ParsedList | null };

  // Try to find List 1 / List 2 pattern
  const listPattern = /(?:Match\s+(?:the\s+)?(?:items?\s+)?(?:under\s+)?)?List\s+1\s*\(([^)]+)\)\s*(?:with\s+(?:those\s+)?(?:under\s+)?)?List\s+2\s*\(([^)]+)\)/i;
  const listMatch = text.match(listPattern);

  if (listMatch) {
    const list1Label = listMatch[1].trim();
    const list2Label = listMatch[2].trim();

    // Extract intro (everything before List 1 reference)
    const introEnd = text.indexOf("List 1");
    result.intro = text.slice(0, introEnd).trim();

    // Extract the part after the List headers
    const afterLists = text.slice(listMatch.index! + listMatch[0].length);

    // Parse items: look for patterns like "P. text" or "P) text" or "A. text"
    const itemRegex = /([A-P])[\.\)]\s*(.+?)(?=[A-P][\.\)]|$)/gi;
    const items: { code: string; text: string }[] = [];
    let match;
    while ((match = itemRegex.exec(afterLists)) !== null) {
      items.push({ code: match[1].toUpperCase(), text: match[2].trim() });
    }

    if (items.length > 0) {
      result.list1 = { label: list1Label, items };
    }

    // For List 2, try to extract from the option codes or explanation
    // List 2 items are typically numbered 1-4 (or 1-5)
    // We can infer them from context or leave as a placeholder
    result.list2 = { label: list2Label, items: [] };
  } else {
    // Try simpler pattern: "Match A. ... B. ... C. ... D. ..."
    const simpleMatch = text.match(/Match(?:\s+the)?(?:\s+following)?[\s:]+(.+)/i);
    if (simpleMatch) {
      const afterMatch = simpleMatch[1];
      result.intro = "Match the following:";

      const itemRegex = /([A-P])[\.\)]\s*(.+?)(?=[A-P][\.\)]|$)/gi;
      const items: { code: string; text: string }[] = [];
      let match;
      while ((match = itemRegex.exec(afterMatch)) !== null) {
        items.push({ code: match[1].toUpperCase(), text: match[2].trim() });
      }

      if (items.length > 0) {
        result.list1 = { label: "Items to match", items };
      }
    }
  }

  return result;
}

function parseOptionCodes(optionText: string): { code: string; match: string }[] {
  if (!optionText) return [];
  // Parse patterns like "P-3, Q-4, R-2, S-1" or "A-2, B-1, C-4, D-3"
  const regex = /([A-P])\s*[-–]\s*(\d+)/g;
  const matches: { code: string; match: string }[] = [];
  let m;
  while ((m = regex.exec(optionText)) !== null) {
    matches.push({ code: m[1].toUpperCase(), match: m[2] });
  }
  return matches;
}

export function MatchingQuestion({ questionText, className }: MatchingQuestionProps) {
  const parsed = useMemo(() => parseMatchingQuestion(questionText), [questionText]);
  const hasList = parsed.list1 && parsed.list1.items.length > 0;

  if (!hasList) {
    // Fallback: just render as regular text with better formatting
    return (
      <div className={className}>
        <MathText text={questionText} className="text-base lg:text-lg leading-relaxed font-medium" as="div" />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Intro text */}
      {parsed.intro && (
        <MathText text={parsed.intro} className="text-base lg:text-lg leading-relaxed font-medium mb-4 block" as="p" />
      )}

      {/* Two-column table for List 1 and List 2 */}
      <div className="rounded-xl border-2 border-primary/20 overflow-hidden bg-primary/5">
        <div className="grid grid-cols-2 divide-x divide-primary/20">
          {/* List 1 */}
          <div>
            <div className="px-4 py-2.5 bg-primary/10 border-b border-primary/20">
              <span className="text-sm font-bold text-primary">
                List 1{parsed.list1!.label ? ` (${parsed.list1!.label})` : ""}
              </span>
            </div>
            <div className="divide-y divide-primary/10">
              {parsed.list1!.items.map((item) => (
                <div key={item.code} className="px-4 py-3 flex gap-3">
                  <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] px-1.5 rounded-md bg-primary/15 text-primary text-sm font-bold shrink-0">
                    {item.code}
                  </span>
                  <MathText text={item.text} className="text-sm leading-relaxed" as="span" />
                </div>
              ))}
            </div>
          </div>

          {/* List 2 */}
          <div>
            <div className="px-4 py-2.5 bg-primary/10 border-b border-primary/20">
              <span className="text-sm font-bold text-primary">
                List 2{parsed.list2?.label ? ` (${parsed.list2.label})` : ""}
              </span>
            </div>
            <div className="divide-y divide-primary/10">
              {parsed.list2 && parsed.list2.items.length > 0 ? (
                parsed.list2.items.map((item) => (
                  <div key={item.code} className="px-4 py-3 flex gap-3">
                    <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] px-1.5 rounded-md bg-secondary text-secondary-foreground text-sm font-bold shrink-0">
                      {item.code}
                    </span>
                    <MathText text={item.text} className="text-sm leading-relaxed" as="span" />
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-muted-foreground italic">
                  Match items from List 1 with the codes given in the options below
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function isMatchingQuestion(text: string): boolean {
  if (!text) return false;
  return (
    /List\s+1/i.test(text) ||
    /Match\s+(?:the\s+)?(?:following\s+)?(?:items?\s+)?(?:under\s+)?/i.test(text)
  );
}
