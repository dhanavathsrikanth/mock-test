"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check } from 'lucide-react';

export function ShareChallenge({ sessionId }: { sessionId: string }) {
  const [url,setUrl] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [copied,setCopied] = useState(false);
  async function share() {
    setBusy(true); setError('');
    try {
      let link = url;
      if (!link) {
        const response = await fetch('/api/challenges', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ sessionId }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        link = new URL(body.path,window.location.origin).href; setUrl(link);
      }
      if (navigator.share) {
        try { await navigator.share({ title:'Can you beat my sprint score?', text:'Same 5 questions. Take my challenge!', url:link }); }
        catch (err) { if (!(err instanceof Error && err.name === 'AbortError')) setError('Choose a sharing option below.'); }
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create the challenge. Please retry.'); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    catch { setError('Select and copy the link below.'); }
  }
  const text='Same 5 questions. Can you beat my sprint score?';
  return <section className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-5" aria-label="Share a challenge">
    <div><h2 className="font-semibold">Put your score to the test.</h2><p className="mt-1 text-sm text-muted-foreground">Challenge a classmate to your exact five questions. They can start as a guest.</p></div>
    <Button className="min-h-11 w-full" disabled={busy} onClick={share}><Share2 className="mr-2 h-4 w-4" />{busy ? 'Preparing your challenge…' : 'Challenge a classmate'}</Button>
    {url && <><input aria-label="Challenge link" className="w-full rounded-md border bg-background p-2 text-xs" readOnly value={url} onFocus={e=>e.target.select()} />
      <div className="flex flex-wrap items-center gap-4 text-sm"><button type="button" onClick={copy} className="inline-flex min-h-11 items-center gap-1 underline">{copied ? <Check size={15}/> : <Copy size={15}/>}{copied ? 'Copied' : 'Copy link'}</button>
      <a target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} className="min-h-11 content-center underline">WhatsApp</a>
      <a target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`} className="min-h-11 content-center underline">Telegram</a></div></>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
