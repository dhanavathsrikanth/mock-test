"use client";

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createSprint } from '@/app/(dashboard)/practice/actions';
import { sprintAvailability, sprintPool, type SprintCatalog } from '@/lib/micro-practice';
import { FilterDropdown } from './FilterDropdown';

export function SprintLauncher({ catalog, compact = false }: { catalog: SprintCatalog; compact?: boolean }) {
  const router = useRouter();
  const years = [...new Set(catalog.pool.flatMap(q => q.year == null ? [] : [q.year]))].sort((a,b) => a-b);
  const defaultFrom = years.find(y => y >= 2021 && y <= 2026) ?? years[0] ?? 2021;
  const defaultTo = [...years].reverse().find(y => y >= 2021 && y <= 2026) ?? years.at(-1) ?? 2026;
  const recommended = catalog.subjects.find(subject => sprintAvailability(sprintPool(catalog.pool, {
    subjectId: subject.id, topicId: null, yearFrom: defaultFrom, yearTo: defaultTo,
  }, catalog.topics), catalog.mixed).ready)?.id ?? '';
  const [subjectIds, setSubjects] = useState<string[]>(recommended ? [recommended] : []);
  const [topicIds, setTopics] = useState<string[]>([]);
  const [selectedYears, setYears] = useState<number[]>(years.filter(year => year >= defaultFrom && year <= defaultTo));
  const [minutes, setMinutes] = useState<12 | 15>(15);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const requestId = useRef<string | null>(null);
  const selection = { examId: catalog.examId, streamId: catalog.streamId, subjectId: null, topicId: null,
    subjectIds, topicIds, years: selectedYears, yearFrom: years[0] ?? 2021, yearTo: years.at(-1) ?? 2026, minutes };
  const matching = sprintPool(catalog.pool, selection, catalog.topics);
  const { ready, counts } = sprintAvailability(matching, catalog.mixed);
  const topics = catalog.topics.filter(t => (!subjectIds.length || subjectIds.includes(t.subject_id)) &&
    sprintPool(catalog.pool, { ...selection, topicIds: [t.id], years }, catalog.topics).length > 0);
  const yearSummary = selectedYears.length === 0 ? 'Choose years' : [...selectedYears].sort((a,b) => a-b).join(', ');
  const subjectSummary = subjectIds.length === 1 ? catalog.subjects.find(s => s.id === subjectIds[0])?.name : subjectIds.length ? `${subjectIds.length} subjects` : 'All subjects';
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
    <FilterDropdown label="Subjects" options={catalog.subjects.map(subject => ({ value: subject.id, label: subject.name }))} selected={subjectIds} emptyLabel="All subjects in your stream" disabled={pending} onChange={values => { setSubjects(values); setTopics(current => current.filter(id => catalog.topics.some(topic => topic.id === id && (!values.length || values.includes(topic.subject_id))))); changed(); }} />
    <FilterDropdown label="Topics" options={topics.map(topic => ({ value: topic.id, label: topic.name, description: [catalog.subjects.find(subject => subject.id === topic.subject_id)?.name, topic.parent_id ? catalog.topics.find(parent => parent.id === topic.parent_id)?.name : null].filter(Boolean).join(' · ') }))} selected={topicIds} emptyLabel="All topics in selected subjects" disabled={pending || !topics.length} onChange={values => { setTopics(values); changed(); }} />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FilterDropdown label="Years" options={[...years].reverse().map(year => ({ value: String(year), label: String(year) }))} selected={selectedYears.map(String)} emptyLabel="Choose at least one year" disabled={pending} onChange={values => { setYears(values.map(Number)); changed(); }} />
      <FilterDropdown label="Focus timer" options={[{value:'15',label:'15 minutes',description:'A little more thinking time'},{value:'12',label:'12 minutes',description:'A quicker challenge'}]} selected={[String(minutes)]} single searchable={false} disabled={pending} onChange={values => { setMinutes(Number(values[0]) as 12 | 15); changed(); }} />
    </div>
    <p className="text-xs leading-relaxed text-muted-foreground">Choose multiple subjects, topics and years. No subjects or topics selected means all. Choose one timer per sprint.</p>
  </fieldset>;
  return <section id="quick-practice" aria-label="Quick practice" className="min-w-0 space-y-4 rounded-xl border border-primary/30 bg-card p-4 sm:p-5">
    <div className="flex items-start justify-between gap-2"><div><p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary"><Zap className="h-4 w-4" />Quick practice</p><h2 className="text-xl font-semibold tracking-tight">Five questions. One small win.</h2></div><span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium">{minutes} min</span></div>
    <p className="text-sm text-muted-foreground">{catalog.mixed ? '3 MCQs · 1 MSQ · 1 NAT' : '5 MCQs'} · {selectedYears.length} {selectedYears.length === 1 ? 'year' : 'years'} selected</p>
    {catalog.resumeId && <Button asChild className="min-h-12 w-full"><Link href={`/test/${catalog.resumeId}`}>Resume unfinished sprint<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}
    {compact ? <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">{catalog.resumeId ? 'Choose a new sprint' : subjectSummary}<span className="ml-2 text-xs font-normal text-muted-foreground">Edit filters</span></summary><div className="mt-4">{fields}</div></details> : fields}
    <div className="rounded-lg border bg-muted/25 p-3" role="status" aria-live="polite"><div className="flex items-center justify-between gap-2 text-xs"><strong>{matching.length} matching questions</strong><span className={ready ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>{ready ? 'Ready for a sprint' : 'Add more options'}</span></div><p className="mt-1 text-xs text-muted-foreground">{counts.MCQ} MCQs{catalog.mixed ? ` · ${counts.MSQ} MSQs · ${counts.NAT} NATs` : ''}</p><p className="mt-1 break-words text-xs text-muted-foreground">{yearSummary}</p>{!ready && <p className="mt-2 text-xs text-muted-foreground">{!selectedYears.length ? 'Select at least one year.' : 'Broaden your subjects, topics or years to build a complete sprint.'}</p>}</div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button onClick={start} disabled={!ready || pending} aria-busy={pending} className="min-h-12 w-full" variant={catalog.resumeId ? 'outline' : 'default'}>{pending ? 'Preparing your sprint…' : catalog.resumeId ? 'Start a new 5-Q sprint' : 'Start 5-Q Sprint'}<ArrowRight className="ml-2 h-4 w-4" /></Button>
    <p className="text-xs text-muted-foreground">Answers save on every tap. Pause now; pick up where you left off.</p>
    <details className="text-xs text-muted-foreground"><summary className="cursor-pointer py-1">Have more time?</summary><Link href="/test/select" className="inline-flex min-h-11 items-center underline underline-offset-4">Full mocks &amp; custom practice</Link></details>
  </section>;
}
