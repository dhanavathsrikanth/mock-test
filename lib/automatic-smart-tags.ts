import { gradeResponse, hasNumericPrecision, numericResponse, selection, type QuestionResponse } from './question-response';
import type { GradingKey } from './question-contract';
import type { SmartTagSet } from './smart-tags';

export type SyllabusQuestion = { subject_id: string; topic_id?: string | null; topics?: unknown };
export const topicConceptKey = (id: string) => `topic:${id}`;
export function conceptTopicId(key: string): string | null {
  const match = /^topic:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(key);
  return match?.[1] ?? null;
}

/** Existing syllabus assignments are evidence of coverage, not a new editorial review. */
export function resolveAutomaticTags(question: SyllabusQuestion, saved?: SmartTagSet | null): SmartTagSet | null {
  if (saved?.reviewed && saved.core_concepts.length) return { ...saved, source: 'reviewed' };
  const topic = Array.isArray(question.topics) ? question.topics[0] : question.topics;
  if (!topic || typeof topic !== 'object' || !('id' in topic) || !('name' in topic) || !('subject_id' in topic) ||
    topic.id !== question.topic_id || topic.subject_id !== question.subject_id || typeof topic.name !== 'string') return null;
  const label = topic.name.trim().replace(/\s+/g, ' ');
  if (label.length < 2 || label.length > 240 || /^(general|unknown|other|others|unclassified|miscellaneous)$/i.test(label)) return null;
  return { core_concepts: [label], concept_keys: [topicConceptKey(String(topic.id))], common_error_triggers: [], reviewed: false, source: 'syllabus' };
}

export type AnswerPattern = { code: string; label: string; advice: string };
const patterns = {
  msq_missing: { code: 'msq_missing', label: 'Incomplete MSQ selection', advice: 'Check every statement independently before submitting. Your selection omitted options from an accepted set.' },
  msq_extra: { code: 'msq_extra', label: 'Extra options in an MSQ', advice: 'Look for a counterexample to each selected statement. Your selection included options outside an accepted set.' },
  msq_mixed: { code: 'msq_mixed', label: 'MSQ selection mismatch', advice: 'Review each statement: the closest accepted sets require both removing and adding options.' },
  nat_precision: { code: 'nat_precision', label: 'NAT decimal precision', advice: 'Check the permitted decimal places. The submitted value had more significant decimal places than allowed.' },
  nat_sign: { code: 'nat_sign', label: 'Check the NAT sign', advice: 'The opposite sign of your response is accepted. Recheck the sign convention and the final substitution.' },
  nat_boundary: { code: 'nat_boundary', label: 'NAT interval boundary', advice: 'Your response is one permitted decimal step from an accepted value. Review the accepted interval and intermediate rounding.' },
} satisfies Record<string, AnswerPattern>;

/** Add one decimal unit exactly; no floating tolerance or parseFloat-based diagnosis. */
function decimalStep(text: string, places: number, direction: 1 | -1): string {
  const decimals = text.split('.')[1]?.length ?? 0;
  const scale = Math.max(decimals, places);
  const scaled = BigInt(text.replace('.', '').replace(/^\+/, '')) * BigInt(10) ** BigInt(scale - decimals) + BigInt(direction) * BigInt(10) ** BigInt(scale - places);
  const digits = (scaled < BigInt(0) ? -scaled : scaled).toString().padStart(scale + 1, '0');
  return `${scaled < BigInt(0) ? '-' : ''}${scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits}`;
}

/** Report observable differences only, and respect every accepted alternative. */
export function analyseAnswerPatterns(question: GradingKey, response: QuestionResponse): AnswerPattern[] {
  if (question.marks_to_all || gradeResponse(question, response) !== false) return [];
  if (question.question_type === 'MSQ') {
    const chosen = selection(response);
    const sets = question.correct_option_sets ?? (question.correct_options?.length ? [question.correct_options] : []);
    const valid = sets.filter(set => set.length && set.length <= 4 && new Set(set).size === set.length &&
      set.every(n => Number.isInteger(n) && n >= 1 && n <= 4));
    // Do not interpret a malformed key as evidence about a student's selection.
    if (!chosen.length || !valid.length || valid.length !== sets.length || sets.length > 20) return [];
    const diffs = valid.map(set => ({ missing: set.filter(n => !chosen.includes(n)).length, extra: chosen.filter(n => !set.includes(n)).length }));
    if (diffs.some(d => d.missing > 0 && d.extra === 0)) return [patterns.msq_missing];
    if (diffs.some(d => d.extra > 0 && d.missing === 0)) return [patterns.msq_extra];
    return [patterns.msq_mixed];
  }
  if (question.question_type === 'NAT') {
    const value = numericResponse(response);
    if (!value) return [];
    if (!hasNumericPrecision(value, question.answer_decimal_places)) return [patterns.nat_precision];
    const flipped = value.startsWith('-') ? value.slice(1) : `-${value.replace(/^\+/, '')}`;
    if (gradeResponse(question, flipped) === true) return [patterns.nat_sign];
    const dp = question.answer_decimal_places;
    if (dp != null && Number.isInteger(dp) && dp >= 0 && dp <= 12 &&
      [1, -1].some(direction => gradeResponse(question, decimalStep(value, dp, direction as 1 | -1)) === true)) return [patterns.nat_boundary];
  }
  return [];
}
