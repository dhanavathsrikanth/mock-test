"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, ChevronLeft, ChevronRight, Clock, Pause, WifiOff, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionPrompt } from '@/components/QuestionPrompt';
import { QuestionFigure } from '@/components/QuestionFigure';
import { NumericAnswerInput } from '@/components/NumericAnswerInput';
import { QuestionTypeTag } from '@/components/QuestionTypeTag';
import { MathText } from '@/components/MathText';
import { MatchingQuestion } from '@/components/MatchingQuestion';
import { MatchOption } from '@/components/MatchOption';
import { GateCalculator } from '@/components/calculator/GateCalculator';
import { isMatchingQuestion, isMatchCodeOption } from '@/lib/matching-question-utils';
import { hasResponse, numericResponse, selection, toggleResponse, type QuestionResponse } from '@/lib/question-response';
import { freshSprintDraft, readSprintDraft, writeSprintDraft, removeSprintDraft, type SprintDraft } from '@/lib/sprint-draft';
import type { QuestionPresentation } from '@/lib/question-contract';
import { createClient } from '@/lib/supabase/client';
import { submitTest } from '@/app/(dashboard)/test/[sessionId]/actions';

type Props = { userId: string; session: { id: string; started_at: string; duration_minutes: number };
  questions: QuestionPresentation[]; initialAnswers: Record<string, QuestionResponse> };

export function SprintClient({ userId, session, questions, initialAnswers }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<SprintDraft | null>(null);
  const current = useRef<SprintDraft | null>(null);
  const [online, setOnline] = useState(true);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [syncState, setSyncState] = useState<'saved' | 'saving' | 'pending'>('pending');
  const [syncTrigger, setSyncTrigger] = useState(0);
  const [calculator, setCalculator] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);
  const pendingSync = useRef<Promise<void> | null>(null);
  const autoSubmitted = useRef(false);
  const submitRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => { if (confirm) confirmDialog.current?.showModal(); }, [confirm]);

  const persist = useCallback((next: SprintDraft) => {
    // Write synchronously before rendering or attempting the network request.
    current.current = next;
    try { setStorageAvailable(writeSprintDraft(window.localStorage, next)); }
    catch { setStorageAvailable(false); }
    setDraft(next);
  }, []);

  useEffect(() => {
    const identity = { userId, sessionId: session.id, startedAt: session.started_at,
      questionIds: questions.map(q => q.id), durationSeconds: session.duration_minutes * 60 };
    let restored;
    try { restored = readSprintDraft(window.localStorage, identity, initialAnswers); }
    catch { restored = freshSprintDraft(identity, initialAnswers); setStorageAvailable(false); }
    persist(restored);
    const connection = () => { setOnline(navigator.onLine !== false); setSyncTrigger(n => n + 1); };
    connection();
    window.addEventListener('online', connection); window.addEventListener('offline', connection);
    return () => { window.removeEventListener('online', connection); window.removeEventListener('offline', connection); };
  }, [userId, session.id, session.started_at, session.duration_minutes, questions, initialAnswers, persist]);

  const synchronize = useCallback((): Promise<void> => {
    if (pendingSync.current) return pendingSync.current;
    const snapshot = current.current;
    if (!snapshot || navigator.onLine === false || submittingRef.current) return Promise.resolve();
    const rows = Object.entries(snapshot.answers).map(([questionId, answer]) => ({
      session_id: session.id, question_id: questionId,
      selected_option: typeof answer === 'number' ? answer : null,
      selected_options: Array.isArray(answer) ? answer : null, numeric_answer: numericResponse(answer),
    }));
    if (!rows.length) { setSyncState('saved'); return Promise.resolve(); }
    setSyncState('saving');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const request = (async () => {
      try {
        const { error: saveError } = await createClient().from('test_answers')
          .upsert(rows, { onConflict: 'session_id,question_id' }).abortSignal(controller.signal);
        setSyncState(saveError ? 'pending' : 'saved');
      } catch { setSyncState('pending'); }
      finally {
        clearTimeout(timeout); pendingSync.current = null;
        if (current.current?.answerVersion !== snapshot.answerVersion) setSyncTrigger(n => n + 1);
      }
    })();
    pendingSync.current = request;
    return request;
  }, [session.id]);

  const answerVersion = draft?.answerVersion;
  const ready = draft !== null;
  useEffect(() => {
    if (!online || answerVersion == null || submitting) return;
    const timeout = setTimeout(() => { void synchronize(); }, 500);
    return () => clearTimeout(timeout);
  }, [answerVersion, online, syncTrigger, submitting, synchronize]);

  useEffect(() => {
    if (!ready || !online || submitting || syncState !== 'pending') return;
    const retry = setTimeout(() => setSyncTrigger(n => n + 1), 5000);
    return () => clearTimeout(retry);
  }, [ready, online, submitting, syncState, syncTrigger]);

  useEffect(() => {
    if (!ready || !online || submitting) return;
    let last = Date.now();
    function tick() {
      const now = Date.now();
      if (document.visibilityState === 'hidden') { last = now; return; }
      const elapsed = Math.floor((now - last) / 1000);
      if (elapsed <= 0 || !current.current) return;
      last += elapsed * 1000;
      persist({ ...current.current, remainingSeconds: Math.max(0, current.current.remainingSeconds - elapsed) });
    }
    const visibility = () => { last = Date.now(); };
    const timer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
    // Answer edits must not reset the active clock or defer the next tick.
  }, [ready, online, submitting, persist]);

  async function finish() {
    if (submittingRef.current || !current.current) return;
    if (navigator.onLine === false) { setError('Your answers are saved on this device. Reconnect to finish your sprint.'); setConfirm(false); return; }
    submittingRef.current = true; setSubmitting(true); setConfirm(false); setError('');
    try {
      // The single in-flight writer settles before final server-side grading.
      await pendingSync.current;
      const result = await submitTest(session.id, userId, current.current.answers, current.current.durationSeconds - current.current.remainingSeconds);
      if (result.error) throw new Error(result.error);
      try { removeSprintDraft(window.localStorage, userId, session.id); } catch { /* Storage may be blocked; the completed session still redirects safely. */ }
      // Completion uses the same reward and automatic revision pipeline as a normal test.
      void Promise.allSettled([
        fetch('/api/streak', { method: 'POST', keepalive: true }),
        fetch('/api/xp/award', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: session.id }) }),
      ]);
      router.replace(`/result/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to finish. Your answers are kept; please retry.');
      submittingRef.current = false; setSubmitting(false);
    }
  }
  submitRef.current = finish;
  useEffect(() => {
    if (draft?.remainingSeconds === 0 && online && !autoSubmitted.current) {
      autoSubmitted.current = true; void submitRef.current();
    }
  }, [draft?.remainingSeconds, online]);

  if (!draft) return <div role="status" className="mx-auto max-w-2xl p-6">Restoring your sprint…</div>;
  const q = questions[draft.currentIndex];
  const answered = Object.values(draft.answers).filter(hasResponse).length;
  const timeUp = draft.remainingSeconds === 0;
  const time = `${Math.floor(draft.remainingSeconds / 60).toString().padStart(2,'0')}:${(draft.remainingSeconds % 60).toString().padStart(2,'0')}`;
  function changeAnswer(value: QuestionResponse) {
    if (submittingRef.current || !current.current || timeUp) return;
    persist({ ...current.current, answerVersion: current.current.answerVersion + 1, answers: { ...current.current.answers, [q.id]: value } });
    setSyncState('pending');
  }
  function navigate(index: number) { if (current.current) persist({ ...current.current, currentIndex: index }); }

  return <div className="flex h-full min-h-0 flex-col bg-background">
    <header className="shrink-0 border-b bg-card px-4 py-3"><div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
      <div><p className="flex items-center gap-1.5 text-xs font-semibold text-primary"><Zap className="h-3.5 w-3.5" />5-Q SPRINT</p><p className="mt-1 text-xs text-muted-foreground">{answered}/5 answered</p></div>
      <div aria-label="Time remaining" className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-mono text-lg font-semibold tabular-nums ${draft.remainingSeconds <= 60 ? 'bg-red-500/10 text-red-600' : 'bg-muted'}`}><Clock className="h-4 w-4" />{time}</div>
      <Button variant="ghost" size="sm" disabled={submitting} onClick={() => router.push('/dashboard')}><Pause className="mr-1 h-4 w-4" />Pause &amp; leave</Button>
    </div></header>
    <div className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto max-w-2xl space-y-5 px-4 py-5 sm:px-6">
      {!storageAvailable && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm">Device storage is unavailable. Keep this tab open until your answers sync online.</p>}
      {!online && <p role="status" className="flex gap-2 rounded-lg border bg-muted/40 p-3 text-sm"><WifiOff className="mt-0.5 h-4 w-4 shrink-0" />{storageAvailable ? 'Offline. Timer paused; every answer is saved on this device.' : 'Offline. Timer paused; device storage is unavailable. Keep this tab open.'}</p>}
      {error && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm">{error}</p>}
      <div className="flex items-center justify-between gap-3"><nav aria-label="Sprint questions" className="flex gap-2">{questions.map((item,i) => <button key={item.id} type="button" disabled={submitting} onClick={() => navigate(i)} aria-label={`Question ${i+1}${hasResponse(draft.answers[item.id]) ? ', answered' : ''}`} aria-current={draft.currentIndex === i ? 'step' : undefined} className={`h-11 w-11 rounded-lg border text-sm font-semibold ${draft.currentIndex === i ? 'border-primary bg-primary text-primary-foreground' : hasResponse(draft.answers[item.id]) ? 'border-emerald-500/40 bg-emerald-500/10' : 'bg-card'}`}>{i+1}</button>)}</nav></div>
      <p role="status" className="text-xs text-muted-foreground">{storageAvailable ? 'Saved on this device' : 'Device save unavailable'}{online ? syncState === 'saving' ? ' · Syncing…' : syncState === 'saved' ? ' · Synced' : ' · Waiting to sync' : ''}</p>
      <section className="space-y-5 rounded-xl border bg-card p-4 sm:p-6" aria-label={`Question ${draft.currentIndex+1}`}>
        <div className="flex flex-wrap items-center gap-2"><QuestionTypeTag type={q.question_type} /><span className="text-xs text-muted-foreground">{[q.year,q.paper].filter(Boolean).join(' · ')}</span></div>
        {isMatchingQuestion(q.question_text) ? <><MatchingQuestion text={q.question_text} />{q.image_url && <QuestionFigure image={{ url: q.image_url, width: q.image_width, height: q.image_height }} />}</> : <QuestionPrompt text={q.question_text} image={q.image_url ? { url:q.image_url, width:q.image_width, height:q.image_height } : undefined} />}
        <fieldset disabled={submitting || timeUp} className="space-y-3"><legend className="sr-only">Your answer</legend>{q.question_type === 'NAT' ? <NumericAnswerInput value={typeof draft.answers[q.id] === 'string' ? draft.answers[q.id] as string : ''} onChange={changeAnswer} decimalPlaces={q.answer_decimal_places} /> : <>
          {q.question_type === 'MSQ' && <p className="text-xs text-muted-foreground">Select every correct option.</p>}
          {[q.option_1,q.option_2,q.option_3,q.option_4].map((option,i) => { const isSelected = selection(draft.answers[q.id]).includes(i+1); return (
            <div key={i} className={`rounded-xl border ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''}`}>
              <label className="flex min-h-14 w-full cursor-pointer items-start gap-3 rounded-xl p-4">
                <input data-option={i+1} type={q.question_type === 'MSQ' ? 'checkbox' : 'radio'} name={`question-${q.id}`} checked={isSelected}
                  onChange={() => changeAnswer(toggleResponse(current.current?.answers[q.id], i+1, q.question_type === 'MSQ'))}
                  onClick={(event) => { if (q.question_type !== 'MSQ' && isSelected) { event.preventDefault(); changeAnswer(toggleResponse(current.current?.answers[q.id], i+1, false)); } }}
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-primary" />
                <span className="min-w-0 flex-1">{isMatchCodeOption(option || '') ? <MatchOption text={option || ''} /> : <MathText text={option || ''} />}</span>
              </label>
              {q.option_images?.[i] && <div className="px-4 pb-4"><QuestionFigure image={q.option_images[i]} inline /></div>}
            </div>
          ); })}
        </>}</fieldset>
      </section>
      <Button variant="outline" className="min-h-11 w-full" aria-expanded={calculator} aria-controls="sprint-calculator" onClick={() => setCalculator(value => !value)}><Calculator className="mr-2 h-4 w-4" />{calculator ? 'Hide calculator' : 'Open virtual calculator'}</Button>
      <div id="sprint-calculator" hidden={!calculator}><GateCalculator examMode /></div>
      <p className="text-xs leading-relaxed text-muted-foreground">Your timer pauses when this tab is hidden or your connection drops. Finish online to see your result and add mistakes to revision.</p>
    </div></div>
    <footer className="shrink-0 border-t bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"><div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
      <Button variant="outline" className="min-h-11" disabled={draft.currentIndex === 0 || submitting} onClick={() => navigate(draft.currentIndex-1)}><ChevronLeft className="h-4 w-4" />Previous</Button>
      {draft.currentIndex < 4 && !timeUp ? <Button className="min-h-11" disabled={submitting} onClick={() => navigate(draft.currentIndex+1)}>Next<ChevronRight className="h-4 w-4" /></Button> : <Button className="min-h-11" disabled={submitting} onClick={() => timeUp ? void finish() : setConfirm(true)}>{submitting ? 'Finishing…' : 'Finish sprint'}</Button>}
    </div></footer>
    {confirm && <dialog ref={confirmDialog} aria-labelledby="finish-sprint-title" onCancel={() => setConfirm(false)} className="w-[90vw] max-w-sm space-y-4 rounded-xl border bg-background p-5 text-foreground shadow-xl backdrop:bg-black/60"><h2 id="finish-sprint-title" className="text-lg font-semibold">Finish this sprint?</h2><p className="text-sm text-muted-foreground">{answered} of 5 questions answered. {5-answered > 0 ? `${5-answered} will be marked unattempted.` : 'Your result and explanations are next.'}</p><div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setConfirm(false)}>Keep practicing</Button><Button onClick={finish}>Finish sprint</Button></div></dialog>}
  </div>;
}
