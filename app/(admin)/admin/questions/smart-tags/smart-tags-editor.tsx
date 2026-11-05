'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MathText } from '@/components/MathText';
import { QuestionExplanation } from '@/components/QuestionExplanation';
import { searchTagQuestions, saveSmartTags } from './actions';

type SearchQuestion = NonNullable<Awaited<ReturnType<typeof searchTagQuestions>>['questions']>[number];

export function SmartTagsEditor() {
  const [term, setTerm] = useState(''), [questions, setQuestions] = useState<SearchQuestion[]>([]);
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [searched, setSearched] = useState(false);
  async function search() {
    setPending(true); setError('');
    try { const r = await searchTagQuestions(term); if (r.error) setError(r.error); else { setQuestions(r.questions ?? []); setSearched(true); } }
    catch { setError('Question search could not load. Please retry.'); }
    finally { setPending(false); }
  }
  return <div className="mx-auto max-w-3xl space-y-5">
    <div><h1 className="text-2xl font-semibold">Smart tags</h1><p className="mt-2 text-sm text-muted-foreground">Tag the concepts a question tests and its possible pitfalls. Only reviewed tags appear in student diagnostics.</p></div>
    <form onSubmit={event => { event.preventDefault(); void search(); }} className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="tag-search" className="sr-only">Question ID or question text</label>
      <input id="tag-search" value={term} onChange={e => setTerm(e.target.value)} maxLength={100} required minLength={3} placeholder="Question ID or question text" className="h-11 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm" />
      <Button disabled={pending} aria-busy={pending} className="min-h-11">{pending ? 'Searching…' : 'Find questions'}</Button>
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {searched && !questions.length && <p role="status" className="text-sm">No matching questions. Try a shorter text fragment or the exact question ID.</p>}
    {questions.length === 20 && <p className="text-xs text-muted-foreground">Showing the first 20 matches. Refine your search to find another question.</p>}
    {questions.map(q => <QuestionTagForm key={q.id} question={q} />)}
  </div>;
}

function QuestionTagForm({ question: q }: { question: SearchQuestion }) {
  const [concepts, setConcepts] = useState(q.tags?.core_concepts.join('\n') ?? '');
  const [traps, setTraps] = useState(q.tags?.common_error_triggers.join('\n') ?? '');
  const [note, setNote] = useState(q.tags?.review_note ?? ''), [reviewed, setReviewed] = useState(q.tags?.reviewed ?? false);
  const [pending, setPending] = useState(false), [message, setMessage] = useState(''), [failed, setFailed] = useState(false);
  function changed() { setReviewed(false); setMessage(''); }
  async function save() {
    setPending(true); setMessage('');
    try {
      const r = await saveSmartTags({ questionId: q.id, concepts, traps, reviewed, note });
      setFailed('error' in r); setMessage('error' in r ? r.error! : reviewed ? 'Reviewed tags saved.' : 'Draft saved. It will not appear in diagnostics.');
    } catch { setFailed(true); setMessage('Tags could not be saved. Please retry.'); }
    finally { setPending(false); }
  }
  const field = 'mt-1 min-h-24 w-full rounded-lg border bg-background p-3 text-sm';
  return <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
    <div><p className="text-xs text-muted-foreground">{q.source} · {q.subject} / {q.topic}</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{q.id}</p><MathText className="mt-3 text-sm" text={q.text} /></div>
    {q.explanation && <details><summary className="cursor-pointer text-sm font-medium">Read the solution before tagging</summary><div className="mt-3"><QuestionExplanation text={q.explanation} /></div></details>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Core concepts <span className="block text-xs font-normal text-muted-foreground">One concept per line · up to 8</span><textarea value={concepts} maxLength={700} onChange={e => { setConcepts(e.target.value); changed(); }} className={field} placeholder={'Directed acyclic graphs\nTopological sort'} /></label>
      <label className="text-sm font-medium">Possible error triggers <span className="block text-xs font-normal text-muted-foreground">Editorial pitfalls, not a diagnosis · up to 8</span><textarea value={traps} maxLength={700} onChange={e => { setTraps(e.target.value); changed(); }} className={field} placeholder={'Negation in an MSQ statement\nBoundary condition'} /></label>
    </div>
    <label className="block text-sm font-medium">Review note<textarea value={note} maxLength={1000} onChange={e => { setNote(e.target.value); changed(); }} className={field} placeholder="Explain how the question and solution support these tags." /></label>
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={reviewed} onChange={e => { setReviewed(e.target.checked); setMessage(''); }} />I reviewed these concepts against the question and solution.</label>
    {message && <p role={failed ? 'alert' : 'status'} className={`text-sm ${failed ? 'text-destructive' : 'text-muted-foreground'}`}>{message}</p>}
    <Button onClick={save} disabled={pending} aria-busy={pending} className="min-h-11">{pending ? 'Saving…' : reviewed ? 'Save reviewed tags' : 'Save draft tags'}</Button>
  </section>;
}
