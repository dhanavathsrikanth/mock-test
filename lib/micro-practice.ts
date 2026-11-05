import { filterTestPool, type PoolQuestion, type TestTopic } from './test-pool';

export type SprintSelection = {
  examId: string; streamId: string | null; subjectId: string | null; topicId: string | null;
  yearFrom: number; yearTo: number; minutes: 12 | 15;
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
export function sprintPool(pool: PoolQuestion[], selection: Pick<SprintSelection, 'subjectId' | 'topicId' | 'yearFrom' | 'yearTo'>, topics: TestTopic[]) {
  return filterTestPool(pool, { subjectId: selection.subjectId, topicId: selection.topicId, year: null, paper: null }, topics)
    .filter(q => !q.marks_to_all && q.year != null && q.year >= selection.yearFrom && q.year <= selection.yearTo);
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
  if (selection.subjectId && !subjects.some(s => s.id === selection.subjectId)) return 'Choose a subject available in this stream.';
  if (selection.topicId && (!selection.subjectId || !topics.some(t => t.id === selection.topicId && t.subject_id === selection.subjectId))) return 'Choose a topic belonging to your subject.';
  return null;
}
