import { filterTestPool, type PoolQuestion, type TestTopic } from './test-pool';

export type SprintSelection = {
  examId: string; streamId: string | null; subjectId: string | null; topicId: string | null;
  yearFrom: number; yearTo: number; minutes: 12 | 15;
  subjectIds?: string[]; topicIds?: string[]; years?: number[];
};
export type SprintCatalog = {
  examId: string; streamId: string | null; label: string; mixed: boolean;
  pool: PoolQuestion[]; subjects: { id: string; name: string }[]; topics: TestTopic[];
  resumeId: string | null;
};

export function sprintCreationMessage(error: { code?: string; message?: string }) {
  if ((error.code === '23514' && error.message?.includes('test_sessions_mode_check')) ||
    error.code === 'PGRST204' || error.code === '42703')
    return 'Sprints are not enabled for this platform yet. Please contact support.';
  if (error.code === '42501') return 'Your account cannot start sprints right now. Please contact support.';
  if (error.code === '23503') return 'Question availability changed. Refresh the page and try again.';
  return 'Unable to start your sprint. Please retry.';
}
export function sprintFilterValues(selection: Pick<SprintSelection, 'subjectId' | 'topicId' | 'yearFrom' | 'yearTo' | 'subjectIds' | 'topicIds' | 'years'>) {
  return { subjects: selection.subjectIds ?? (selection.subjectId ? [selection.subjectId] : []),
    topics: selection.topicIds ?? (selection.topicId ? [selection.topicId] : []), years: selection.years };
}
export function sprintPool(pool: PoolQuestion[], selection: Pick<SprintSelection, 'subjectId' | 'topicId' | 'yearFrom' | 'yearTo' | 'subjectIds' | 'topicIds' | 'years'>, topics: TestTopic[]) {
  const filters = sprintFilterValues(selection);
  const topicQuestions = filters.topics.length ? new Set(filters.topics.flatMap(topicId =>
    filterTestPool(pool, { subjectId: null, topicId, year: null, paper: null }, topics).map(q => q.id))) : null;
  return pool.filter(q => !q.marks_to_all && q.year != null &&
    (filters.years ? filters.years.includes(q.year) : q.year >= selection.yearFrom && q.year <= selection.yearTo) &&
    (!filters.subjects.length || filters.subjects.includes(q.subject_id)) && (!topicQuestions || topicQuestions.has(q.id)));
}
export function sprintAvailability(pool: PoolQuestion[], mixed: boolean) {
  const counts = { MCQ: 0, MSQ: 0, NAT: 0 };
  for (const q of pool) if (q.question_type === 'MCQ' || q.question_type === 'MSQ' || q.question_type === 'NAT') counts[q.question_type]++;
  return { counts, ready: mixed ? counts.MCQ >= 3 && counts.MSQ >= 1 && counts.NAT >= 1 : counts.MCQ >= 5 };
}
export function chooseSprint(pool: PoolQuestion[], mixed: boolean, random = Math.random): PoolQuestion[] {
  const unique = [...new Map(pool.filter(q => !q.marks_to_all).map(q => [q.id, q])).values()];
  if (!sprintAvailability(unique, mixed).ready) return [];
  function shuffle(items: PoolQuestion[]) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  }
  return shuffle((mixed ? [['MCQ', 3], ['MSQ', 1], ['NAT', 1]] as const : [['MCQ', 5]] as const)
    .flatMap(([type, count]) => shuffle(unique.filter(q => q.question_type === type)).slice(0, count)));
}
export function validateSprint(selection: SprintSelection, topics: TestTopic[], subjects: { id: string }[]) {
  if (![12, 15].includes(selection.minutes) || !Number.isInteger(selection.yearFrom) || !Number.isInteger(selection.yearTo) ||
    selection.yearFrom < 1900 || selection.yearTo > 2200 || selection.yearFrom > selection.yearTo) return 'Choose valid years and a 12- or 15-minute timer.';
  for (const values of [selection.subjectIds, selection.topicIds]) {
    if (values !== undefined && (!Array.isArray(values) || values.length > 500 || values.some(id => typeof id !== 'string') || new Set(values).size !== values.length)) return 'Choose valid subjects and topics.';
  }
  if (selection.years !== undefined && (!Array.isArray(selection.years) || !selection.years.length || selection.years.length > 301 || selection.years.some(year => !Number.isInteger(year) || year < 1900 || year > 2200) || new Set(selection.years).size !== selection.years.length)) return 'Choose at least one valid year.';
  const filters = sprintFilterValues(selection);
  if (filters.subjects.some(id => !subjects.some(s => s.id === id))) return 'Choose a subject available in this stream.';
  if (filters.topics.some(id => !topics.some(t => t.id === id && subjects.some(s => s.id === t.subject_id) && (!filters.subjects.length || filters.subjects.includes(t.subject_id))))) return 'Choose topics belonging to your selected subjects.';
  return null;
}
