import { MathText } from "@/components/MathText";

/** Headed solution blocks stay plain text in the database, with LaTeX for formulas. */
export function QuestionExplanation({ text }: { text: string }) {
  const sections = text.trim().split(/\n(?=### )/);
  return (
    <div className="space-y-3 text-sm">
      {sections.map((section, index) => {
        const heading = section.match(/^### ([^\n]+)\n/);
        const title = heading?.[1];
        const body = heading ? section.slice(heading[0].length).trim() : section.trim();
        const answer = title?.toLowerCase() === "answer";
        return (
          <section key={index} className={answer ? "rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30" : "rounded-lg border bg-muted/20 p-3"}>
            {title && <h4 className={`mb-2 font-semibold ${answer ? "text-green-800 dark:text-green-300" : "text-foreground"}`}>{title}</h4>}
            <MathText text={body} as="div" className="overflow-x-auto leading-relaxed text-foreground [&_.katex-display]:my-3 [&_.katex-display]:text-left" />
          </section>
        );
      })}
    </div>
  );
}
