"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useXPStore } from "@/lib/stores/xp-store";

export function XPToast() {
  const toasts = useXPStore((s) => s.toasts);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-sm font-medium"
          >
            <span className="text-lg leading-none">✦</span>
            <span>
              +{toast.amount} XP — {toast.reason}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
