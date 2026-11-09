// GATE 2027 starts on 6 February; this is the start of the exam window,
// not an assigned paper/session time. Verified 6 November 2026:
// https://gate2027.iitm.ac.in/important_dates
export const GATE_2027_COUNTDOWN = {
  date: "2027-02-06",
  source: "https://gate2027.iitm.ac.in/important_dates",
};

export function defaultExamDate(examName: string): string | null {
  return /\bGATE\b/i.test(examName) && /\b2027\b/.test(examName) ? GATE_2027_COUNTDOWN.date : null;
}

export function countdownTarget(value: string | null): number | null {
  if (!value) return null;
  // Calendar dates use the exam's timezone, independent of the browser timezone.
  const timestamp = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+05:30` : value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function countdownRemaining(target: number, now: number) {
  const diff = Math.max(0, target - now);
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor(diff % 86400000 / 3600000),
    minutes: Math.floor(diff % 3600000 / 60000),
    seconds: Math.floor(diff % 60000 / 1000),
  };
}
