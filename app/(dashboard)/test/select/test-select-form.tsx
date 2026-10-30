"use client";
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { ExamStream } from '@/lib/stream-scope';
import { filterTestPool, type PoolQuestion, type TestTopic, type TestMode } from '@/lib/test-pool';
import { createTest } from './actions';
type Props = {
    examId: string;
    examName: string;
    stream: ExamStream | null;
    requiresStream: boolean;
    subjects: {
        id: string;
        name: string;
    }[];
    topics: TestTopic[];
    pool: PoolQuestion[];
};
const styles = 'h-11 w-full rounded-lg border bg-background px-3 text-sm disabled:opacity-50';
export function TestSelectForm({ examId, examName, stream, requiresStream, subjects, topics, pool }: Props) {
    const router = useRouter();
    const [mode, setMode] = useState<TestMode>(requiresStream ? 'full_paper' : 'full_mock');
    const [year, setYear] = useState('');
    const [paper, setPaper] = useState('');
    const [subjectId, setSubject] = useState('');
    const [topicId, setTopic] = useState('');
    const [count, setCount] = useState(10);
    const [timed, setTimed] = useState(true);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const full = mode === 'full_paper' || mode === 'full_mock';
    const years = [...new Set(pool.flatMap(q => q.year ? [q.year] : []))].sort((a, b) => b - a);
    const papers = [...new Set(pool.filter(q => !year || q.year === Number(year)).flatMap(q => q.paper ? [q.paper] : []))].sort();
    const sourcePool = filterTestPool(pool, { year: year ? Number(year) : null, paper: paper || null, subjectId: null, topicId: null }, topics);
    const matching = filterTestPool(sourcePool, { year: null, paper: null, subjectId: full ? null : subjectId || null, topicId: full ? null : topicId || null }, topics);
    const availableSubjects = subjects.filter(s => sourcePool.some(q => q.subject_id === s.id));
    const availableTopics = topics.filter(t => t.subject_id === subjectId && filterTestPool(sourcePool, { year: null, paper: null, subjectId, topicId: t.id }, topics).length);
    const total = mode === 'full_paper' ? matching.length : Math.min(count, matching.length);
    const minutes = mode === 'full_paper' ? 180 : total;
    const ready = matching.length > 0 && (!requiresStream || (!!year && !!paper)) && (!(mode === 'subject_wise' || mode === 'topic_wise') || !!subjectId) && (mode !== 'topic_wise' || !!topicId);
    const modes: [
        TestMode,
        string,
        string
    ][] = [requiresStream ? ['full_paper', 'Full paper', 'Every question from one year and paper / shift'] : ['full_mock', 'Full mock', 'Questions from your exam'], ['subject_wise', 'Subject-wise', 'Choose one subject'], ['topic_wise', 'Topic-wise', 'Choose a topic or subtopic'], ['custom', 'Custom practice', 'Choose your filters and question count']];
    async function start() {
        if (!ready || pending)
            return;
        setPending(true);
        setError('');
        try {
            const result = await createTest({ examId, streamId: stream?.id || null, mode, year: year ? Number(year) : null, paper: paper || null, subjectId: full ? null : subjectId || null, topicId: full ? null : topicId || null, count, timed });
            if ('error' in result) {
                setError(result.error);
                setPending(false);
            }
            else
                router.push(`/test/${result.sessionId}`);
        }
        catch {
            setError('Unable to start your test. Please try again.');
            setPending(false);
        }
    }
    if (!pool.length)
        return <div className="mx-auto max-w-2xl space-y-4 py-6"><h1 className="text-2xl font-bold">{stream?.name || examName}</h1><p>No questions have been added for this {stream ? 'stream' : 'exam'} yet. Papers and subjects will appear here after questions are added.</p><Button asChild variant="outline"><Link href="/onboarding">Change exam or stream</Link></Button></div>;
    return <div className="mx-auto max-w-2xl space-y-6 py-4">
    <header><p className="text-sm text-muted-foreground">{examName}{stream ? ` · ${stream.name} (${stream.code})` : ''}</p><h1 className="mt-1 text-2xl font-bold">Create your test</h1><p className="mt-2 text-sm text-muted-foreground">Choose a source paper, then take the full paper or focus your practice.</p></header>
    <fieldset disabled={pending} className="space-y-6">
      <div className="grid grid-cols-2 gap-3">{modes.map(([value, title, desc]) => <button type="button" key={value} aria-pressed={mode === value} onClick={() => { setMode(value); setSubject(''); setTopic(''); setError(''); }} className={`rounded-xl border p-4 text-left ${mode === value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted'}`}><span className="block font-semibold">{title}</span><span className="mt-1 block text-xs text-muted-foreground">{desc}</span></button>)}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">Source year<select aria-label="Source year" className={styles} value={year} onChange={e => { setYear(e.target.value); setPaper(''); setSubject(''); setTopic(''); }}><option value="">{requiresStream ? 'Select year' : 'All years'}</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label>
        <label className="space-y-2 text-sm font-medium">Paper / shift<select aria-label="Paper / shift" className={styles} value={paper} disabled={requiresStream && !year} onChange={e => { setPaper(e.target.value); setSubject(''); setTopic(''); }}><option value="">{requiresStream ? 'Select paper / shift' : 'All papers'}</option>{papers.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
      </div>
      {!full && <label className="block space-y-2 text-sm font-medium">Subject<select aria-label="Subject" value={subjectId} className={styles} onChange={e => { setSubject(e.target.value); setTopic(''); }}><option value="">{mode === 'custom' ? 'All subjects' : 'Select subject'}</option>{availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
      {!full && mode !== 'subject_wise' && <label className="block space-y-2 text-sm font-medium">Topic / subtopic<select aria-label="Topic / subtopic" className={styles} value={topicId} disabled={!subjectId} onChange={e => setTopic(e.target.value)}><option value="">{mode === 'custom' ? 'All topics' : 'Select topic / subtopic'}</option>{availableTopics.map(t => <option key={t.id} value={t.id}>{t.parent_id ? `${topics.find(p => p.id === t.parent_id)?.name || ''} → ` : ''}{t.name}</option>)}</select></label>}
      {mode !== 'full_paper' && <label className="block space-y-2 text-sm font-medium">Number of questions<select aria-label="Number of questions" className={styles} value={count} onChange={e => setCount(Number(e.target.value))}>{[10, 25, 50, 65, 100, 150].map(n => <option key={n} value={n}>{n}</option>)}</select></label>}
      <label className="block space-y-2 text-sm font-medium">Timing<select aria-label="Timing" className={styles} value={timed ? 'timed' : 'practice'} onChange={e => setTimed(e.target.value === 'timed')}><option value="timed">Timed test{total ? ` · ${minutes} minutes` : ''}</option><option value="practice">Untimed practice</option></select></label>
    </fieldset>
    <div className="space-y-3 rounded-xl border bg-card p-5">
      <p className="text-sm">{ready ? <><strong>{total} questions</strong>{mode === 'full_paper' ? ` · ${matching.reduce((n, q) => n + Number(q.marks || 0), 0)} marks` : ''} · {timed ? `${minutes} minutes` : 'Untimed practice'}{paper ? ` · ${year} / ${paper}` : ''}</> : requiresStream && (!year || !paper) ? 'Select a year and paper / shift to continue.' : 'Select your subject or topic to continue.'}</p>
      {mode !== 'full_paper' && matching.length < count && ready && <p className="text-xs text-muted-foreground">This selection has {matching.length} questions. All available questions will be included.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button onClick={start} disabled={!ready || pending} className="w-full">{pending ? 'Creating…' : timed ? 'Start test' : 'Start practice'}</Button>
    </div>
  </div>;
}
