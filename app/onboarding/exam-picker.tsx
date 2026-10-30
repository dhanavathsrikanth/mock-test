"use client";

import { useActionState, useState } from "react";
import type { ExamStream } from "@/lib/stream-scope";
import { selectExam } from "./actions";
import { Button } from "@/components/ui/button";

export function ExamPicker({ exams, streams, selectedId, selectedStreamId }: {
  exams: { id: string; name: string; full_name: string; category: string; requires_stream: boolean }[];
  streams: ExamStream[];
  selectedId?: string;
  selectedStreamId?: string;
}) {
  const [examId, setExamId] = useState(selectedId || '');
  const [streamId, setStreamId] = useState(selectedStreamId || '');
  const selected = exams.find(exam => exam.id === examId);
  const [state, action, pending] = useActionState(
    async (_state: { error: string } | undefined, formData: FormData) => selectExam(formData), undefined,
  );
  return <form action={action} className="space-y-5">
    <fieldset disabled={pending} className="space-y-3">
      <legend className="sr-only">Select your exam</legend>
      {exams.map(exam => <label key={exam.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
        <input type="radio" name="examId" value={exam.id} checked={exam.id === examId} onChange={() => { setExamId(exam.id); setStreamId(''); }} required className="mt-1 accent-primary" />
        <span><span className="block font-semibold">{exam.name}</span><span className="block text-sm text-muted-foreground">{exam.full_name}</span><span className="text-xs text-muted-foreground">{exam.category}</span></span>
      </label>)}
    </fieldset>
    {selected?.requires_stream && <fieldset disabled={pending} className="space-y-3">
      <legend className="mb-2 text-lg font-semibold">Choose your stream</legend>
      <p className="text-sm text-muted-foreground">Your subjects, tests and practice questions will follow this stream. Papers and shifts are selected when starting a test.</p>
      <label htmlFor="streamId" className="sr-only">Stream</label>
      <select id="streamId" name="streamId" required value={streamId} onChange={event => setStreamId(event.target.value)} className="h-12 w-full rounded-lg border bg-background px-3 text-sm">
        <option value="">Select a stream</option>
        {streams.filter(stream => stream.exam_id === examId).map(stream => <option key={stream.id} value={stream.id}>{stream.name} ({stream.code})</option>)}
      </select>
    </fieldset>}
    {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    <Button className="w-full" disabled={pending || !selected || (selected.requires_stream && !streamId)}>{pending ? "Saving…" : "Continue"}</Button>
  </form>;
}
