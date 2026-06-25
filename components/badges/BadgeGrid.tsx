"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Badge {
  id: string;
  badge_type: string;
  unlocked_at: string | null;
  streak_at_unlock: number | null;
}

const BADGE_DEFINITIONS = [
  {
    type: "week_warrior",
    label: "Week Warrior",
    icon: "🔥",
    description: "Maintained a 7-day practice streak",
    howToEarn: "Practice for 7 consecutive days",
  },
  {
    type: "iron_will",
    label: "Iron Will",
    icon: "💪",
    description: "Maintained a 30-day practice streak",
    howToEarn: "Practice for 30 consecutive days",
  },
];

export function BadgeGrid() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchBadges() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("user_badges")
          .select("*")
          .eq("user_id", user.id);

        setBadges(data || []);
      } finally {
        setLoading(false);
      }
    }
    fetchBadges();
  }, [supabase]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse bg-muted rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Badges</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {BADGE_DEFINITIONS.map((def) => {
            const earned = badges.find((b) => b.badge_type === def.type);
            const isHovered = hovered === def.type;

            return (
              <div
                key={def.type}
                className="relative"
                onMouseEnter={() => setHovered(def.type)}
                onMouseLeave={() => setHovered(null)}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 p-3 transition-colors cursor-default ${
                    earned
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                      : "border-muted bg-muted/30 opacity-50"
                  }`}
                >
                  <span className="text-3xl">{def.icon}</span>
                  <span className="text-xs font-semibold text-center leading-tight">
                    {def.label}
                  </span>
                  {earned ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Earned
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      🔒 Locked
                    </span>
                  )}
                </motion.div>

                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-popover text-popover-foreground border rounded-lg px-3 py-2 text-xs shadow-lg z-10 pointer-events-none"
                  >
                    <p className="font-medium mb-0.5">{def.label}</p>
                    <p className="text-muted-foreground">
                      {earned ? def.description : def.howToEarn}
                    </p>
                    {earned && (
                      <p className="text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Unlocked at {def.type === "week_warrior" ? "7" : "30"} day streak
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
