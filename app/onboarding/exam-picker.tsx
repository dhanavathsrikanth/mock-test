"use client";

import { useActionState, useState } from "react";
import type { ExamStream } from "@/lib/stream-scope";
import { selectExam } from "./actions";
import { Button } from "@/components/ui/button";
import { availabilityScope, describeYears, type ContentAvailability } from "@/lib/content-availability";

export function ExamPicker({ exams, streams, availability, selectedId, selectedStreamId }: {
  exams: { id: string; name: string; full_name: string; category: string; requires_stream: boolean }[];
  streams: ExamStream[];
  availability: Record<string, ContentAvailability>;
  selectedId?: string;
  selectedStreamId?: string;
}) {
  const [examId, setExamId] = useState(selectedId || '');
  const [streamId, setStreamId] = useState(selectedStreamId || '');
  const selected = exams.find(exam => exam.id === examId);
  const currentAvailability = selected ? availability[availabilityScope(selected.id, selected.requires_stream ? streamId : null)] : undefined;
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
        {streams.filter(stream => stream.exam_id === examId).map(stream => {
          const content = availability[availabilityScope(examId, stream.id)];
          return <option key={stream.id} value={stream.id}>{stream.name} ({stream.code}) · {content?.questionCount ? `${content.questionCount} questions` : 'No questions yet'}</option>;
        })}
      </select>
    </fieldset>}
    {selected && (!selected.requires_stream || streamId) && <div aria-live="polite" className="rounded-lg border bg-muted/20 p-4 text-sm">
      {currentAvailability?.questionCount ? <>
        <p className="font-medium">{currentAvailability.questionCount} questions available · {currentAvailability.paperCount} source {currentAvailability.paperCount === 1 ? 'paper' : 'papers'}</p>
        <p className="mt-1 text-muted-foreground">{describeYears(currentAvailability.years)}. Choose a specific paper when starting practice.</p>
      </> : <p>No questions have been added for this selection yet. You can save this selection or choose another stream to practise now.</p>}
    </div>}
    {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    <Button className="w-full" disabled={pending || !selected || (selected.requires_stream && !streamId)}>{pending ? "Saving…" : "Continue"}</Button>
  </form>;
}
