"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RevisionSummary } from "@/lib/revision";

export function RevisionWidget() {
  const [data, setData] = useState<RevisionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  async function load() {
    setLoading(true); setError(false);
    try {
      const response = await fetch("/api/srs?action=summary", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load revision");
      setData(await response.json());
    } catch { setError(true); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  return <Card className="border-primary/25"><CardContent className="space-y-3 p-4">
    <div className="flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4 text-primary" />Today’s Revision Queue</div>
    {loading ? <div role="status" aria-label="Loading revision" className="h-20 animate-pulse rounded-lg bg-muted" /> : error ? <><p role="alert" className="text-sm text-muted-foreground">Revision is temporarily unavailable.</p><Button variant="outline" size="sm" onClick={load}>Retry</Button></> : data && <>
      <p className="flex items-center gap-2 text-lg font-semibold">{data.dueCount > 0 ? `${data.dueCount} Questions Due` : <><CheckCircle2 className="h-5 w-5 text-emerald-600" />{data.queueComplete ? "Daily queue complete" : "Nothing due today"}</>}</p>
      <p className="text-xs text-muted-foreground">{data.queueComplete ? `${data.completedCount} reviewed · ${data.xpEarned} XP earned · Streak maintained` : data.dueCount > 0 ? "Recent mistakes first. A little recall goes a long way." : "Mistakes and bookmarks return after one day."}</p>
      {data.deferredCount > 0 && <p className="text-xs text-muted-foreground">{data.deferredCount} more carry forward. Your daily limit is {data.dailyCap}.</p>}
      <Button className="min-h-11 w-full" size="sm" variant={data.dueCount ? "default" : "outline"} asChild><Link href="/revision">{data.dueCount ? "Start revision" : "View revision"}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
    </>}
  </CardContent></Card>;
}
