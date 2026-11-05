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
  const earlySuggestion = variant === 'dashboard' && !d.weakSpots.length;
  const concepts = variant === 'dashboard'
    ? d.weakSpots.length ? d.weakSpots : d.concepts.filter(c => c.failed > 0).slice(0, 1)
    : d.concepts.slice(0, 3);
  return <section aria-label={heading} className="overflow-hidden rounded-xl border bg-card">
    <div className="flex items-center gap-2 border-b px-4 py-3"><Target aria-hidden="true" className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">{heading}</h2></div>
    <div className="space-y-4 p-4 sm:p-5">
      {concepts.length ? <>
        <p className="text-xs text-muted-foreground">{variant === 'dashboard'
          ? earlySuggestion ? 'Start with this recent mistake. This is an early practice suggestion; a repeated weak spot needs at least 3 attempts and 60% incorrect answers.'
            : `Across your last ${d.sessionCount} completed ${d.sessionCount === 1 ? 'session' : 'sessions'}. Repeated weak spots need at least 3 attempts and 60% incorrect answers.`
          : 'Automatically linked to the syllabus concepts in your answered questions. A missed question can involve several concepts.'}</p>
        <ul className="space-y-4">{concepts.map(c => <li key={JSON.stringify([c.subjectId,c.key])} className="border-l-2 border-primary pl-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h3 className="break-words font-semibold">{c.label}</h3><span className="text-sm font-medium tabular-nums">{c.accuracy}% accuracy</span></div>
          <p className="mt-1 text-xs text-muted-foreground">{c.failed} incorrect · {c.attempts - c.failed} correct · {c.attempts} attempts</p>
          {c.failed > 0 && <Link href={fixLink(c)} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline">Practise this concept <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>}
        </li>)}</ul>
      </> : <div className="space-y-2 text-sm">
        <p className="font-medium">{d.tagged ? 'No repeated weak concept identified yet.' : 'Build your concept picture with practice.'}</p>
        <p className="text-muted-foreground">{d.tagged
          ? 'Keep practising. We need at least 3 attempts with 60% incorrect answers to suggest a focused fix.'
          : 'Complete a practice session to see concept feedback from its syllabus links. Questions without a usable mapping still count towards your score.'}</p>
        <Link href="/test/select" className="inline-flex min-h-11 items-center text-primary hover:underline">Open practice</Link>
      </div>}
      {!!d.answerPatterns?.length && <div className="space-y-3 border-t pt-3">
        <h3 className="text-sm font-semibold">Answer patterns to check</h3>
        <p className="text-xs text-muted-foreground">These are observable differences in your answers, not assumptions about why you made a mistake.</p>
        <ul className="space-y-3">{d.answerPatterns.map(p => <li key={p.code}><p className="text-sm font-medium">{p.label} <span className="font-normal text-muted-foreground">· {p.count} {p.count === 1 ? 'answer' : 'answers'}</span></p><p className="mt-1 text-xs text-muted-foreground">{p.advice}</p></li>)}</ul>
      </div>}
      {!!d.improvements?.length && <div className="space-y-3 border-t pt-3">
        <h3 className="text-sm font-semibold">Your recent progress</h3>
        <p className="text-xs text-muted-foreground">Latest 3 completed sessions compared with the previous 3. Each concept needs at least 3 attempts in both windows.</p>
        <ul className="space-y-2">{d.improvements.map(p => <li key={p.label} className="text-sm"><span className="font-medium">{p.label}</span><span className="ml-2 font-semibold tabular-nums text-green-700 dark:text-green-400">{p.before}% → {p.after}%</span><p className="mt-1 text-xs text-muted-foreground">{p.beforeAttempts} earlier attempts · {p.afterAttempts} recent attempts</p></li>)}</ul>
      </div>}
      {variant === 'result' && d.possibleTraps.length > 0 && <details className="border-t pt-3 text-sm">
        <summary className="cursor-pointer font-medium">Traps to check in your answer review</summary>
        <p className="mt-2 text-xs text-muted-foreground">These are editor-labelled pitfalls on missed questions, not confirmed reasons for your answers.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">{d.possibleTraps.map(t => <li key={t.label}>{t.label} <span className="text-muted-foreground">· {t.questions} missed {t.questions === 1 ? 'question' : 'questions'}</span></li>)}</ul>
      </details>}
      <div className="space-y-1 border-t pt-3 text-xs text-muted-foreground"><p>Concept mappings cover {d.tagged} of {d.answered} answered questions in this {variant === 'result' ? 'session' : 'window'}. Skipped and marks-to-all questions are excluded. Concept counts overlap.</p>
        {(d.automaticTagged ?? 0) > 0 && <p>{d.automaticTagged} auto-mapped from the syllabus{d.reviewedTagged ? ` · ${d.reviewedTagged} with editor-reviewed tags` : ''}.</p>}
      </div>
    </div>
  </section>;
}
