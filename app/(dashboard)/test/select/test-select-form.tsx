"use client";
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FilterDropdown } from '@/components/practice/FilterDropdown';
import filterStyles from '@/components/practice/filters.module.css';
import type { ExamStream } from '@/lib/stream-scope';
import { filterTestPool, type PoolQuestion, type TestTopic, type TestMode } from '@/lib/test-pool';
import { createTest } from './actions';
import { describeYears, summariseAvailability } from '@/lib/content-availability';
import { PageHeading } from '@/components/workspace/PageHeading';
import { PlaySquare } from 'lucide-react';

type Props = { initialSelection?: Record<string, string>; examId: string; examName: string;
    stream: ExamStream | null; requiresStream: boolean; subjects: { id: string; name: string }[];
    topics: TestTopic[]; pool: PoolQuestion[] };

export function TestSelectForm({ examId, examName, stream, requiresStream, subjects, topics, pool, initialSelection = {} }: Props) {
    const router = useRouter();
    const requestedMode = initialSelection.mode;
    const initialMode: TestMode = requestedMode === 'subject_wise' || requestedMode === 'topic_wise' || requestedMode === 'custom' ? requestedMode : requiresStream ? 'full_paper' : 'full_mock';
    const initialYear = pool.some(q => String(q.year) === initialSelection.year) ? Number(initialSelection.year) : null;
    const initialPaper = pool.some(q => (initialYear == null || q.year === initialYear) && q.paper === initialSelection.paper) ? initialSelection.paper : '';
    const [mode, setMode] = useState<TestMode>(initialMode);
    const [selectedYears, setYears] = useState<number[]>(initialYear == null ? [] : [initialYear]);
    const [selectedPapers, setPapers] = useState<string[]>(initialPaper ? [initialPaper] : []);
    const [subjectIds, setSubjects] = useState<string[]>(subjects.some(s => s.id === initialSelection.subject) ? [initialSelection.subject] : []);
    const [topicIds, setTopics] = useState<string[]>(topics.some(t => t.id === initialSelection.topic) && subjects.some(s => s.id === initialSelection.subject) ? [initialSelection.topic] : []);
    const [count, setCount] = useState(10);
    const [timed, setTimed] = useState(true);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const full = mode === 'full_paper' || mode === 'full_mock';
    const onePaper = mode === 'full_paper';
    const years = [...new Set(pool.flatMap(q => q.year ? [q.year] : []))].sort((a, b) => b - a);
    const papers = [...new Set(pool.filter(q => !selectedYears.length || (q.year != null && selectedYears.includes(q.year))).flatMap(q => q.paper ? [q.paper] : []))].sort();
    const sourcePool = filterTestPool(pool, { year: null, paper: null, subjectId: null, topicId: null, years: selectedYears, papers: selectedPapers }, topics);
    const availability = summariseAvailability(pool);
    const selectedPaper = selectedYears.length === 1 && selectedPapers.length === 1 ? availability.papers.find(item => item.year === selectedYears[0] && item.paper === selectedPapers[0]) : undefined;
    const matching = filterTestPool(sourcePool, { year: null, paper: null, subjectId: null, topicId: null, subjectIds: full ? [] : subjectIds, topicIds: full ? [] : topicIds }, topics);
    const availableSubjects = subjects.filter(s => sourcePool.some(q => q.subject_id === s.id));
    const availableTopics = topics.filter(t => (!subjectIds.length || subjectIds.includes(t.subject_id)) && filterTestPool(sourcePool, { year: null, paper: null, subjectId: null, topicId: t.id }, topics).length);
    const total = onePaper ? matching.length : Math.min(count, matching.length);
    const minutes = onePaper ? 180 : total;
    const sourceReady = !requiresStream || (selectedYears.length > 0 && selectedPapers.length > 0);
    const ready = matching.length > 0 && sourceReady && (!onePaper || (selectedYears.length === 1 && selectedPapers.length === 1)) &&
        (!(mode === 'subject_wise' || mode === 'topic_wise') || subjectIds.length > 0) && (mode !== 'topic_wise' || topicIds.length > 0);
    const modes: [TestMode, string, string][] = [requiresStream ? ['full_paper', 'Full paper', 'Every question from one year and paper / shift'] : ['full_mock', 'Full mock', 'Questions from your exam'],
        ['subject_wise', 'Subject-wise', 'Practise one or more subjects'], ['topic_wise', 'Topic-wise', 'Focus on selected topics and subtopics'], ['custom', 'Custom practice', 'Combine filters and set your question count']];
    function resetFocus() { setSubjects([]); setTopics([]); setError(''); }
    function changeMode(value: TestMode) {
        setMode(value); resetFocus();
        if (value === 'full_paper') {
            const year = selectedYears[0];
            setYears(selectedYears.slice(0, 1));
            setPapers(selectedPapers.filter(paper => pool.some(q => q.year === year && q.paper === paper)).slice(0, 1));
        }
    }
    async function start() {
        if (!ready || pending) return;
        setPending(true); setError('');
        try {
            const result = await createTest({ examId, streamId: stream?.id || null, mode,
                year: null, paper: null, subjectId: null, topicId: null,
                years: selectedYears, papers: selectedPapers, subjectIds: full ? [] : subjectIds, topicIds: full ? [] : topicIds, count, timed });
            if ('error' in result) { setError(result.error); setPending(false); }
            else router.push(`/test/${result.sessionId}`);
        } catch { setError('Unable to start your test. Please try again.'); setPending(false); }
    }
    if (!pool.length) return <div className="mx-auto max-w-2xl space-y-4 py-6"><h1 className="text-2xl font-bold">{stream?.name || examName}</h1><p>No questions have been added for this {stream ? 'stream' : 'exam'} yet. Papers and subjects will appear here after questions are added.</p><Button asChild variant="outline"><Link href="/onboarding">Change exam or stream</Link></Button></div>;
    return <div className={`${filterStyles.scope} mx-auto max-w-2xl space-y-6 py-4`}>
        <PageHeading title="Create your test" eyebrow={`${examName}${stream ? ` · ${stream.code}` : ''}`} icon={<PlaySquare />} description={onePaper ? 'Choose one source year and paper / shift for a full exam.' : 'Combine subjects, topics, source years and papers for focused practice.'} />
        <details className="rounded-xl border bg-card p-4 text-sm"><summary className="cursor-pointer font-medium">Available papers · {describeYears(availability.years)} · {availability.questionCount} questions</summary><ul className="mt-3 space-y-2">{availability.papers.map(item => <li key={JSON.stringify([item.year, item.paper])} className="flex flex-wrap justify-between gap-2"><span>{item.year ?? 'Year not labelled'} · {item.paper ?? 'Paper not labelled'}</span><span className="text-muted-foreground">{item.questionCount} questions · {item.marks} marks</span></li>)}</ul></details>
        {requiresStream && selectedPaper && (selectedPaper.questionCount !== 65 || selectedPaper.marks !== 100 || !selectedPaper.sequentialNumbering) && <p role="status" className="rounded-lg border p-3 text-sm">This source currently has {selectedPaper.questionCount} questions and {selectedPaper.marks} marks available. It has not been confirmed as a complete 65-question paper.</p>}
        <fieldset disabled={pending} className="space-y-6">
            <div className="grid grid-cols-2 gap-3">{modes.map(([value, title, desc]) => <button type="button" key={value} aria-pressed={mode === value} onClick={() => changeMode(value)} className={`rounded-xl border p-4 text-left ${mode === value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted'}`}><span className="block font-semibold">{title}</span><span className="mt-1 block text-xs text-muted-foreground">{desc}</span></button>)}</div>
            <div className="grid gap-4 sm:grid-cols-2">
                <FilterDropdown label="Source years" options={years.map(year => ({value:String(year),label:String(year)}))} selected={selectedYears.map(String)} single={onePaper} disabled={pending} emptyLabel={requiresStream ? 'Choose source years' : 'All years'} onChange={values => { setYears(values.map(Number)); setPapers([]); resetFocus(); }} />
                <FilterDropdown label="Papers / shifts" options={papers.map(paper => ({value:paper,label:paper}))} selected={selectedPapers} single={onePaper} disabled={pending || (requiresStream && !selectedYears.length)} emptyLabel={requiresStream ? 'Choose papers / shifts' : 'All papers'} onChange={values => { setPapers(values); resetFocus(); }} />
            </div>
            {!full && <FilterDropdown label="Subjects" options={availableSubjects.map(subject => ({value:subject.id,label:subject.name}))} selected={subjectIds} disabled={pending || !sourceReady} emptyLabel={mode === 'custom' ? 'All subjects' : 'Choose subjects'} onChange={values => { setSubjects(values); setTopics(current => current.filter(id => topics.some(topic => topic.id === id && (!values.length || values.includes(topic.subject_id))))); setError(''); }} />}
            {!full && mode !== 'subject_wise' && <FilterDropdown label="Topics / subtopics" options={availableTopics.map(topic => ({value:topic.id,label:topic.name,description:[subjects.find(subject => subject.id === topic.subject_id)?.name, topic.parent_id ? topics.find(parent => parent.id === topic.parent_id)?.name : null].filter(Boolean).join(' · ')}))} selected={topicIds} disabled={pending || !sourceReady || (mode === 'topic_wise' && !subjectIds.length)} emptyLabel={mode === 'custom' ? 'All topics' : 'Choose topics / subtopics'} onChange={values => { setTopics(values); setError(''); }} />}
            {!onePaper && <p className="text-xs leading-relaxed text-muted-foreground">Checkbox menus support multiple selections. Empty optional filters include all options; question count and timing use one choice each.</p>}
            <div className="grid gap-4 sm:grid-cols-2">
                {!onePaper && <FilterDropdown label="Number of questions" options={[10,25,50,65,100,150].map(n => ({value:String(n),label:`${n} questions`}))} selected={[String(count)]} single searchable={false} disabled={pending} onChange={values => setCount(Number(values[0]))} />}
                <FilterDropdown label="Timing" options={[{value:'timed',label:'Timed test',description:total ? `${minutes} minutes for this selection` : 'Countdown during your test'},{value:'practice',label:'Untimed practice',description:'Work at your own pace'}]} selected={[timed ? 'timed' : 'practice']} single searchable={false} disabled={pending} onChange={values => setTimed(values[0] === 'timed')} />
            </div>
        </fieldset>
        <div className="space-y-3 rounded-xl border bg-card p-5">
            <p className="text-sm" role="status" aria-live="polite">{ready ? <><strong>{total} questions</strong>{onePaper ? ` · ${matching.reduce((n,q) => n+Number(q.marks || 0),0)} marks` : ''} · {timed ? `${minutes} minutes` : 'Untimed practice'}</> : !sourceReady ? 'Select source years and papers / shifts to continue.' : !matching.length ? 'No questions match these filters. Add more options.' : 'Select your subjects or topics to continue.'}</p>
            {sourceReady && <p className="text-xs text-muted-foreground">{matching.length} matching questions · {selectedYears.length ? [...selectedYears].sort((a,b) => a-b).join(', ') : 'All years'} · {selectedPapers.length ? selectedPapers.join(', ') : 'All papers'}</p>}
            {!onePaper && matching.length < count && ready && <p className="text-xs text-muted-foreground">This selection has {matching.length} questions. All available questions will be included.</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button onClick={start} disabled={!ready || pending} aria-busy={pending} className="h-11 w-full">{pending ? 'Creating…' : timed ? 'Start test' : 'Start practice'}</Button>
        </div>
    </div>;
}
