import Link from 'next/link';
import { requireExamContext } from '@/lib/exam-context';
import { getConceptFixPool } from '@/lib/concept-fix-server';
import { StartConceptFix } from '@/components/smart-tags/StartConceptFix';
import { conceptKey } from '@/lib/smart-tags';

export const metadata = { title: 'Concept fix | Exam Prep' };
export default async function ConceptFixPage({ searchParams }: { searchParams: Promise<{ subject?: string; concept?: string }> }) {
  const { exam, stream } = await requireExamContext();
  const { subject, concept } = await searchParams;
  let count = 0, label = '', failure = '';
  if (typeof subject !== 'string' || !/^[0-9a-f-]{36}$/i.test(subject) || typeof concept !== 'string' || concept.trim().length < 2 || concept.length > 80)
    failure = 'Choose a concept from your dashboard or test results.';
  else try {
    const pool = await getConceptFixPool(exam.id, stream?.id ?? null, subject, concept);
    count = Math.min(3, pool.length);
    label = pool[0]?.core_concepts.find(t => conceptKey(t) === conceptKey(concept)) ?? concept;
    if (!count) failure = 'No reviewed questions are available for this concept in your current stream yet.';
  } catch { failure = 'Concept questions could not load. Refresh to retry, or open Quick Practice.'; }
  return <main className="mx-auto max-w-xl space-y-5 py-6">
    <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">← Back to dashboard</Link>
    <div><p className="text-sm text-muted-foreground">{stream?.name ?? exam.name}</p><h1 className="mt-1 text-2xl font-semibold">Concept fix</h1></div>
    {failure ? <div className="space-y-3 rounded-xl border p-5"><p role="status">{failure}</p><Link href="/practice" className="inline-flex min-h-11 items-center text-primary hover:underline">Open Quick Practice</Link></div>
      : <section className="space-y-4 rounded-xl border bg-card p-5"><h2 className="break-words text-xl font-semibold">{label}</h2>
        <p className="text-sm">{count} {count === 1 ? 'question' : 'questions'} · 10-minute limit · MCQ, MSQ or NAT as available</p>
        <p className="text-sm text-muted-foreground">We choose reviewed questions for this concept, preferring ones outside your last three completed sessions. You may see a question again when the pool is small. The timer continues if you leave the page.</p>
        {count < 3 && <p className="text-sm text-muted-foreground">Only {count} matching {count === 1 ? 'question is' : 'questions are'} available. We will use these without adding unrelated questions.</p>}
        <StartConceptFix subjectId={subject!} concept={concept!} count={count} />
      </section>}
  </main>;
}
