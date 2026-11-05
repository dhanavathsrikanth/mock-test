import type { QuestionResponse } from './question-response';

export type SprintIdentity = { userId: string; sessionId: string; startedAt: string; questionIds: string[]; durationSeconds: number };
export type SprintDraft = SprintIdentity & {
  version: 1; answers: Record<string, QuestionResponse>; currentIndex: number; remainingSeconds: number; answerVersion: number;
};
type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const sprintDraftKey = (userId: string, sessionId: string) => `sprint:v1:${userId}:${sessionId}`;

function validResponse(value: unknown): value is QuestionResponse {
  return value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 4) ||
    (Array.isArray(value) && value.length <= 4 && new Set(value).size === value.length && value.every(n => Number.isInteger(n) && n >= 1 && n <= 4)) ||
    // Preserve incomplete NAT keystrokes such as '-', '.', and '-.' locally.
    (typeof value === 'string' && value.length <= 64 && /^[+-]?\d*(?:\.\d*)?$/.test(value));
}
export function freshSprintDraft(identity: SprintIdentity, initialAnswers: Record<string, QuestionResponse>): SprintDraft {
  return { ...identity, version: 1, currentIndex: 0, remainingSeconds: identity.durationSeconds, answerVersion: 0,
    answers: Object.fromEntries(Object.entries(initialAnswers).filter(([id,value]) => identity.questionIds.includes(id) && validResponse(value))) };
}
export function readSprintDraft(storage: DraftStorage, identity: SprintIdentity, initialAnswers: Record<string, QuestionResponse>): SprintDraft {
  const fallback = freshSprintDraft(identity, initialAnswers);
  const raw = storage.getItem(sprintDraftKey(identity.userId, identity.sessionId));
  if (!raw) return fallback;
  try {
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== 1 || saved.userId !== identity.userId || saved.sessionId !== identity.sessionId ||
      saved.startedAt !== identity.startedAt || JSON.stringify(saved.questionIds) !== JSON.stringify(identity.questionIds) ||
      !Number.isInteger(saved.currentIndex) || saved.currentIndex < 0 || saved.currentIndex >= identity.questionIds.length ||
      !Number.isInteger(saved.remainingSeconds) || saved.remainingSeconds < 0 || saved.remainingSeconds > identity.durationSeconds ||
      !Number.isSafeInteger(saved.answerVersion) || saved.answerVersion < 0 || !saved.answers || typeof saved.answers !== 'object' || Array.isArray(saved.answers) ||
      !Object.entries(saved.answers).every(([id,value]) => identity.questionIds.includes(id) && validResponse(value))) return fallback;
    return { ...fallback, answers: { ...fallback.answers, ...saved.answers }, currentIndex: saved.currentIndex,
      remainingSeconds: saved.remainingSeconds, answerVersion: saved.answerVersion };
  } catch { return fallback; }
}
export function writeSprintDraft(storage: DraftStorage, draft: SprintDraft): boolean {
  try { storage.setItem(sprintDraftKey(draft.userId, draft.sessionId), JSON.stringify(draft)); return true; }
  catch { return false; }
}
export function removeSprintDraft(storage: DraftStorage, userId: string, sessionId: string) {
  try { storage.removeItem(sprintDraftKey(userId, sessionId)); } catch { /* Completed sessions also redirect server-side. */ }
}
