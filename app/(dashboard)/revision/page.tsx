"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, CheckCircle2, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { QuestionFigure } from "@/components/QuestionFigure";
import { QuestionExplanation } from "@/components/QuestionExplanation";
import { MathText } from "@/components/MathText";
import { MatchingQuestion } from "@/components/MatchingQuestion";
import { MatchOption } from "@/components/MatchOption";
import { isMatchingQuestion, isMatchCodeOption } from "@/lib/matching-question-utils";
import { GateCalculator } from "@/components/calculator/GateCalculator";
import { multipleAnswerLabel, numericAnswerLabel } from "@/lib/question-response";
import { DAILY_REVISION_CAP, REVISION_INTERVALS, type RevisionQueue } from "@/lib/revision";

export default function RevisionPage() {
  const [queue, setQueue] = useState<RevisionQueue | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [calculator, setCalculator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/srs?action=due", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load revision.");
      setQueue(data); setIndex(0); setRevealed(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load revision. Please retry."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function rate(result: "correct" | "wrong") {
    if (busy.current || !queue || !revealed || !queue.questions[index]) return;
    busy.current = true; setSaving(true); setError("");
    try {
      const response = await fetch("/api/srs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer", questionId: queue.questions[index].question.id, result, reviewDate: queue.reviewDate }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save review.");
      setQueue(previous => previous && ({ ...previous, summary: { ...previous.summary,
        completedCount: previous.summary.completedCount + 1, dueCount: Math.max(0, previous.summary.dueCount - 1),
        xpEarned: data.xpEarned, queueComplete: data.queueComplete } }));
      setNotice(data.alreadySaved ? "This review was already saved in another tab." : data.mastered ? "Mastered! This question has graduated from revision." :
        `Saved · Stage ${data.stage} · Review in ${REVISION_INTERVALS[data.stage - 1]} days · +${data.xpAwarded} XP`);
      setIndex(value => value + 1); setRevealed(false);
      window.scrollTo({ top: 0, behavior: "instant" });
      requestAnimationFrame(() => heading.current?.focus());
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save review. Please retry."); }
    finally { busy.current = false; setSaving(false); }
  }

  if (loading) return <div className="mx-auto max-w-2xl py-8" role="status"><div className="h-72 animate-pulse rounded-xl bg-muted" /><p className="mt-4 text-sm text-muted-foreground">Preparing your revision queue…</p></div>;
  if (!queue) return <div className="mx-auto max-w-lg space-y-4 py-12"><p role="alert">{error}</p><Button onClick={load}>Retry loading revision</Button></div>;

  const current = queue.questions[index];
  const summary = queue.summary;
  const complete = !current && summary.queueComplete;
  const q = current?.question;
  return <main className="mx-auto max-w-2xl space-y-5 py-4 sm:py-8">
    <div className="flex items-center justify-between gap-3">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
      <span className="text-xs text-muted-foreground">At most {DAILY_REVISION_CAP} questions a day</span>
    </div>
    <header className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Recall · Derive · Remember</p>
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">{complete ? "Today’s revision complete" : "Today’s revision queue"}</h1>
      <p className="text-sm text-muted-foreground">{current ? "Work it out on paper, then reveal the answer and check your reasoning." : complete ? "Your study streak is maintained. Come back tomorrow for your next reviews." : "New mistakes and bookmarked questions begin here after one day."}</p>
    </header>
    {notice && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">{notice}</p>}
    {error && <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 p-3 text-sm"><p>{error}</p><Button variant="outline" size="sm" disabled={saving} onClick={load}>Reload queue</Button></div>}
    {summary.totalCount > 0 && <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground"><span>{summary.completedCount} of {summary.totalCount} reviewed</span><span>{summary.xpEarned} XP earned</span></div>
      <div role="progressbar" aria-label="Daily revision progress" aria-valuenow={summary.completedCount} aria-valuemin={0} aria-valuemax={summary.totalCount} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${summary.completedCount / summary.totalCount * 100}%` }} /></div>
    </div>}
    {!current && <Card><CardContent className="flex flex-col items-center gap-4 p-8 text-center">
      <CheckCircle2 className="h-12 w-12 text-emerald-600" />
      <h2 className="text-xl font-semibold">{complete ? "A little stronger, every day." : summary.deferredCount ? "Daily limit reached" : "Nothing due today"}</h2>
      {complete && <p className="text-sm">{summary.completedCount} questions reviewed · {summary.xpEarned} XP saved</p>}
      <p className="text-sm text-muted-foreground">{summary.deferredCount > 0 ? `${summary.deferredCount} other due questions will carry forward. Keep today manageable.` : "We’ll bring back the right questions at the right time."}</p>
      <Button asChild><Link href="/test/select">Continue practicing</Link></Button>
    </CardContent></Card>}
    {current && q && <>
      <ol aria-label="Revision stages" className="grid grid-cols-5 gap-1 rounded-xl border p-2">
        {REVISION_INTERVALS.map((days, i) => <li key={days} aria-current={current.stage === i + 1 ? "step" : undefined} className={`rounded-lg px-1 py-2 text-center ${current.stage === i + 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><span className="block text-[10px] sm:text-xs">Stage {i + 1}</span><span className="text-sm font-semibold">{days}d</span></li>)}
      </ol>
      <Card><CardContent className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2"><Badge variant="secondary">{q.question_type}</Badge>{q.year && <Badge variant="outline">GATE {q.year}</Badge>}<Badge variant="outline">Stage {current.stage} / 5</Badge></div>
        {isMatchingQuestion(q.question_text) ? <><MatchingQuestion text={q.question_text} />{q.image_url && <QuestionFigure image={{ url: q.image_url, width: q.image_width, height: q.image_height }} />}</> : <QuestionPrompt text={q.question_text} image={q.image_url ? { url: q.image_url, width: q.image_width, height: q.image_height } : undefined} />}
        <Button variant="outline" className="min-h-11 w-full" onClick={() => setCalculator(value => !value)} aria-expanded={calculator} aria-controls="revision-calculator"><Calculator className="mr-2 h-4 w-4" />{calculator ? "Hide calculator" : "Open virtual calculator"}</Button>
        <div id="revision-calculator" hidden={!calculator}><GateCalculator examMode /></div>
        {!revealed ? <Button size="lg" className="min-h-14 w-full whitespace-normal" onClick={() => setRevealed(true)}><Eye className="mr-2 h-4 w-4" />Reveal Answer &amp; Derivation</Button> : <div className="space-y-5">
          <section aria-label="Answer and derivation" className="space-y-3">
            <h2 className="text-sm font-semibold">Answer &amp; derivation</h2>
            {q.question_type === "NAT" ? <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm font-medium">{numericAnswerLabel(q.answer_min, q.answer_max, q.answer_ranges)}</p> : <>
              {q.correct_option_sets && <p className="text-sm font-medium">{multipleAnswerLabel(q.correct_option_sets)}</p>}
              <div className="space-y-2">{[q.option_1, q.option_2, q.option_3, q.option_4].map((option, i) => {
                const correct = q.correct_option_sets ? q.correct_option_sets.some(set => set.includes(i + 1)) : q.question_type === "MSQ" ? q.correct_options?.includes(i + 1) : q.correct_option === i + 1;
                return <div key={i} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${correct ? "border-emerald-500/50 bg-emerald-500/5" : ""}`}><span className="shrink-0 font-semibold">{String.fromCharCode(65 + i)}{correct && <span className="sr-only"> (correct)</span>}</span><div className="min-w-0 flex-1">{isMatchCodeOption(option || "") ? <MatchOption text={option || ""} /> : <MathText text={option || ""} />}{q.option_images?.[i] && <QuestionFigure image={q.option_images[i]} inline />}</div>{correct && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}</div>;
              })}</div>
            </>}
            {q.explanation ? <QuestionExplanation text={q.explanation} /> : <p className="text-sm text-muted-foreground">A detailed derivation isn’t available for this question yet. Use the answer key to check your work.</p>}
          </section>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button variant="outline" disabled={saving} onClick={() => rate("wrong")} className="min-h-16 flex-col whitespace-normal border-red-500/40 text-red-700 dark:text-red-300"><span>Got it Wrong / Confused</span><span className="text-xs font-normal">Stage 1 · Tomorrow · +5 XP</span></Button>
            <Button disabled={saving} onClick={() => rate("correct")} className="min-h-16 flex-col whitespace-normal bg-emerald-700 text-white hover:bg-emerald-800"><span>Solved it Easily</span><span className="text-xs font-normal">{current.stage === 5 ? "Master this question" : `Stage ${current.stage + 1} · In ${REVISION_INTERVALS[current.stage]} days`} · +10 XP</span></Button>
          </div>
          {saving && <p role="status" className="text-center text-xs text-muted-foreground">Saving your review…</p>}
        </div>}
      </CardContent></Card>
      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><RotateCcw className="h-3 w-3" />Mistakes return tomorrow. Progress is saved after every review.</p>
    </>}
  </main>;
}
