import Link from 'next/link';
import { ArrowRight, Target } from 'lucide-react';
import type { DiagnosticLoad } from '@/lib/smart-tags-server';
import type { ConceptCounter } from '@/lib/smart-tags';

const fixLink = (c: ConceptCounter) => `/practice/concept?${new URLSearchParams({ subject: c.subjectId, concept: c.key })}`;

export function SmartTagPanel({ result, variant = 'dashboard' }: { result: DiagnosticLoad; variant?: 'dashboard' | 'result' }) {
  const heading = variant === 'result' ? 'Your concept breakdown' : 'Your next concept to practise';
  if (result.state !== 'ready') return <section aria-label={heading} className="rounded-xl border bg-card p-4 text-sm">
    <h2 className="font-semibold">{heading}</h2><p className="mt-2 text-muted-foreground">{result.state === 'not_enabled'
      ? 'Concept diagnostics are being prepared. Your score and answer review are still available.'
      : 'Concept diagnostics could not load. Refresh this page to retry; your results are saved.'}</p>
  </section>;
  const d = result.diagnostic;
  const concepts = variant === 'dashboard' ? d.weakSpots : d.concepts.slice(0, 3);
  return <section aria-label={heading} className="overflow-hidden rounded-xl border bg-card">
    <div className="flex items-center gap-2 border-b px-4 py-3"><Target aria-hidden="true" className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">{heading}</h2></div>
    <div className="space-y-4 p-4 sm:p-5">
      {concepts.length ? <>
        <p className="text-xs text-muted-foreground">{variant === 'dashboard'
          ? `Across your last ${d.sessionCount} completed ${d.sessionCount === 1 ? 'session' : 'sessions'}. Suggestions need at least 3 attempts and 60% incorrect answers.`
          : 'Based on the reviewed concept tags on questions you answered. A missed question can involve several concepts.'}</p>
        <ul className="space-y-4">{concepts.map(c => <li key={JSON.stringify([c.subjectId,c.key])} className="border-l-2 border-primary pl-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h3 className="break-words font-semibold">{c.label}</h3><span className="text-sm font-medium tabular-nums">{c.accuracy}% accuracy</span></div>
          <p className="mt-1 text-xs text-muted-foreground">{c.failed} incorrect · {c.attempts - c.failed} correct · {c.attempts} attempts</p>
          {c.failed > 0 && <Link href={fixLink(c)} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline">Practise this concept <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>}
        </li>)}</ul>
      </> : <div className="space-y-2 text-sm">
        <p className="font-medium">{d.tagged ? 'No repeated weak concept identified yet.' : 'Build your concept picture with practice.'}</p>
        <p className="text-muted-foreground">{d.tagged
          ? 'Keep practising. We need at least 3 attempts with 60% incorrect answers to suggest a focused fix.'
          : 'Diagnostics appear as you answer questions with reviewed concept tags. Untagged questions still count towards your score.'}</p>
        <Link href="/practice" className="inline-flex min-h-11 items-center text-primary hover:underline">Open Quick Practice</Link>
      </div>}
      {variant === 'result' && d.possibleTraps.length > 0 && <details className="border-t pt-3 text-sm">
        <summary className="cursor-pointer font-medium">Traps to check in your answer review</summary>
        <p className="mt-2 text-xs text-muted-foreground">These are editor-labelled pitfalls on missed questions, not confirmed reasons for your answers.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">{d.possibleTraps.map(t => <li key={t.label}>{t.label} <span className="text-muted-foreground">· {t.questions} missed {t.questions === 1 ? 'question' : 'questions'}</span></li>)}</ul>
      </details>}
      <p className="border-t pt-3 text-xs text-muted-foreground">Reviewed tags cover {d.tagged} of {d.answered} answered questions in this {variant === 'result' ? 'session' : 'window'}. Skipped and marks-to-all questions are excluded. Concept counts overlap.</p>
    </div>
  </section>;
}
