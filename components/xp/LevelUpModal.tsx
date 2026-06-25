"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useXPStore } from "@/lib/stores/xp-store";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LevelUpModal() {
  const levelUp = useXPStore((s) => s.levelUp);
  const dismissLevelUp = useXPStore((s) => s.dismissLevelUp);
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (levelUp && !fired.current) {
      fired.current = true;

      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6"],
        });

        if (Date.now() < end) requestAnimationFrame(frame);
      };

      frame();
    }

    if (!levelUp) {
      fired.current = false;
    }
  }, [levelUp]);

  return (
    <AnimatePresence>
      {levelUp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-card rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-6"
          >
            <motion.div
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
              className="text-6xl"
            >
              🎉
            </motion.div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Level Up!
              </p>
              <h2 className="text-2xl font-extrabold">
                You are now{" "}
                <span className="text-emerald-500">{levelUp.levelName}</span>
              </h2>
            </div>

            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 border-4 border-emerald-400">
              {levelUp.levelNumber}
            </div>

            <p className="text-sm text-muted-foreground">
              +{levelUp.xpGained} XP gained in this session
            </p>

            <Button
              onClick={() => dismissLevelUp()}
              className="w-full"
              size="lg"
            >
              Continue Practicing
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
