import { MathText } from "@/components/MathText";
import { QuestionFigure, type QuestionImage } from "@/components/QuestionFigure";

export function QuestionPrompt({ text, image, compact = false }: { text: string; image?: QuestionImage; compact?: boolean }) {
  if (!compact) return <>
    <MathText text={text} className="question-content text-base lg:text-lg leading-relaxed font-medium" as="div" />
    {image && <QuestionFigure image={image} />}
  </>;

  const hintStart = text.lastIndexOf("\nHint:");
  const body = hintStart < 0 ? text : text.slice(0, hintStart);
  const hint = hintStart < 0 ? null : text.slice(hintStart + 1);
  const introEnd = body.indexOf("\n");
  const intro = introEnd < 0 ? body : body.slice(0, introEnd);
  const details = introEnd < 0 ? "" : body.slice(introEnd + 1);
  return <div className="space-y-3">
    <MathText text={intro} className="question-content text-base lg:text-lg leading-relaxed font-medium" as="div" />
    {image && <QuestionFigure image={image} />}
    {details && <MathText text={details} className="question-content text-base lg:text-lg leading-relaxed font-medium [&_.katex-display]:my-2 [&_.katex-display]:text-left [&_.katex-display+br]:hidden [&_br:has(+.katex-display)]:hidden" as="div" />}
    {hint && <MathText text={hint} className="text-sm leading-relaxed text-muted-foreground" as="div" />}
  </div>;
}
