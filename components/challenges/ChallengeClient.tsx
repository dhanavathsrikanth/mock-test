"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { QuestionPrompt } from '@/components/QuestionPrompt';
import { MathText } from '@/components/MathText';
import { NumericAnswerInput } from '@/components/NumericAnswerInput';
import { QuestionTypeTag } from '@/components/QuestionTypeTag';
import { QuestionFigure } from '@/components/QuestionFigure';
import { MatchingQuestion } from '@/components/MatchingQuestion';
import { MatchOption } from '@/components/MatchOption';
import { isMatchingQuestion, isMatchCodeOption } from '@/lib/matching-question-utils';
import { GateCalculator } from '@/components/calculator/GateCalculator';
import { createClient } from '@/lib/supabase/client';
import { hasResponse, selection, toggleResponse, type QuestionResponse } from '@/lib/question-response';
import { challengeKey, challengeSeconds, challengeTime, readChallengeDraft, saveChallengeDraft, validTurn, type Challenge, type ChallengeDraft } from '@/lib/challenges';
import { formatMarks } from '@/lib/marking';

export function ChallengeClient({ challenge: c }: { challenge: Challenge }) {
  const router = useRouter();
  const [draft,setDraft] = useState<ChallengeDraft | null>(null);
  const current = useRef<ChallengeDraft | null>(null);
  const [ready,setReady] = useState(false);
  const [now,setNow] = useState(Date.now());
  const [busy,setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error,setError] = useState('');
  const [storage,setStorage] = useState(true);
  const [calculator,setCalculator] = useState(false);
  const [finished,setFinished] = useState(false);
  const [syncing,setSyncing] = useState(false);
  const [recovery,setRecovery] = useState('');
  const sheet = useRef<HTMLDialogElement>(null);
  const autoFinish = useRef(false);
  const finishRef = useRef<() => Promise<void>>(async()=>{});

  function persist(value: ChallengeDraft) {
    current.current=value; setDraft(value);
    try { setStorage(saveChallengeDraft(window.localStorage,value)); } catch { setStorage(false); }
  }
  async function api(action: string, payload: Record<string,unknown> = {}) {
    const response = await fetch(`/api/challenges/${c.id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action,...payload}) });
    const body=await response.json();
    if (!response.ok) throw new Error(body.error || 'Unable to save. Please retry.');
    return body.data;
  }
  async function sync(token: string) {
    setSyncing(true);
    try {
      const session=await api('submit',{token});
      // Remove only this turn; another tab may have started a different attempt.
      try { if (readChallengeDraft(localStorage,c.id)?.token===token) localStorage.removeItem(challengeKey(c.id)); } catch { /* Server save succeeded. */ }
      router.replace(`/c/${c.id}/result?session=${encodeURIComponent(session)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your saved answers are kept. Retry saving your result.');
      setSyncing(false); setFinished(true); setRecovery(token);
    }
  }
  useEffect(()=>{
    let saved: ChallengeDraft | null=null;
    try { saved=readChallengeDraft(localStorage,c.id); } catch { setStorage(false); }
    if(saved) { current.current=saved; setDraft(saved); if(saved.finishedAt) setFinished(true); }
    const token=new URLSearchParams(window.location.hash.slice(1)).get('resume');
    if(new URL(window.location.href).searchParams.has('authError')) setError('Google sign-in did not complete. Your answers are saved. Retry here, or open your private recovery link in your regular browser.');
    if(token && validTurn(token)) {
      setRecovery(token); setFinished(true);
      void createClient().auth.getUser().then(({data:{user}})=>{ if(user) void sync(token); }).catch(()=>setError('Unable to check sign-in. Your saved turn is kept; please retry.'));
    }
    setReady(true);
    // The recovery capability is kept in memory until the submission is acknowledged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[c.id]);
  useEffect(()=>{ if(finished) sheet.current?.showModal(); },[finished]);
  const timerActive = !!draft && !finished;
  useEffect(()=>{
    if(!timerActive) return;
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return ()=>clearInterval(timer);
  },[timerActive]);
  const seconds=draft ? challengeSeconds(draft.startedAt,c.minutes,now) : 0;
  const remaining=Math.max(0,c.minutes*60-seconds);
  useEffect(()=>{
    if(draft && remaining===0 && !finished && !autoFinish.current) { autoFinish.current=true; void finishRef.current(); }
  },[draft,remaining,finished]);

  async function start() {
    if(busyRef.current) return;
    busyRef.current=true; setBusy(true); setError('');
    try {
      const turn=await api('start');
      persist({version:1,challengeId:c.id,token:turn.token,startedAt:turn.startedAt,answers:{},currentIndex:0});
      setRecovery(''); setFinished(false); setNow(Date.now()); autoFinish.current=false;
      window.history.replaceState(null,'',`/c/${c.id}`);
    } catch(err) { setError(err instanceof Error ? err.message : 'Unable to start. Please retry.'); }
    finally { busyRef.current=false; setBusy(false); }
  }
  async function finish() {
    if(busyRef.current || !current.current) return;
    const snapshot={...current.current,finishedAt:current.current.finishedAt ?? Date.now()};
    persist(snapshot); setFinished(true);
    busyRef.current=true; setBusy(true); setError('');
    try {
      await api('save',{token:snapshot.token,answers:snapshot.answers,seconds:challengeSeconds(snapshot.startedAt,c.minutes,snapshot.finishedAt)});
      setRecovery(snapshot.token);
      const {data:{user}}=await createClient().auth.getUser();
      if(user) await sync(snapshot.token);
    } catch(err) { setError(err instanceof Error ? err.message : 'Your device copy is kept. Reconnect and retry.'); }
    finally { busyRef.current=false; setBusy(false); }
  }
  finishRef.current=finish;
  async function login() {
    if(busyRef.current) return;
    busyRef.current=true; setBusy(true); setError('');
    try {
      const value=current.current;
      const token=recovery || value?.token;
      if(!token) throw new Error('No saved turn found. Start a new challenge.');
      // Commit the recovery copy before leaving this browser. No answers go into OAuth state or URLs.
      if(value?.token===token) {
        persist(value);
        await api('save',{token,answers:value.answers,seconds:challengeSeconds(value.startedAt,c.minutes,value.finishedAt ?? Date.now())});
      }
      const {data:{user}}=await createClient().auth.getUser();
      if(user) { await sync(token); return; }
      const next=`/c/${c.id}#resume=${encodeURIComponent(token)}`;
      window.history.replaceState(null,'',next); setRecovery(token);
      const {error:authError}=await createClient().auth.signInWithOAuth({provider:'google',options:{redirectTo:`${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`}});
      if(authError) throw authError;
    } catch(err) { setError(err instanceof Error ? err.message : 'Sign-in could not start. Your answers are saved; please retry.'); }
    finally { busyRef.current=false; setBusy(false); }
  }
  function change(value: QuestionResponse) {
    if(!current.current || current.current.finishedAt || remaining===0 || busyRef.current) return;
    const q=c.questions[current.current.currentIndex];
    persist({...current.current,answers:{...current.current.answers,[q.id]:value}});
  }
  if(!ready) return <main role="status" className="p-8 text-center">Restoring your challenge…</main>;
  if(syncing) return <main role="status" aria-live="polite" className="flex min-h-dvh items-center justify-center bg-background p-6 text-center"><div><p className="text-xl font-semibold">Saving your hard work &amp; calculating your metrics…</p><p className="mt-3 text-sm text-muted-foreground">Your answers are saved. Keep this page open for your comparison.</p></div></main>;
  const answered=draft ? c.questions.filter(q=>hasResponse(draft.answers[q.id])).length : 0;
  const q=draft ? c.questions[draft.currentIndex] : null;
  return <main className="min-h-dvh bg-background text-foreground">
    <header className="border-b bg-card px-4 py-4"><div className="mx-auto flex max-w-2xl items-center justify-between gap-4"><p className="text-xs font-bold tracking-[0.15em] text-primary">CLASSMATE CHALLENGE</p><span className="font-mono text-sm">{draft ? `${Math.floor(remaining/60).toString().padStart(2,'0')}:${(remaining%60).toString().padStart(2,'0')}` : `5 questions / ${c.minutes} min`}</span></div></header>
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-7 sm:py-12">
      {!draft && !finished ? <><p className="text-sm text-muted-foreground">{c.label}</p><h1 className="max-w-lg text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{c.creatorName} set the score.<br/><span className="text-primary">Your move.</span></h1>
        <section className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-6"><div><p className="text-sm text-muted-foreground">The score to beat</p><p className="mt-2 text-5xl font-bold tabular-nums">{formatMarks(c.creatorScore)}<span className="text-xl text-muted-foreground"> / {formatMarks(c.maximum)}</span></p></div><div className="text-right text-sm"><p className="font-semibold">{c.creatorName}</p><p className="mt-2 font-mono text-muted-foreground">{challengeTime(c.creatorSeconds)}</p></div></section>
        <p className="text-sm leading-relaxed text-muted-foreground">The same five questions. Your {c.minutes}-minute timer starts when you tap below. Start as a guest, then sign in to save your result and compare scores.</p>
        <Button className="min-h-12 w-full text-base" disabled={busy} onClick={start}>{busy?'Preparing your questions…':'Take the challenge →'}</Button>
        <p className="text-center text-xs text-muted-foreground">No app download. No sign-in to start.</p></> : q && draft && <>
          <div className="flex items-center justify-between"><nav aria-label="Challenge questions" className="flex gap-2">{c.questions.map((item,i)=><button key={item.id} type="button" disabled={finished || busy} aria-label={`Question ${i+1}${hasResponse(draft.answers[item.id])?', answered':''}`} aria-current={i===draft.currentIndex?'step':undefined} onClick={()=>persist({...draft,currentIndex:i})} className={`h-11 w-11 rounded-lg border text-sm font-semibold ${i===draft.currentIndex?'bg-primary text-primary-foreground':hasResponse(draft.answers[item.id])?'border-primary bg-primary/10':'bg-card'}`}>{i+1}</button>)}</nav><span className="text-xs text-muted-foreground">{answered}/5</span></div>
          <section className="space-y-5 rounded-2xl border bg-card p-5 sm:p-7"><QuestionTypeTag type={q.question_type}/>
            {isMatchingQuestion(q.question_text) ? <><MatchingQuestion text={q.question_text}/>{q.image_url && <QuestionFigure image={{url:q.image_url,width:q.image_width,height:q.image_height}}/>}</> : <QuestionPrompt text={q.question_text} image={q.image_url?{url:q.image_url,width:q.image_width,height:q.image_height}:undefined}/>}
            <fieldset disabled={finished || remaining===0 || busy} className="space-y-3"><legend className="sr-only">Your answer</legend>{q.question_type==='NAT' ? <NumericAnswerInput value={typeof draft.answers[q.id]==='string'?draft.answers[q.id] as string:''} onChange={change} decimalPlaces={q.answer_decimal_places}/> : <>
              {q.question_type==='MSQ' && <p className="text-xs text-muted-foreground">Select every correct option. No partial marks.</p>}
              {[q.option_1,q.option_2,q.option_3,q.option_4].map((option,i)=>{const isSelected=selection(draft.answers[q.id]).includes(i+1);return <div key={i} className={`rounded-xl border ${isSelected?'border-primary bg-primary/5 ring-1 ring-primary':''}`}><label className="flex min-h-14 w-full cursor-pointer items-start gap-3 p-4"><input data-option={i+1} type={q.question_type==='MSQ'?'checkbox':'radio'} name={`question-${q.id}`} checked={isSelected} onChange={()=>change(toggleResponse(draft.answers[q.id],i+1,q.question_type==='MSQ'))} onClick={(event)=>{if(q.question_type!=='MSQ'&&isSelected){event.preventDefault();change(toggleResponse(draft.answers[q.id],i+1,false));}}} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-primary"/><span className="min-w-0 flex-1">{isMatchCodeOption(option)?<MatchOption text={option}/>:<MathText text={option}/>}</span></label>{q.option_images[i] && <div className="px-4 pb-4"><QuestionFigure image={q.option_images[i]} inline/></div>}</div>;})}
            </>}</fieldset>
            <button type="button" className="min-h-11 text-sm underline" disabled={finished || remaining===0 || busy} onClick={()=>change(null)}>Clear answer</button>
          </section>
          <Button variant="outline" className="min-h-11 w-full" aria-expanded={calculator} aria-controls="challenge-calculator" onClick={()=>setCalculator(v=>!v)}>{calculator?'Hide':'Open'} virtual calculator</Button>
          <div id="challenge-calculator" hidden={!calculator}><GateCalculator examMode/></div>
          <div className="flex justify-between gap-3"><Button variant="outline" disabled={draft.currentIndex===0 || finished || busy} onClick={()=>persist({...draft,currentIndex:draft.currentIndex-1})}>Previous</Button>{draft.currentIndex<4 && !finished ? <Button onClick={()=>persist({...draft,currentIndex:draft.currentIndex+1})}>Next →</Button> : <Button disabled={busy} onClick={()=>void finish()}>{busy?'Saving…':finished?'Retry saving':'Submit test'}</Button>}</div>
          <p className="text-xs text-muted-foreground">The timer keeps running when you leave this page. {storage?'Answers are saved on this device.':'Device storage is blocked. Keep this tab open until you submit.'}</p>
        </>}
      {error && <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm">{error}</p>}
      {finished && <Button variant="outline" className="w-full" onClick={()=>sheet.current?.showModal()}>Continue to your result</Button>}
    </div>
    {finished && <dialog ref={sheet} aria-labelledby="challenge-finish-title" className="fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none rounded-t-3xl border bg-background p-6 text-foreground shadow-2xl backdrop:bg-black/60 sm:inset-0 sm:m-auto sm:max-w-md sm:rounded-2xl"><div className="mx-auto max-w-md space-y-5 pb-[env(safe-area-inset-bottom)]">
      <p className="text-xs font-semibold tracking-widest text-primary">FINISH LINE</p><h2 id="challenge-finish-title" className="text-2xl font-bold">Sprint completed!</h2><p className="text-sm leading-relaxed text-muted-foreground">See how your score matches up against {c.creatorName}. Continue with Google to save your result.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="min-h-12 w-full" disabled={busy} onClick={()=>void login()}>{busy?'Saving your answers…':'Continue with Google'}</Button>
      {recovery && <p className="text-xs leading-relaxed text-muted-foreground">If Google cannot open inside WhatsApp or Telegram, copy your recovery link, open it in your regular browser, and continue there. Your submitted answers are kept for 30 minutes.</p>}
      {recovery && <input aria-label="Private recovery link — do not share" className="w-full rounded-md border bg-background p-2 text-xs" readOnly value={typeof window!=='undefined'?`${window.location.origin}/c/${c.id}#resume=${recovery}`:''} onFocus={e=>e.target.select()}/>}
      <button type="button" className="min-h-11 text-sm underline" disabled={busy} onClick={()=>{sheet.current?.close(); void start();}}>Start a fresh attempt</button>
    </div></dialog>}
  </main>;
}
