import { create } from "zustand";

interface ExamState {
  currentIndex: number;
  answers: Record<string, number | null>;
  bookmarks: Set<string>;
  timeRemaining: number;
  isSubmitting: boolean;

  setCurrentIndex: (index: number) => void;
  setAnswer: (questionId: string, option: number | null) => void;
  toggleBookmark: (questionId: string) => void;
  initBookmarks: (ids: string[]) => void;
  setTimeRemaining: (seconds: number) => void;
  tick: () => void;
  setIsSubmitting: (val: boolean) => void;
}

export const useExamStore = create<ExamState>((set) => ({
  currentIndex: 0,
  answers: {},
  bookmarks: new Set(),
  timeRemaining: 0,
  isSubmitting: false,

  setCurrentIndex: (index) => set({ currentIndex: index }),

  setAnswer: (questionId, option) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: option },
    })),

  toggleBookmark: (questionId) =>
    set((state) => {
      const next = new Set(state.bookmarks);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return { bookmarks: next };
    }),

  initBookmarks: (ids) => set({ bookmarks: new Set(ids) }),

  setTimeRemaining: (seconds) => set({ timeRemaining: seconds }),

  tick: () =>
    set((state) => ({
      timeRemaining: Math.max(0, state.timeRemaining - 1),
    })),

  setIsSubmitting: (val) => set({ isSubmitting: val }),
}));
