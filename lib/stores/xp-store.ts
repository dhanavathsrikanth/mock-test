import { create } from "zustand";

interface XPToastItem {
  id: string;
  amount: number;
  reason: string;
}

interface LevelUpData {
  levelName: string;
  levelNumber: number;
  xpGained: number;
}

interface XPStore {
  toasts: XPToastItem[];
  levelUp: LevelUpData | null;
  addToast: (amount: number, reason: string) => void;
  removeToast: (id: string) => void;
  showLevelUp: (data: LevelUpData) => void;
  dismissLevelUp: () => void;
}

let toastCounter = 0;

export const useXPStore = create<XPStore>((set) => ({
  toasts: [],
  levelUp: null,
  addToast: (amount, reason) => {
    const id = `xp-toast-${++toastCounter}`;
    set((s) => ({ toasts: [...s.toasts, { id, amount, reason }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 2500);
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
  showLevelUp: (data) => {
    set({ levelUp: data });
  },
  dismissLevelUp: () => {
    set({ levelUp: null });
  },
}));
