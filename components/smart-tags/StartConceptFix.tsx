'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { startConceptFix } from '@/app/(dashboard)/practice/concept/actions';

export function StartConceptFix({ subjectId, concept, count }: { subjectId: string; concept: string; count: number }) {
  const router = useRouter();
  const [requestId] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function start() {
    if (pending) return;
    setPending(true); setError('');
    try {
      const result = await startConceptFix(subjectId, concept, requestId);
      if ('error' in result) { setError(result.error); setPending(false); }
      else router.push(`/test/${result.sessionId}`);
    } catch { setError('Unable to start concept practice. Please retry.'); setPending(false); }
  }
  return <div className="space-y-3">{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button onClick={start} disabled={pending} aria-busy={pending} className="min-h-11 w-full sm:w-auto">{pending ? 'Starting…' : `Start ${count}-question concept fix`}</Button>
  </div>;
}
