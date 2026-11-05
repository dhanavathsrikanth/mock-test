import { gradeResponse, type QuestionResponse } from './question-response';
import type { GradingKey } from './question-contract';

export type SmartTagSet = { core_concepts: string[]; common_error_triggers: string[]; reviewed: boolean };
export type TaggedAttempt = {
  sessionId: string; questionId: string; subjectId: string; completedAt: string;
  question: GradingKey; response: QuestionResponse; tags: SmartTagSet | null;
};
export type ConceptCounter = {
  key: string; label: string; subjectId: string; attempts: number; failed: number;
  accuracy: number; sessions: number; lastFailedAt: string | null;
};
export type SmartDiagnostic = {
  concepts: ConceptCounter[]; weakSpots: ConceptCounter[];
  possibleTraps: { label: string; questions: number }[];
  answered: number; tagged: number; sessionCount: number;
};
export const conceptKey = (label: string) => label.trim().replace(/\s+/g, ' ').toLowerCase();

export function parseTagLines(text: string): string[] {
  const labels = text.split('\n').map(t => t.trim().replace(/\s+/g, ' ')).filter(Boolean);
  if (labels.length > 8 || labels.some(t => t.length < 2 || t.length > 80 || /[\x00-\x1f\x7f]/.test(t)))
    throw new Error('Use up to 8 tags per field, with 2–80 characters each. Put one tag on each line.');
  return [...new Map(labels.map(label => [conceptKey(label), label])).values()];
}

/** Derived counters: one response per session/question, including successes in the denominator. */
export function diagnoseConcepts(attempts: TaggedAttempt[]): SmartDiagnostic {
  const unique = [...new Map(attempts.map(a => [JSON.stringify([a.sessionId, a.questionId]), a])).values()];
  const counters = new Map<string, ConceptCounter & { sessionIds: Set<string> }>();
  const traps = new Map<string, { label: string; questions: number }>();
  let answered = 0, tagged = 0;
  for (const a of unique) {
    if (a.question.marks_to_all) continue;
    const correct = gradeResponse(a.question, a.response);
    if (correct == null) continue; // Skips/invalid NAT text are not failures.
    answered++;
    if (!a.tags?.reviewed || !a.tags.core_concepts.length) continue;
    tagged++;
    const labels = new Map(a.tags.core_concepts.map(label => [conceptKey(label), label]));
    for (const [key, label] of labels) {
      const id = JSON.stringify([a.subjectId, key]);
      const counter = counters.get(id) ?? { key, label, subjectId: a.subjectId, attempts: 0, failed: 0,
        accuracy: 0, sessions: 0, lastFailedAt: null, sessionIds: new Set<string>() };
      counter.attempts++; counter.sessionIds.add(a.sessionId);
      if (!correct) {
        counter.failed++;
        if (!counter.lastFailedAt || a.completedAt > counter.lastFailedAt) counter.lastFailedAt = a.completedAt;
      }
      counters.set(id, counter);
    }
    if (!correct) for (const [key, label] of new Map(a.tags.common_error_triggers.map(label => [conceptKey(label), label]))) {
      const trap = traps.get(key) ?? { label, questions: 0 }; trap.questions++; traps.set(key, trap);
    }
  }
  const concepts = [...counters.values()].map(({ sessionIds, ...c }) => ({ ...c,
    accuracy: Math.round((c.attempts - c.failed) / c.attempts * 100), sessions: sessionIds.size }))
    .sort((a, b) => b.failed - a.failed || a.label.localeCompare(b.label));
  const weakSpots = concepts.filter(c => c.attempts >= 3 && c.failed / c.attempts >= .6)
    .sort((a, b) => b.failed / b.attempts - a.failed / a.attempts || b.attempts - a.attempts || a.label.localeCompare(b.label)).slice(0, 3);
  return { concepts, weakSpots, possibleTraps: [...traps.values()].sort((a, b) => b.questions - a.questions || a.label.localeCompare(b.label)).slice(0, 3),
    answered, tagged, sessionCount: new Set(unique.map(a => a.sessionId)).size };
}

export function chooseConceptFix<T extends { id: string }>(questions: T[], recentlySeen: Set<string>, random = Math.random): T[] {
  const unique = [...new Map(questions.map(q => [q.id, q])).values()];
  for (let i = unique.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [unique[i], unique[j]] = [unique[j], unique[i]]; }
  return unique.sort((a, b) => Number(recentlySeen.has(a.id)) - Number(recentlySeen.has(b.id))).slice(0, 3);
}
