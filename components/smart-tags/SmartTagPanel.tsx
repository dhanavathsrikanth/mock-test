import Link from 'next/link';
import { ArrowRight, Target, Sparkles, AlertTriangle, AlertCircle, TrendingUp, Check } from 'lucide-react';
import type { DiagnosticLoad } from '@/lib/smart-tags-server';
import type { ConceptCounter, SmartDiagnostic } from '@/lib/smart-tags';

const fixLink = (c: ConceptCounter) => `/practice/concept?${new URLSearchParams({ subject: c.subjectId, concept: c.key })}`;

export function SmartTagPanel({ result, variant = 'dashboard' }: { result: DiagnosticLoad; variant?: 'dashboard' | 'result' }) {
  if (variant === 'dashboard' && result.state === 'ready') return <DashboardInsights diagnostic={result.diagnostic} />;
  return <DetailedSmartTagPanel result={result} variant={variant} />;
}

function DetailedSmartTagPanel({ result, variant }: { result: DiagnosticLoad; variant: 'dashboard' | 'result' }) {
  const heading = variant === 'result' ? 'Your concept breakdown' : 'Your next concept to practise';
  if (result.state !== 'ready') return (
    <section aria-label={heading} className="rounded-xl border bg-card p-5 text-sm shadow-sm">
      <div className="flex items-center gap-2 font-semibold">
        <Target className="h-4 w-4 text-primary" />
        <h2>{heading}</h2>
      </div>
      <p className="mt-2 text-muted-foreground">
        {result.state === 'not_enabled'
          ? 'Concept diagnostics are being prepared. Your score and answer review are still available.'
          : 'Concept diagnostics could not load. Refresh this page to retry; your results are saved.'}
      </p>
    </section>
  );

  const d = result.diagnostic;
  const earlySuggestion = variant === 'dashboard' && !d.weakSpots.length;
  const concepts = variant === 'dashboard'
    ? (d.weakSpots.length ? d.weakSpots : d.concepts.filter(c => c.failed > 0).slice(0, 1))
    : d.concepts.slice(0, 6);

  const coveragePercent = d.answered > 0 ? Math.round((d.tagged / d.answered) * 100) : 0;

  return (
    <section aria-label={heading} className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Header with Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">{heading}</h2>
            <p className="text-xs text-muted-foreground">
              {variant === 'result'
                ? 'Automatically linked to the syllabus concepts in your answered questions. A missed question can involve several concepts.'
                : earlySuggestion
                ? 'Start with this recent mistake. This is an early practice suggestion; a repeated weak spot needs at least 3 attempts and 60% incorrect answers.'
                : `Across your last ${d.sessionCount} completed ${d.sessionCount === 1 ? 'session' : 'sessions'}. Repeated weak spots need at least 3 attempts and 60% incorrect answers.`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {d.tagged > 0 && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {coveragePercent}% Syllabus Mapped
            </span>
          )}
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        {/* Concept Cards */}
        {concepts.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {concepts.map((c) => {
              const isStrong = c.failed === 0;
              const isModerate = c.accuracy >= 50 && c.failed > 0;
              return (
                <div
                  key={JSON.stringify([c.subjectId, c.key])}
                  className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                    isStrong
                      ? 'border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10'
                      : isModerate
                      ? 'border-amber-200 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="break-words font-semibold text-sm leading-snug sm:text-base">
                        {c.label}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                          isStrong
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isModerate
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {c.accuracy}% accuracy
                      </span>
                    </div>

                    <div className="my-2.5 space-y-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isStrong ? 'bg-emerald-500' : isModerate ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${c.accuracy}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {c.failed} incorrect · {c.attempts - c.failed} correct · {c.attempts} attempts
                    </p>
                  </div>

                  <div className="mt-3 pt-2">
                    {c.failed > 0 ? (
                      <Link
                        href={fixLink(c)}
                        className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Target className="h-3.5 w-3.5" />
                        Practise this concept
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <div className="inline-flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                        Solid Performance in Test
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <Target className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
            <p className="font-semibold text-sm">
              {d.tagged ? 'No repeated weak concept identified yet.' : 'Build your concept picture with practice.'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {d.tagged
                ? 'Keep practising. We need at least 3 attempts with 60% incorrect answers to suggest a focused fix.'
                : 'Complete a practice session to see concept feedback from its syllabus links. Questions without a usable mapping still count towards your score.'}
            </p>
            <Link
              href="/test/select"
              className="mt-4 inline-flex items-center justify-center rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"
            >
              Open practice
            </Link>
          </div>
        )}

        {/* Observable Answer Checks */}
        {!!d.answerPatterns?.length && (
          <div className="space-y-3 rounded-xl border border-amber-200/60 bg-amber-50/20 p-4 dark:border-amber-900/40 dark:bg-amber-950/15">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-semibold text-foreground">Answer patterns to check</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              These are observable differences in your answers, not assumptions about why you made a mistake.
            </p>
            <div className="space-y-2.5">
              {d.answerPatterns.map((p) => (
                <div key={p.code} className="rounded-lg border bg-background/80 p-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="font-semibold text-xs text-foreground">{p.label}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {p.count} {p.count === 1 ? 'answer' : 'answers'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.advice}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvements */}
        {!!d.improvements?.length && (
          <div className="space-y-3 rounded-xl border border-emerald-200/60 bg-emerald-50/20 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/15">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-semibold text-foreground">Your recent progress</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Latest 3 completed sessions compared with the previous 3. Each concept needs at least 3 attempts in both windows.
            </p>
            <ul className="space-y-2">
              {d.improvements.map((p) => (
                <li key={p.label} className="rounded-lg border bg-background/80 p-3 text-sm shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">{p.label}</span>
                    <span className="font-bold text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
                      {p.before}% → {p.after}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.beforeAttempts} earlier attempts · {p.afterAttempts} recent attempts
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Traps Details */}
        {variant === 'result' && d.possibleTraps.length > 0 && (
          <details className="group rounded-xl border bg-muted/20 p-3.5 text-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-medium">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Traps to check in your answer review
              </span>
              <span className="text-xs text-muted-foreground group-open:hidden">+ View pitfalls</span>
              <span className="hidden text-xs text-muted-foreground group-open:inline">− Hide</span>
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              These are editor-labelled pitfalls on missed questions, not confirmed reasons for your answers.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
              {d.possibleTraps.map((t) => (
                <li key={t.label}>
                  <strong className="font-semibold">{t.label}</strong> · {t.questions} missed{' '}
                  {t.questions === 1 ? 'question' : 'questions'}
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Coverage footer */}
        <div className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            Concept mappings cover {d.tagged} of {d.answered} answered questions in this{' '}
            {variant === 'result' ? 'session' : 'window'}. Skipped and marks-to-all questions are excluded. Concept counts overlap.
          </p>
          {(d.automaticTagged ?? 0) > 0 && (
            <p className="mt-0.5">
              {d.automaticTagged} auto-mapped from the syllabus
              {d.reviewedTagged ? ` · ${d.reviewedTagged} with editor-reviewed tags` : ''}.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function DashboardInsights({ diagnostic: d }: { diagnostic: SmartDiagnostic }) {
  const early = !d.weakSpots.length;
  const concepts = d.weakSpots.length ? d.weakSpots : d.concepts.filter(c => c.failed > 0).slice(0, 1);
  const coverage = d.answered ? Math.round(d.tagged / d.answered * 100) : 0;
  return <section aria-label="Your next concept to practise" className="overflow-hidden rounded-xl border bg-card">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:px-5">
      <div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300"><Target size={18} /></span><div><h2 className="text-base font-semibold">What to practise next</h2><p className="mt-1 text-xs text-muted-foreground">Based on your latest {d.sessionCount} completed {d.sessionCount === 1 ? 'session' : 'sessions'}</p></div></div>
    </header>
    <div className="space-y-4 p-4 sm:p-5">
      {concepts.length ? <ul className="space-y-4">{concepts.map(c => <li key={JSON.stringify([c.subjectId,c.key])} className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/50 dark:bg-blue-950/15">
        <span className="mb-2 inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">{early ? 'Review a recent mistake' : 'Repeated difficulty'}</span>
        <h3 className="break-words text-base font-semibold leading-snug">{c.label}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">You got <strong className="font-medium text-foreground">{c.failed} of {c.attempts} {c.attempts === 1 ? 'answer' : 'answers'} wrong</strong> for this concept.</p>
        <dl className="my-4 grid grid-cols-3 gap-2" aria-label="Your answers for this concept">
          <div className="rounded-lg border bg-background/80 p-2.5"><dt className="text-xs text-muted-foreground">Answered</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{c.attempts}</dd></div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2.5 dark:border-emerald-900 dark:bg-emerald-950/30"><dt className="text-xs text-emerald-700 dark:text-emerald-300">Correct</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{c.attempts-c.failed}</dd></div>
          <div className="rounded-lg border border-rose-100 bg-rose-50 p-2.5 dark:border-rose-900 dark:bg-rose-950/30"><dt className="text-xs text-rose-700 dark:text-rose-300">Incorrect</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-rose-700 dark:text-rose-300">{c.failed}</dd></div>
        </dl>
        <div className="mb-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">Correct answers / answered questions</span><strong className="ml-3 shrink-0 tabular-nums">{c.accuracy}%</strong></div>
        <div className="h-2 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-950" role="progressbar" aria-label={`${c.label} correct rate`} aria-valuenow={c.accuracy} aria-valuemin={0} aria-valuemax={100}><div data-concept-meter className="h-full rounded-full bg-blue-500" style={{ width: `${c.accuracy}%` }} /></div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{early ? `Based on just ${c.attempts} ${c.attempts === 1 ? 'answer' : 'answers'}. More practice will give a clearer picture.` : 'This pattern has repeated across at least 3 answers. A focused review is a useful next step.'}</p>
        {c.failed > 0 && <Link href={fixLink(c)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Practise this concept<ArrowRight size={16} /></Link>}
      </li>)}</ul> : <div className="rounded-xl border border-dashed p-5 text-center"><Target className="mx-auto mb-3 text-blue-500" size={26} /><p className="text-sm font-medium">{d.tagged ? 'No repeated weak spots yet' : 'Discover your concept strengths'}</p><Link href="/test/select" className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-300">{d.tagged ? 'Keep practising' : 'Take your first test'}<ArrowRight size={14} /></Link></div>}
      {!!d.answerPatterns?.length && <div className="space-y-2"><h3 className="text-sm font-semibold">Answer checks</h3><p className="text-xs text-muted-foreground">Open a check for a practical tip before your next attempt.</p>{d.answerPatterns.map(p => <details key={p.code} className="group rounded-xl bg-muted/40 px-3"><summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 py-2 text-xs"><span className="font-medium">{p.label}</span><span className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-background px-2 py-1 tabular-nums">{p.count} {p.count === 1 ? 'answer' : 'answers'}</span><span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span></span></summary><p className="pb-3 text-sm leading-relaxed text-muted-foreground">{p.advice}</p></details>)}</div>}
      {!!d.improvements?.length && <div className="space-y-2"><h3 className="text-sm font-semibold">Your recent improvement</h3>{d.improvements.map(p => <div key={p.label} className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30"><p className="text-sm font-medium">{p.label}</p><p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">{p.before}% → {p.after}% correct · +{p.after-p.before} percentage points</p><p className="mt-1 text-xs text-muted-foreground">{p.beforeAttempts} earlier answers · {p.afterAttempts} recent answers</p></div>)}</div>}
      <details className="group border-t pt-2 text-xs text-muted-foreground"><summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2"><span>How this recommendation is made</span><span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span></summary><div className="space-y-2 pb-1 leading-relaxed"><p>Concept mappings cover {d.tagged} of {d.answered} answered questions ({coverage}%) in the latest {d.sessionCount} completed sessions. Skipped and marks-to-all questions are excluded; concept counts overlap.</p><p>{early ? 'This is an early practice suggestion based on a recent mistake.' : 'Repeated difficulty means at least 3 answers with 60% or more incorrect.'} More than one concept can be linked to an answer.</p><p>Answer checks describe differences in your selections, not the reason for a mistake.</p>{(d.automaticTagged ?? 0)>0 && <p>{d.automaticTagged} auto-mapped from the syllabus{d.reviewedTagged ? ` · ${d.reviewedTagged} with editor-reviewed tags` : ''}.</p>}{!!d.improvements?.length && <p>Improvements compare the latest 3 completed sessions with the previous 3; each concept needs at least 3 answers in both windows.</p>}</div></details>
    </div>
  </section>;
}
