"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, ArrowRight, AlertTriangle } from "lucide-react";
import Link from "next/link";

export function RevisionWidget() {
  const [data, setData] = useState<{
    dueCount: number;
    overdueCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/srs?action=summary");
        if (!res.ok) return;
        const json = await res.json();
        setData(json);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.dueCount === 0) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground">No questions due for revision</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span>📚</span> Revision Due
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <BookOpen className="h-8 w-8 text-blue-500" />
            {data.dueCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-[10px] font-bold text-white flex items-center justify-center">
                {data.dueCount > 9 ? "9+" : data.dueCount}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {data.dueCount} question{data.dueCount !== 1 ? "s" : ""} due today
            </p>
            {data.overdueCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <AlertTriangle className="h-3 w-3" />
                {data.overdueCount} overdue
              </div>
            )}
          </div>
        </div>

        <Button size="sm" className="w-full gap-1.5" asChild>
          <Link href="/revision">
            Start Revision <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
