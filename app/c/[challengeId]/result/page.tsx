import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getChallenge } from '@/lib/challenge-server';
import { challengeTime, validTurn, type ChallengeResult } from '@/lib/challenges';
import { formatMarks } from '@/lib/marking';
import { ShareChallenge } from '@/components/challenges/ShareChallenge';
import { MathText } from '@/components/MathText';

export const dynamic = 'force-dynamic';
export const metadata = { title:'Challenge scoreboard', robots:{index:false,follow:false}, referrer:'no-referrer' as const };
export default async function ChallengeResultPage({ params, searchParams }: { params:Promise<{challengeId:string}>; searchParams:Promise<{session?:string}> }) {
  const { challengeId } = await params;
  const { session } = await searchParams;
  if (!session || !validTurn(session)) notFound();
  const db = await createClient();
  const { data:{user} } = await db.auth.getUser();
  if (!user) redirect(`/c/${challengeId}`);
  const c = await getChallenge(challengeId);
  if (!c) notFound();
  const { data, error } = await db.rpc('challenge_result', { p_id:challengeId, p_session:session });
  if (error) throw new Error('Unable to load your comparison. Please refresh.');
  if (!data) notFound();
  const r = data as ChallengeResult;
  const outcome = r.result.net>c.creatorScore ? 'You beat the challenge score!' : r.result.net===c.creatorScore ? 'A match on marks!' : 'A strong reason for a rematch.';
  return <main className="min-h-dvh bg-background px-4 py-8 text-foreground"><div className="mx-auto max-w-2xl space-y-6">
    <p className="text-xs font-semibold tracking-[0.2em] text-primary">CLASSMATE CHALLENGE · COMPLETE</p>
    <h1 className="text-3xl font-bold tracking-tight">{outcome}</h1><p className="text-sm text-muted-foreground">{c.label} · Same five questions, same marking.</p>
    <section aria-label="Challenge scoreboard" className="grid grid-cols-2 overflow-hidden rounded-2xl border bg-card">
      {[{name:c.creatorName,score:c.creatorScore,time:c.creatorSeconds,you:false},{name:'You',score:r.result.net,time:r.seconds,you:true}].map(p=><div key={p.name+(p.you?'you':'creator')} className={`min-w-0 p-5 text-center sm:p-8 ${p.you?'border-l bg-primary/5':''}`}>
        <p className="truncate text-sm font-semibold">{p.name}</p><p className="my-4 text-4xl font-bold tabular-nums sm:text-5xl">{formatMarks(p.score)}</p><p className="text-xs text-muted-foreground">/ {formatMarks(c.maximum)} marks</p><p className="mt-4 font-mono text-sm">{challengeTime(p.time)}</p></div>)}
    </section>
    <p className="text-center text-sm text-muted-foreground">{r.result.correct} correct · {r.result.wrong} incorrect · {r.result.skipped} skipped · {r.result.accuracy}% accuracy</p>
    {r.sharedMistakes.length>0 && <aside className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5"><h2 className="font-semibold">A shared sticking point</h2><p className="mt-2 text-sm">You and {c.creatorName} both missed {r.sharedMistakes.map(n=>`Q${n}`).join(', ')}. Revisit {r.sharedMistakes.length===1?'this question':'these questions'} before your next sprint.</p></aside>}
    <section className="space-y-4"><div><h2 className="text-xl font-semibold">Your sprint, explained</h2><p className="mt-1 text-sm text-muted-foreground">Solutions are free. Your missed questions are saved to your revision queue.</p></div>{r.solutions.map(s=><article key={s.number} className="rounded-xl border bg-card p-5"><h3 className="mb-3 font-semibold">Question {s.number}</h3><MathText text={s.explanation || 'A detailed explanation is not available for this question yet.'}/></article>)}</section>
    <ShareChallenge sessionId={session}/>
    <div className="flex justify-between text-sm"><Link href="/practice" className="underline">Practice another sprint</Link><Link href="/revision" className="underline">Open revision queue</Link></div>
  </div></main>;
}
