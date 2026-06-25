"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

interface XPBarData {
  totalXP: number;
  currentLevel: number;
  levelName: string;
  xpForNextLevel: number;
  xpProgress: number;
  nextLevelName: string | null;
}

export function XPBar() {
  const [data, setData] = useState<XPBarData | null>(null);
  const [prevXP, setPrevXP] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function fetchLevel() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const res = await fetch("/api/xp/level");
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
      setPrevXP(json.totalXP);
    }

    fetchLevel();

    const interval = setInterval(fetchLevel, 10000);
    return () => clearInterval(interval);
  }, [supabase]);

  useEffect(() => {
    if (data && data.totalXP !== prevXP) {
      setPrevXP(data.totalXP);
    }
  }, [data, prevXP]);

  if (!data) return null;

  return (
    <div className="w-full bg-background border-b px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <Badge
          variant="secondary"
          className="shrink-0 text-xs font-semibold px-2.5 py-0.5"
        >
          {data.levelName}
        </Badge>

        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(data.xpProgress, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
          />
        </div>

        <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums shrink-0">
          {data.totalXP.toLocaleString()}
          {data.nextLevelName && (
            <> / {data.xpForNextLevel > 0 ? data.xpForNextLevel.toLocaleString() : "MAX"} XP to {data.nextLevelName}</>
          )}
        </span>
      </div>
    </div>
  );
}
