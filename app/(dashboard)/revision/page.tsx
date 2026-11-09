"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, CheckCircle2, Eye, RotateCcw, Sparkles, BookOpen, ChevronLeft, ChevronRight, Play, Bookmark, Layers, Clock, CalendarDays, ArrowUpRight, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from '@/components/workspace/PageHeading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { DAILY_REVISION_CAP, REVISION_INTERVALS, type RevisionQueue, type RevisionQuestion } from "@/lib/revision";
import styles from "./revision.module.css";
import type { DeckInfo } from "@/lib/srs";

export default function RevisionPage() {
  const [queue, setQueue] = useState<RevisionQueue | null>(null);
  const [deck, setDeck] = useState<DeckInfo | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [calculator, setCalculator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [srsUnavailable, setSrsUnavailable] = useState(false);
  const busy = useRef(false);
  const heading = useRef<HTMLDivElement>(null);
  const reviewPanel = useRef<HTMLDivElement>(null);

  // Self-paced deck practice state
  const [studyAhead, setStudyAhead] = useState(false);
  const [deckIndex, setDeckIndex] = useState(0);
  const [deckRevealed, setDeckRevealed] = useState(false);
  const [deckSelectedOptions, setDeckSelectedOptions] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const [dueRes, deckRes] = await Promise.all([
        fetch("/api/srs?action=due", { cache: "no-store" }).catch(() => null),
        fetch("/api/srs?action=deck", { cache: "no-store" }).catch(() => null),
      ]);
      let dueData: RevisionQueue | null = null;
      if (dueRes && dueRes.ok) {
        dueData = await dueRes.json();
      }

      let deckData: DeckInfo | null = null;
      if (deckRes && deckRes.ok) {
        deckData = await deckRes.json();
        setDeck(deckData);
        setSrsUnavailable(Boolean(deckData?.srsSelectFailed));
        if (deckData?.srsSelectFailed) {
          setSrsUnavailable(true);
          setNotice("Spaced-repetition items are temporarily hidden while we fix a data permission issue. Your wrong answers and bookmarks are still available below.");
        }
      }

      if (dueData) {
        setQueue(dueData); setIndex(0); setRevealed(false); setSelectedOptions([]);
      } else if (deckData && deckData.questions.length > 0) {
        const fallbackQuestions: RevisionQuestion[] = deckData.questions.slice(0, DAILY_REVISION_CAP).map(q => ({
          id: q.id,
          stage: q.stage,
          question: q.question,
        }));
        setQueue({
          reviewDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()),
          questions: fallbackQuestions,
          summary: {
            dueCount: fallbackQuestions.length,
            deferredCount: Math.max(0, deckData.totalCount - fallbackQuestions.length),
            completedCount: 0,
            dailyCap: DAILY_REVISION_CAP,
            totalCount: fallbackQuestions.length,
            xpEarned: 0,
            queueComplete: fallbackQuestions.length === 0,
          },
        });
        setIndex(0); setRevealed(false); setSelectedOptions([]);
      } else {
        const errJson = dueRes ? await dueRes.json().catch(() => null) : null;
        throw new Error(errJson?.error || "Unable to load revision. Please retry.");
      }
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
      setIndex(value => value + 1); setRevealed(false); setSelectedOptions([]);
      window.scrollTo({ top: 0, behavior: "instant" });
      requestAnimationFrame(() => heading.current?.focus());
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save review. Please retry."); }
    finally { busy.current = false; setSaving(false); }
  }

  async function handleImportMistakes() {
    setImporting(true);
    try {
      const res = await fetch("/api/srs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enroll-all-mistakes" }),
      });
      if (res.ok) {
        setNotice("All test mistakes and bookmarks have been added to your Spaced Repetition deck!");
        await load();
      } else {
        setError("Unable to import mistakes. Please try again.");
      }
    } catch {
      setError("Unable to import mistakes right now.");
    } finally {
      setImporting(false);
    }
  }

  if (loading) return (
    <div className={styles.workspace} role="status" aria-label="Loading revision">
      <div className={styles.loading}><div className={styles.skeleton} /><div className={styles.skeleton} style={{ height: 110 }} /></div>
      <p className="text-sm text-muted-foreground">Preparing your revision workspace…</p>
    </div>
  );

  if (!queue) return (
    <div className="mx-auto w-full max-w-2xl space-y-6 py-6">
      <PageHeading title="Revision" icon={<BookOpen />} description="Bring past mistakes back into focus, one question at a time." />
      <Card className="rounded-2xl border border-border bg-card shadow-sm  dark:border-border dark:bg-card">
        <CardContent className="space-y-4 p-6">
          <p role="alert" className="text-sm text-muted-foreground">{error}</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={load}>Retry loading revision</Button>
            <Button asChild variant="outline"><Link href="/practice">Try a 5-Q Sprint</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const current = queue.questions[index];
  const summary = queue.summary;
  const complete = !current && summary.queueComplete;
  const q = current?.question;

  const deckQuestions = deck?.questions || [];
  const activeDeckQ = deckQuestions[deckIndex]?.question;
  const progress = summary.totalCount ? Math.min(100, Math.round(summary.completedCount / summary.totalCount * 100)) : 0;
  const stageNames = ["First recall", "Reinforce", "Strengthen", "Retain", "Final recall"];
  const stageTotal = Object.values(deck?.stageCounts || {}).reduce((sum, count) => sum + count, 0);
  const reviewDateLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(queue.reviewDate + "T12:00:00+05:30"));

  return (
    <section className={styles.workspace}>
      <div className={styles.topline}>
        <Link href="/dashboard" className={styles.back}><ArrowLeft size={15} /> Your workspace</Link>
        <span className={styles.day}><CalendarDays size={14} /> {reviewDateLabel} <span aria-hidden="true">·</span> India time</span>
      </div>
      <div className={styles.hero} ref={heading} tabIndex={-1}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><BookOpen size={15} /> Revision studio</span>
          <h1>{complete ? "Today’s effort. Lasting recall." : "Make what you learn stay with you."}</h1>
          <p className={styles.description}>{current ? "Your next review is ready. Recall it first, check your reasoning, then move one step closer to mastery." : complete ? "Your daily reviews are saved. Give your memory a break, or explore your deck at your own pace." : "Turn past mistakes into familiar territory. A little recall today makes the next exam feel different."}</p>
          <span className={styles.heroNote}><Clock size={14} /> Up to {DAILY_REVISION_CAP} questions a day. One focused session.</span>
        </div>
        <div className={styles.session}>
          <div className={styles.sessionTop}>
            <div className={styles.ring} aria-label={progress + "% of daily revision completed"}>
              <svg viewBox="0 0 88 88" aria-hidden="true"><circle className={styles.ringTrack} cx="44" cy="44" r="37" /><circle className={styles.ringFill} cx="44" cy="44" r="37" strokeDasharray="232.48" strokeDashoffset={232.48 * (1 - progress / 100)} /></svg>
              <strong>{complete ? <CheckCircle2 size={28} /> : progress + "%"}</strong>
            </div>
            <div><h2>{complete ? "Session complete" : current ? "Your daily session" : "You’re up to date"}</h2><p>{summary.completedCount} of {summary.totalCount} reviewed</p><p>{summary.xpEarned} XP earned</p></div>
          </div>
          {current ? <button className={styles.sessionAction} onClick={() => { reviewPanel.current?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }); reviewPanel.current?.focus({ preventScroll: true }); }}>Continue revision <ArrowUpRight size={16} /></button> : <Link className={styles.sessionAction} href="/practice">Try a 5-Q Sprint <ArrowUpRight size={16} /></Link>}
        </div>
      </div>
      <div className={styles.metrics} aria-label="Revision overview">
        {[{ label: "Due today", value: summary.dueCount, icon: Clock }, { label: "In your deck", value: deck?.totalCount ?? "—", icon: Layers }, { label: "Mastered", value: deck?.srsSelectFailed ? "—" : deck?.masteredCount ?? "—", icon: Trophy }, { label: "Session XP", value: summary.xpEarned, icon: Sparkles }].map(({label, value, icon: Icon}) => <div className={styles.metric} key={label}><span className={styles.metricLabel}><Icon size={15} />{label}</span><strong>{value}</strong></div>)}
      </div>
      <section className={styles.path} aria-label="Your recall journey">
        <div className={styles.sectionTitle}><div><h2>From first recall to second nature</h2><p>Five stages. More space between reviews as your memory strengthens.</p></div><span className={styles.pathLegend}>Your recall journey</span></div>
        <ol className={styles.stages}>
          {REVISION_INTERVALS.map((days, i) => { const count = deck?.stageCounts?.[i + 1] || 0; return <li className={styles.stage} data-active={current?.stage === i + 1} aria-current={current?.stage === i + 1 ? "step" : undefined} key={days}>
            <div className={styles.stageTop}><span className={styles.stageNumber}>0{i + 1}</span><span>{stageNames[i]}</span></div>
            <strong>{days} {days === 1 ? "day" : "days"}</strong>
            <div className={styles.stageBar}><span style={{ width: stageTotal ? (count / stageTotal * 100) + "%" : "0%" }} /></div>
            <small>{!deck || deck.srsSelectFailed ? "Count unavailable" : count + (count === 1 ? " question" : " questions")}</small>
          </li>; })}
        </ol>
        <p className={styles.pathFoot}><Target size={15} className="shrink-0" />Correct answers advance a stage. Mistakes return tomorrow. New questions become due at midnight IST.</p>
      </section>
      {notice && (
        <p role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm font-medium text-emerald-900  dark:text-emerald-200 shadow-sm">
          {notice}
        </p>
      )}
      {srsUnavailable && (
        <div role="status" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm font-medium text-amber-900  dark:text-amber-200 shadow-sm">
          Your wrong answers are still in your revision queue. Spaced-repetition deck items are temporarily hidden while we fix a data permission issue.
        </div>
      )}
      {error && (
        <div role="alert" className="space-y-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3.5 text-sm ">
          <p>{error}</p>
          <Button variant="outline" size="sm" disabled={saving} onClick={load}>Reload queue</Button>
        </div>
      )}

      {/* Daily session progress */}
      {summary.totalCount > 0 && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-3 backdrop-blur-lg dark:border-border dark:bg-card shadow-sm">
          <div className="flex justify-between text-xs font-medium text-muted-foreground">
            <span>{summary.completedCount} of {summary.totalCount} reviewed</span>
            <span className="font-semibold text-primary">{summary.xpEarned} XP earned</span>
          </div>
          <div role="progressbar" aria-label="Daily revision progress" aria-valuenow={summary.completedCount} aria-valuemin={0} aria-valuemax={summary.totalCount} className="h-2.5 overflow-hidden rounded-full border border-border bg-muted/40 p-0.5 dark:border-border">
            <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none shadow-sm" style={{ width: `${(summary.completedCount / summary.totalCount) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Empty Queue / Spaced Repetition Overview Hub */}
      {!current && (
        <div className="space-y-6">
          <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm  dark:border-border dark:bg-card">
            <CardContent className="flex flex-col items-center gap-4 p-6 sm:p-8 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-600  shadow-sm dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {complete ? "Your reviews are in. Take a breath." : summary.deferredCount ? "Daily limit reached" : "Nothing due today"}
                </h2>
                {complete && <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{summary.completedCount} questions reviewed · {summary.xpEarned} XP saved</p>}
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {summary.deferredCount > 0
                    ? `${summary.deferredCount} other due questions will carry forward. Keep today manageable.`
                    : "We’ll bring back the right questions at the right time based on your spaced repetition schedule."}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button asChild className="rounded-xl bg-primary shadow-md shadow-primary/25 hover:shadow-primary/35">
                  <Link href="/test/select">Continue practicing</Link>
                </Button>
                {deck && deck.questions.length > 0 && (
                  <Button
                    variant="outline"
                    className="rounded-xl border border-border bg-card  hover:bg-white/80 dark:border-border dark:bg-card"
                    aria-expanded={studyAhead}
                    aria-controls="deck-practice"
                    onClick={() => setStudyAhead(v => !v)}
                  >
                    <Layers className="mr-2 h-4 w-4" />
                    {studyAhead ? "Hide Flashcard Practice" : `Practice Deck Flashcards (${deck.questions.length})`}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Self-Paced Flashcard Practice Mode */}
          {studyAhead && activeDeckQ && (
            <Card id="deck-practice" className="rounded-2xl border border-border bg-card shadow-sm  dark:border-border dark:bg-card">
              <CardHeader className="border-b border-border bg-card pb-3  dark:border-border dark:bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="border border-border bg-card font-semibold  dark:border-border dark:bg-card">{activeDeckQ.question_type}</Badge>
                    {activeDeckQ.year && <Badge variant="outline" className="border-border bg-card  dark:border-border">GATE {activeDeckQ.year}</Badge>}
                    <Badge variant="outline" className="border-border bg-card  dark:border-border">Card {deckIndex + 1} of {deckQuestions.length}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg hover:bg-card dark:hover:bg-zinc-800/50"
                      aria-label="Previous flashcard"
                      disabled={deckIndex === 0}
                      onClick={() => { setDeckIndex(i => Math.max(0, i - 1)); setDeckRevealed(false); setDeckSelectedOptions([]); }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg hover:bg-card dark:hover:bg-zinc-800/50"
                      aria-label="Next flashcard"
                      disabled={deckIndex >= deckQuestions.length - 1}
                      onClick={() => { setDeckIndex(i => Math.min(deckQuestions.length - 1, i + 1)); setDeckRevealed(false); setDeckSelectedOptions([]); }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-4 sm:p-6">
                {/* Question Prompt & Main Figure */}
                {isMatchingQuestion(activeDeckQ.question_text) ? (
                  <>
                    <MatchingQuestion text={activeDeckQ.question_text} />
                    {activeDeckQ.image_url && (
                      <div className="my-3 overflow-hidden rounded-2xl border border-border bg-card p-3  dark:border-border dark:bg-black/20">
                        <QuestionFigure image={{ url: activeDeckQ.image_url, width: activeDeckQ.image_width, height: activeDeckQ.image_height }} />
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <QuestionPrompt text={activeDeckQ.question_text} image={activeDeckQ.image_url ? { url: activeDeckQ.image_url, width: activeDeckQ.image_width, height: activeDeckQ.image_height } : undefined} />
                  </div>
                )}

                {/* Options List (Shown BOTH before and after reveal) */}
                {activeDeckQ.question_type !== "NAT" && (
                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Options</p>
                    <div className="grid grid-cols-1 gap-2.5">
                      {[activeDeckQ.option_1, activeDeckQ.option_2, activeDeckQ.option_3, activeDeckQ.option_4].map((option, i) => {
                        if (!option) return null;
                        const optionLetter = String.fromCharCode(65 + i);
                        const isSelected = deckSelectedOptions.includes(i + 1);
                        const isCorrect = activeDeckQ.correct_option_sets
                          ? activeDeckQ.correct_option_sets.some(set => set.includes(i + 1))
                          : activeDeckQ.question_type === "MSQ"
                          ? activeDeckQ.correct_options?.includes(i + 1)
                          : activeDeckQ.correct_option === i + 1;
                        const optionImg = activeDeckQ.option_images?.[i];

                        return (
                          <div
                            key={i}
                            role="button"
                            tabIndex={0}
                            onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }}
                            onClick={() => {
                              if (deckRevealed) return;
                              if (activeDeckQ.question_type === "MSQ") {
                                setDeckSelectedOptions(prev => prev.includes(i + 1) ? prev.filter(x => x !== i + 1) : [...prev, i + 1]);
                              } else {
                                setDeckSelectedOptions([i + 1]);
                              }
                            }}
                            className={`group relative flex w-full flex-col rounded-2xl border p-3.5 sm:p-4 text-left transition-all duration-200  ${
                              deckRevealed
                                ? isCorrect
                                  ? "border-emerald-500/70 bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 shadow-[0_4px_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40"
                                  : isSelected
                                  ? "border-rose-500/50 bg-rose-500/10 text-rose-950 dark:text-rose-100"
                                  : "border-border dark:border-border bg-card dark:bg-white/5 opacity-70"
                                : isSelected
                                ? "border-primary/80 bg-primary/10 shadow-[0_4px_20px_rgba(var(--primary-rgb),0.12)] ring-1 ring-primary/50 text-foreground"
                                : "border-border dark:border-border bg-card dark:bg-white/5 hover:border-primary/40 hover:bg-card dark:hover:bg-white/10 text-foreground/90 shadow-sm"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-xs font-bold transition-all ${
                                deckRevealed
                                  ? isCorrect
                                    ? "bg-emerald-600 text-white shadow-sm"
                                    : isSelected
                                    ? "bg-rose-600 text-white"
                                    : "border border-border bg-muted/40 text-muted-foreground"
                                  : isSelected
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "border border-border dark:border-border bg-card dark:bg-white/10 text-muted-foreground group-hover:border-primary/40 group-hover:text-foreground"
                              }`}>
                                {optionLetter}
                              </span>
                              <div className="min-w-0 flex-1 pt-0.5 text-sm leading-relaxed">
                                {isMatchCodeOption(option) ? <MatchOption text={option} /> : <MathText text={option} />}
                              </div>
                              {deckRevealed && isCorrect && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                                </span>
                              )}
                              {deckRevealed && !isCorrect && isSelected && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                                  Your selection
                                </span>
                              )}
                            </div>
                            {optionImg && (
                              <div className="mt-3 overflow-hidden rounded-xl border border-border dark:border-border bg-card dark:bg-black/20 p-2.5 ">
                                <QuestionFigure image={optionImg} inline />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Calculator Toggle */}
                <Button
                  variant="outline"
                  className="min-h-11 w-full rounded-2xl border border-border bg-card  hover:bg-card dark:border-border dark:bg-card dark:hover:bg-zinc-800/70 shadow-sm transition-all"
                  onClick={() => setCalculator(value => !value)}
                >
                  <Calculator className="mr-2 h-4 w-4 text-primary" />
                  {calculator ? "Hide calculator" : "Open virtual calculator"}
                </Button>
                <div id="deck-calculator" hidden={!calculator} className="rounded-2xl border border-border bg-card p-3  dark:border-border dark:bg-card shadow-sm">
                  <GateCalculator examMode />
                </div>

                {!deckRevealed ? (
                  <Button
                    size="lg"
                    className="min-h-14 w-full rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-sm shadow-primary/25 hover:shadow-primary/35 hover:scale-[1.005] active:scale-[0.995] transition-all font-semibold "
                    onClick={() => setDeckRevealed(true)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Reveal Answer &amp; Derivation
                  </Button>
                ) : (
                  <div className="space-y-4 rounded-2xl border border-border bg-card p-4  dark:border-border dark:bg-card shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Derivation &amp; Correct Answer</h3>
                    {activeDeckQ.question_type === "NAT" && (
                      <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-3.5 ">
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Acceptable Value Range</span>
                        <p className="mt-0.5 text-base font-bold text-emerald-950 dark:text-emerald-100">
                          {numericAnswerLabel(activeDeckQ.answer_min, activeDeckQ.answer_max, activeDeckQ.answer_ranges)}
                        </p>
                      </div>
                    )}
                    {activeDeckQ.correct_option_sets && (
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        {multipleAnswerLabel(activeDeckQ.correct_option_sets)}
                      </p>
                    )}
                    {activeDeckQ.explanation ? (
                      <div className="overflow-hidden rounded-xl border border-border bg-card p-4  dark:border-border dark:bg-black/20">
                        <QuestionExplanation text={activeDeckQ.explanation} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">A detailed derivation isn’t available for this question yet.</p>
                    )}

                    <div className="space-y-3 pt-2">
                      <p className="text-xs text-muted-foreground">Free practice helps you prepare. Your daily queue is where reviews, stages, and XP are saved.</p>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-xs"
                          onClick={() => {
                            if (deckIndex < deckQuestions.length - 1) {
                              setDeckIndex(i => i + 1); setDeckRevealed(false); setDeckSelectedOptions([]);
                            } else {
                              setNotice("You reviewed all flashcards in your deck!"); setStudyAhead(false);
                            }
                          }}
                        >
                          Next flashcard <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Deck Builder & Quick Start Actions */}
          <Card className="rounded-2xl border border-border bg-card shadow-sm  dark:border-border dark:bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Keep your revision deck growing</CardTitle>
              <CardDescription>
                Questions you answer incorrectly or bookmark in practice sessions automatically join your deck.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <Button asChild variant="outline" className="h-11 rounded-2xl border border-border bg-card  hover:bg-white/80 dark:border-border dark:bg-card">
                  <Link href="/practice">
                    <Play className="mr-2 h-4 w-4 text-primary" />
                    Take a 5-Q Sprint
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-2xl border border-border bg-card  hover:bg-white/80 dark:border-border dark:bg-card">
                  <Link href="/test/select">
                    <BookOpen className="mr-2 h-4 w-4 text-primary" />
                    Full Mock Exam
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-2xl border border-border bg-card  hover:bg-white/80 dark:border-border dark:bg-card">
                  <Link href="/bookmarks">
                    <Bookmark className="mr-2 h-4 w-4 text-primary" />
                    Review Bookmarks
                  </Link>
                </Button>
              </div>
              {deck && deck.totalCount === 0 && (
                <Button
                  variant="secondary"
                  disabled={importing}
                  onClick={handleImportMistakes}
                  className="w-full rounded-2xl text-xs font-semibold"
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  {importing ? "Scanning test history…" : "Sync mistakes from past tests into revision"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Daily Queue Item */}
      {current && q && (
        <div className={styles.review} ref={reviewPanel} tabIndex={-1}>
          <div className={styles.reviewHeading}><h2>Today’s revision queue</h2><span>Question {summary.completedCount + 1} of {summary.totalCount}</span></div>
          {/* Current question stage */}
          <ol aria-label="Revision stages" className="grid grid-cols-5 gap-1.5 rounded-2xl border border-border bg-card p-1.5  dark:border-border dark:bg-card shadow-sm">
            {REVISION_INTERVALS.map((days, i) => {
              const isActive = current.stage === i + 1;
              return (
                <li
                  key={days}
                  aria-current={isActive ? "step" : undefined}
                  className={`rounded-xl px-2 py-2 text-center transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 font-semibold scale-[1.02]"
                      : "text-muted-foreground hover:bg-card dark:hover:bg-white/5"
                  }`}
                >
                  <span className="block text-[10px] sm:text-xs uppercase tracking-wider opacity-85">Stage {i + 1}</span>
                  <span className="text-sm sm:text-base font-bold">{days}d</span>
                </li>
              );
            })}
          </ol>

          {/* Daily review card */}
          <Card className="rounded-2xl border border-border bg-card shadow-sm  dark:border-border dark:bg-card transition-all">
            <CardContent className="space-y-6 p-5 sm:p-7">
              {/* Question Metadata Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4 dark:border-border">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="border border-border bg-card px-2.5 py-1 text-xs font-bold  dark:border-border dark:bg-card">
                    {q.question_type}
                  </Badge>
                  {q.year && (
                    <Badge variant="outline" className="border-border bg-card px-2.5 py-1 text-xs  dark:border-border">
                      GATE {q.year}
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-border bg-card px-2.5 py-1 text-xs font-semibold  dark:border-border">
                    Stage {current.stage} / 5
                  </Badge>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {q.question_type === "MSQ" ? "Select all correct choices" : q.question_type === "NAT" ? "Numerical answer" : "Select one choice"}
                </span>
              </div>

              {/* Question Prompt & Main Figure */}
              <div className="space-y-3">
                {isMatchingQuestion(q.question_text) ? (
                  <>
                    <MatchingQuestion text={q.question_text} />
                    {q.image_url && (
                      <div className="my-3 overflow-hidden rounded-2xl border border-border bg-card p-3  dark:border-border dark:bg-black/20">
                        <QuestionFigure image={{ url: q.image_url, width: q.image_width, height: q.image_height }} />
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <QuestionPrompt
                      text={q.question_text}
                      image={q.image_url ? { url: q.image_url, width: q.image_width, height: q.image_height } : undefined}
                    />
                  </div>
                )}
              </div>

              {/* Options List with Diagrams (Rendered both BEFORE and AFTER reveal) */}
              {q.question_type !== "NAT" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Options</p>
                    {!revealed && (
                      <span className="text-[11px] text-muted-foreground">
                        Click option to test your pick
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {[q.option_1, q.option_2, q.option_3, q.option_4].map((option, i) => {
                      if (!option) return null;
                      const optionLetter = String.fromCharCode(65 + i);
                      const isSelected = selectedOptions.includes(i + 1);
                      const isCorrect = q.correct_option_sets
                        ? q.correct_option_sets.some(set => set.includes(i + 1))
                        : q.question_type === "MSQ"
                        ? q.correct_options?.includes(i + 1)
                        : q.correct_option === i + 1;
                      const optionImg = q.option_images?.[i];

                      return (
                        <div
                          key={i}
                          role="button"
                            tabIndex={0}
                            onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }}
                          onClick={() => {
                            if (revealed) return;
                            if (q.question_type === "MSQ") {
                              setSelectedOptions(prev => prev.includes(i + 1) ? prev.filter(x => x !== i + 1) : [...prev, i + 1]);
                            } else {
                              setSelectedOptions([i + 1]);
                            }
                          }}
                          className={`group relative flex w-full flex-col rounded-2xl border p-3.5 sm:p-4 text-left transition-all duration-200  ${
                            revealed
                              ? isCorrect
                                ? "border-emerald-500/70 bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 shadow-[0_4px_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40"
                                : isSelected
                                ? "border-rose-500/50 bg-rose-500/10 text-rose-950 dark:text-rose-100"
                                : "border-border dark:border-border bg-card dark:bg-white/5 opacity-70"
                              : isSelected
                              ? "border-primary/80 bg-primary/10 shadow-[0_4px_20px_rgba(var(--primary-rgb),0.12)] ring-1 ring-primary/50 text-foreground"
                              : "border-border dark:border-border bg-card dark:bg-white/5 hover:border-primary/40 hover:bg-card dark:hover:bg-white/10 text-foreground/90 shadow-sm cursor-pointer"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-xs font-bold transition-all ${
                              revealed
                                ? isCorrect
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : isSelected
                                  ? "bg-rose-600 text-white"
                                  : "border border-border bg-muted/40 text-muted-foreground"
                                : isSelected
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "border border-border dark:border-border bg-card dark:bg-white/10 text-muted-foreground group-hover:border-primary/40 group-hover:text-foreground"
                            }`}>
                              {optionLetter}
                              {revealed && isCorrect && <span className="sr-only"> (correct)</span>}
                            </span>
                            <div className="min-w-0 flex-1 pt-0.5 text-sm leading-relaxed">
                              {isMatchCodeOption(option) ? <MatchOption text={option} /> : <MathText text={option} />}
                            </div>
                            {revealed && isCorrect && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                              </span>
                            )}
                            {revealed && !isCorrect && isSelected && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                                Your pick
                              </span>
                            )}
                          </div>
                          {optionImg && (
                            <div className="mt-3 overflow-hidden rounded-xl border border-border dark:border-border bg-card dark:bg-black/20 p-2.5 ">
                              <QuestionFigure image={optionImg} inline />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Calculator Toggle */}
              <Button
                variant="outline"
                className="min-h-11 w-full rounded-2xl border border-border bg-card  hover:bg-card dark:border-border dark:bg-card dark:hover:bg-zinc-800/70 shadow-sm transition-all"
                onClick={() => setCalculator(value => !value)}
                aria-expanded={calculator}
                aria-controls="revision-calculator"
              >
                <Calculator className="mr-2 h-4 w-4 text-primary" />
                {calculator ? "Hide calculator" : "Open virtual calculator"}
              </Button>
              <div id="revision-calculator" hidden={!calculator} className="rounded-2xl border border-border bg-card p-3  dark:border-border dark:bg-card shadow-sm">
                <GateCalculator examMode />
              </div>

              {/* Bottom Action Area: Reveal Button OR Answer & Derivation with Rating */}
              {!revealed ? (
                <Button
                  size="lg"
                  className="min-h-14 w-full rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-sm shadow-primary/25 hover:shadow-primary/35 hover:scale-[1.005] active:scale-[0.995] transition-all font-semibold "
                  onClick={() => setRevealed(true)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Reveal Answer &amp; Derivation
                </Button>
              ) : (
                <div className="space-y-5 rounded-2xl border border-border bg-card p-4.5 sm:p-5  dark:border-border dark:bg-card shadow-sm">
                  <section aria-label="Answer and derivation" className="space-y-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Answer &amp; Derivation</h2>
                    {q.question_type === "NAT" && (
                      <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-3.5 ">
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Official Acceptable Range</span>
                        <p className="mt-0.5 text-base font-bold text-emerald-950 dark:text-emerald-100">
                          {numericAnswerLabel(q.answer_min, q.answer_max, q.answer_ranges)}
                        </p>
                      </div>
                    )}
                    {q.correct_option_sets && (
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        {multipleAnswerLabel(q.correct_option_sets)}
                      </p>
                    )}
                    {q.explanation ? (
                      <div className="overflow-hidden rounded-xl border border-border bg-card p-4  dark:border-border dark:bg-black/20">
                        <QuestionExplanation text={q.explanation} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">A detailed derivation isn’t available for this question yet. Use the answer key to check your work.</p>
                    )}
                  </section>

                  {/* Self-Rating Feedback Buttons */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
                    <Button
                      variant="outline"
                      disabled={saving}
                      onClick={() => rate("wrong")}
                      className="min-h-16 flex-col whitespace-normal rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-800  hover:bg-rose-500/20 dark:text-rose-200 transition-all hover:scale-[1.005]"
                    >
                      <span className="font-semibold">Needs another review</span>
                      <span className="text-xs font-normal opacity-85">Stage 1 · Tomorrow · +5 XP</span>
                    </Button>
                    <Button
                      disabled={saving}
                      onClick={() => rate("correct")}
                      className="min-h-16 flex-col whitespace-normal rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-sm shadow-emerald-600/25 hover:from-emerald-700 hover:to-emerald-800  transition-all hover:scale-[1.005]"
                    >
                      <span className="font-semibold">Solved it Easily</span>
                      <span className="text-xs font-normal opacity-90">
                        {current.stage === 5 ? "Master this question" : `Stage ${current.stage + 1} · In ${REVISION_INTERVALS[current.stage]} days`} · +10 XP
                      </span>
                    </Button>
                  </div>
                  {saving && <p role="status" className="text-center text-xs text-muted-foreground">Saving your review…</p>}
                </div>
              )}
            </CardContent>
          </Card>
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <RotateCcw className="h-3 w-3" />
            Mistakes return tomorrow. Progress is saved after every review.
          </p>
        </div>
      )}
    </section>
  );
}
