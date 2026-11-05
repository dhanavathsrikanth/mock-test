"use client";

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createSprint } from '@/app/(dashboard)/practice/actions';
import { sprintAvailability, sprintPool, type SprintCatalog } from '@/lib/micro-practice';

const selectStyle = 'mt-1 h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-sm';

export function SprintLauncher({ catalog, compact = false }: { catalog: SprintCatalog; compact?: boolean }) {
  const router = useRouter();
  const years = [...new Set(catalog.pool.flatMap(q => q.year == null ? [] : [q.year]))].sort((a,b) => a-b);
  const defaultFrom = years.find(y => y >= 2021 && y <= 2026) ?? years[0] ?? 2021;
  const defaultTo = [...years].reverse().find(y => y >= 2021 && y <= 2026) ?? years.at(-1) ?? 2026;
  const recommended = catalog.subjects.find(subject => sprintAvailability(sprintPool(catalog.pool, {
    subjectId: subject.id, topicId: null, yearFrom: defaultFrom, yearTo: defaultTo,
  }, catalog.topics), catalog.mixed).ready)?.id ?? '';
  const [subjectId, setSubject] = useState(recommended);
  const [topicId, setTopic] = useState('');
  const [yearFrom, setFrom] = useState(defaultFrom);
  const [yearTo, setTo] = useState(defaultTo);
  const [minutes, setMinutes] = useState<12 | 15>(15);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const requestId = useRef<string | null>(null);
  const selection = { examId: catalog.examId, streamId: catalog.streamId, subjectId: subjectId || null,
    topicId: topicId || null, yearFrom, yearTo, minutes };
  const { ready, counts } = sprintAvailability(sprintPool(catalog.pool, selection, catalog.topics), catalog.mixed);
  const topics = catalog.topics.filter(t => t.subject_id === subjectId && sprintPool(catalog.pool, { ...selection, topicId: t.id }, catalog.topics).length > 0);
  function changed() { requestId.current = null; setError(''); }
  async function start() {
    if (busy.current || !ready) return;
    busy.current = true; setPending(true); setError('');
    try {
      requestId.current ??= crypto.randomUUID();
      const result = await createSprint(selection, requestId.current);
      if ('error' in result) { setError(result.error); return; }
      router.push(`/test/${result.sessionId}`);
    } catch { setError('Unable to start. Your selection is kept; please retry.'); }
    finally { busy.current = false; setPending(false); }
  }
  const fields = <fieldset disabled={pending} className="grid min-w-0 gap-3">
    <label className="min-w-0 text-xs font-medium">Subject<select className={selectStyle} value={subjectId} onChange={e => { setSubject(e.target.value); setTopic(''); changed(); }}><option value="">All subjects in your stream</option>{catalog.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label className="min-w-0 text-xs font-medium">Topic<select className={selectStyle} value={topicId} disabled={!subjectId} onChange={e => { setTopic(e.target.value); changed(); }}><option value="">All topics in this subject</option>{topics.map(t => <option key={t.id} value={t.id}>{t.parent_id ? `${catalog.topics.find(p => p.id === t.parent_id)?.name ?? ''} → ` : ''}{t.name}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-xs font-medium">From year<select className={selectStyle} value={yearFrom} onChange={e => { setFrom(Number(e.target.value)); changed(); }}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label>
      <label className="text-xs font-medium">To year<select className={selectStyle} value={yearTo} onChange={e => { setTo(Number(e.target.value)); changed(); }}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label>
    </div>
    <label className="text-xs font-medium">Focus timer<select className={selectStyle} value={minutes} onChange={e => { setMinutes(Number(e.target.value) as 12 | 15); changed(); }}><option value={15}>15 minutes</option><option value={12}>12 minutes</option></select></label>
  </fieldset>;
  return <section id="quick-practice" aria-label="Quick practice" className="min-w-0 space-y-4 rounded-xl border border-primary/30 bg-card p-4 sm:p-5">
    <div className="flex items-start justify-between gap-2"><div><p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary"><Zap className="h-4 w-4" />Quick practice</p><h2 className="text-xl font-semibold tracking-tight">Five questions. One small win.</h2></div><span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium">{minutes} min</span></div>
    <p className="text-sm text-muted-foreground">{catalog.mixed ? '3 MCQs · 1 MSQ · 1 NAT' : '5 MCQs'} · {yearFrom}–{yearTo}</p>
    {catalog.resumeId && <Button asChild className="min-h-12 w-full"><Link href={`/test/${catalog.resumeId}`}>Resume unfinished sprint<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}
    {compact ? <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">{catalog.resumeId ? 'Choose a new sprint' : catalog.subjects.find(s => s.id === subjectId)?.name ?? 'All subjects'}<span className="ml-2 text-xs font-normal text-muted-foreground">Edit filters</span></summary><div className="mt-4">{fields}</div></details> : fields}
    {!ready && <p role="status" className="text-xs text-muted-foreground">{yearFrom > yearTo ? 'The start year must come before the end year.' : `Available: ${counts.MCQ} MCQs${catalog.mixed ? `, ${counts.MSQ} MSQs, ${counts.NAT} NATs` : ''}. Broaden the topic or years to build a complete sprint.`}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button onClick={start} disabled={!ready || yearFrom > yearTo || pending} aria-busy={pending} className="min-h-12 w-full" variant={catalog.resumeId ? 'outline' : 'default'}>{pending ? 'Preparing your sprint…' : catalog.resumeId ? 'Start a new 5-Q sprint' : 'Start 5-Q Sprint'}<ArrowRight className="ml-2 h-4 w-4" /></Button>
    <p className="text-xs text-muted-foreground">Answers save on every tap. Pause now; pick up where you left off.</p>
    <details className="text-xs text-muted-foreground"><summary className="cursor-pointer py-1">Have more time?</summary><Link href="/test/select" className="inline-flex min-h-11 items-center underline underline-offset-4">Full mocks &amp; custom practice</Link></details>
  </section>;
}
