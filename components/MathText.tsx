"use client";

import { useMemo } from "react";
import { renderMathToHtml } from "@/lib/renderMath";

interface MathTextProps {
  text: string;
  className?: string;
  as?: "p" | "span" | "div" | "li";
}

export function MathText({ text, className, as: Tag = "span" }: MathTextProps) {
  const html = useMemo(() => renderMathToHtml(text), [text]);

  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
