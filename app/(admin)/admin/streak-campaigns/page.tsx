"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { milestoneCopy } from '@/lib/engagement/rules';

type Campaign={id:string;name:string;exam_id:string;stream_id:string|null;enabled:boolean};
type Setup={campaigns:Campaign[];exams:{id:string;name:string}[];streams:{id:string;exam_id:string;name:string}[];
  jobs:{id:string;campaign_id:string;milestone:number;channel:string;status:string;attempts:number;last_error:string|null;delivered_at:string|null}[];
  workerEnabled:boolean;emailReady:boolean;pushReady:boolean;promotionsEnabled:boolean};
export default function StreakCampaignPage() {
  const [data,setData]=useState<Setup|null>(null); const [error,setError]=useState('');
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
  const [name,setName]=useState(''); const [examId,setExam]=useState(''); const [streamId,setStream]=useState('');
  async function load() {
    setLoading(true); setError('');
    try {
      const response=await fetch('/api/admin/streak-campaigns',{cache:'no-store'}); const json=await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to load campaigns');
      setData(json);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load campaigns'); }
    finally { setLoading(false); }
  }
  useEffect(()=>{void load();},[]);
  async function mutate(body: Record<string,unknown>) {
    if (saving) return; setSaving(true); setError('');
    try {
      const response=await fetch('/api/admin/streak-campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const json=await response.json(); if (!response.ok) throw new Error(json.error || 'Unable to save campaign');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save campaign'); }
    finally { setSaving(false); }
  }
  function create(event:FormEvent) {event.preventDefault();void mutate({action:'create',name,examId,streamId:streamId||null});}
  return <div className="mx-auto max-w-4xl space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Streak campaigns</h1><p className="mt-1 text-sm text-muted-foreground">Celebrate 5- and 7-day milestones with opted-in students.</p></div><Button variant="outline" disabled={loading || saving} onClick={load}>Refresh</Button></header>
    <p className="rounded-xl border bg-muted/30 p-4 text-sm">Payment integration is deferred. Discount offers and checkout messages are disabled. These campaigns send milestone encouragement only.</p>
    {error && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm">{error}</p>}
    {loading && !data && <p role="status">Loading campaign setup…</p>}
    {data && <>
      <div className="grid gap-3 sm:grid-cols-3">{[['Worker',data.workerEnabled],['Email configured',data.emailReady],['Push configured',data.pushReady]].map(([label,enabled])=><div key={String(label)} className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{enabled?'Enabled':'Not configured'}</p></div>)}</div>
      <section className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">Message preview</h2><div className="grid gap-3 sm:grid-cols-2">{([5,7] as const).map(day=>{const copy=milestoneCopy(day);return <div key={day} className="rounded-lg bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Day {day}</p><h3 className="mt-1 font-medium">{copy.title}</h3><p className="mt-2 text-sm text-muted-foreground">{copy.message}</p></div>;})}</div><p className="text-xs text-muted-foreground">One message per student, campaign, and milestone. Channel selection and explicit opt-in are controlled in the student’s profile. No retrospective sends to students who already passed a milestone.</p></section>
      <form onSubmit={create} className="space-y-4 rounded-xl border p-4"><h2 className="font-semibold">Create a disabled campaign</h2><fieldset disabled={saving} className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Internal name<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" /></label><label className="text-sm">Exam<select required value={examId} onChange={e=>{setExam(e.target.value);setStream('');}} className="mt-1 h-11 w-full rounded-lg border bg-background px-3"><option value="">Choose exam</option>{data.exams.map(exam=><option key={exam.id} value={exam.id}>{exam.name}</option>)}</select></label><label className="text-sm">Stream<select value={streamId} onChange={e=>setStream(e.target.value)} disabled={!examId} className="mt-1 h-11 w-full rounded-lg border bg-background px-3"><option value="">All streams in this exam</option>{data.streams.filter(stream=>stream.exam_id===examId).map(stream=><option key={stream.id} value={stream.id}>{stream.name}</option>)}</select></label></fieldset><Button disabled={saving || !examId || !name.trim()}>Create campaign</Button></form>
      <section className="space-y-3"><h2 className="font-semibold">Campaigns</h2>{!data.campaigns.length && <p className="text-sm text-muted-foreground">No campaigns yet. Creating one leaves it disabled until you enable it.</p>}{data.campaigns.map(campaign=><div key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div><p className="font-medium">{campaign.name}</p><p className="text-xs text-muted-foreground">{data.exams.find(exam=>exam.id===campaign.exam_id)?.name} · {data.streams.find(stream=>stream.id===campaign.stream_id)?.name ?? 'All streams'} · {campaign.enabled?'Enabled':'Disabled'}</p></div><Button variant={campaign.enabled?'outline':'default'} disabled={saving || (!data.workerEnabled && !campaign.enabled)} onClick={()=>mutate({action:'toggle',id:campaign.id,enabled:!campaign.enabled})}>{campaign.enabled?'Disable':'Enable'}</Button></div>)}</section>
      <section className="space-y-3"><h2 className="font-semibold">Latest 20 delivery jobs</h2>{!data.jobs.length && <p className="text-sm text-muted-foreground">Jobs appear when an opted-in student reaches a milestone in an enabled campaign.</p>}{data.jobs.map(job=><div key={job.id} className="rounded-lg border p-3 text-sm"><p>Day {job.milestone} · {job.channel} · <strong>{job.status}</strong> · {job.attempts} attempts</p>{job.last_error && <p className="mt-1 text-xs text-muted-foreground">{job.last_error}</p>}</div>)}</section>
    </>}
  </div>;
}
