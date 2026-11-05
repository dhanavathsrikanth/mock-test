import type { QuestionPresentation } from './question-contract';
import type { QuestionResponse } from './question-response';

export type Challenge = { id: string; creatorName: string; creatorScore: number; maximum: number; creatorSeconds: number;
  label: string; minutes: number; questions: QuestionPresentation[] };
export type ChallengeDraft = { version: 1; challengeId: string; token: string; startedAt: string;
  answers: Record<string, QuestionResponse>; currentIndex: number; finishedAt?: number };
export type ChallengeResult = { result: { net: number; maximum: number; correct: number; wrong: number; skipped: number; accuracy: number };
  seconds: number; sharedMistakes: number[]; unlocked: boolean; solutions: { number: number; explanation: string | null }[] };
export const challengeKey = (id: string) => `challenge:v1:${id}`;
export const validChallengeId = (id: string) => /^ch_[a-f0-9]{32}$/.test(id);
export const validTurn = (token: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(token);
export function challengeSeconds(startedAt: string, minutes: number, now = Date.now()) {
  return Math.min(minutes * 60, Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000)));
}
export function readChallengeDraft(storage: Pick<Storage,'getItem'>, id: string): ChallengeDraft | null {
  try {
    const value = JSON.parse(storage.getItem(challengeKey(id)) ?? 'null');
    return value?.version === 1 && value.challengeId === id && validTurn(value.token) && Number.isFinite(Date.parse(value.startedAt)) &&
      Number.isInteger(value.currentIndex) && value.currentIndex >= 0 && value.currentIndex < 5 && value.answers && typeof value.answers === 'object' && !Array.isArray(value.answers) &&
      (!value.finishedAt || (Number.isFinite(value.finishedAt) && Date.now()-value.finishedAt < 30*60*1000)) ? value : null;
  } catch { return null; }
}
export function saveChallengeDraft(storage: Pick<Storage,'setItem'>, value: ChallengeDraft) {
  try { storage.setItem(challengeKey(value.challengeId), JSON.stringify(value)); return true; } catch { return false; }
}
export function challengeTime(seconds: number) { return `${Math.floor(seconds/60)}m ${seconds%60}s`; }
