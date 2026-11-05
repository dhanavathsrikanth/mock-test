import { createClient } from '@/lib/supabase/server';
import { compareConceptProgress, diagnoseConcepts, type SmartTagSet, type TaggedAttempt, type SmartDiagnostic } from './smart-tags';
import { resolveAutomaticTags } from './automatic-smart-tags';

export type DiagnosticLoad = { state: 'ready'; diagnostic: SmartDiagnostic } | { state: 'unavailable' | 'not_enabled' };
type Scope = { userId: string; examId: string; streamId: string | null; sessionId?: string };
// Cache schema availability only, never a student's answers or diagnostics.
let missingEditorTableUntil = 0;

/** Server-only use: the query includes keys to re-grade responses; callers receive counters only. */
export async function loadSmartDiagnostic(scope: Scope): Promise<DiagnosticLoad> {
  try { return await querySmartDiagnostic(scope); }
  catch { return { state: 'unavailable' }; }
}

async function querySmartDiagnostic(scope: Scope): Promise<DiagnosticLoad> {
  const supabase = await createClient();
  const signal = AbortSignal.timeout(10000);
  let query = supabase.from('test_sessions').select('id,completed_at,question_ids').eq('user_id', scope.userId)
    .eq('exam_id', scope.examId).or(scope.streamId ? `stream_id.eq.${scope.streamId}` : 'stream_id.is.null')
    .eq('status', 'completed').order('completed_at', { ascending: false }).order('id').limit(scope.sessionId ? 1 : 6).abortSignal(signal);
  if (scope.sessionId) query = query.eq('id', scope.sessionId);
  const sessions = await query;
  if (sessions.error) return { state: 'unavailable' };
  if (!sessions.data?.length) return { state: 'ready', diagnostic: diagnoseConcepts([]) };
  const answers = await supabase.from('test_answers').select('session_id,question_id,selected_option,selected_options,numeric_answer')
    .in('session_id', sessions.data.map(s => s.id)).order('id').range(0, 999).abortSignal(signal);
  if (answers.error || (answers.data?.length ?? 0) >= 1000) return { state: 'unavailable' };
  const questionIds = new Map<string, string[]>();
  for (const session of sessions.data) {
    const ids = [...new Set<string>(session.question_ids ?? (answers.data ?? []).filter(a => a.session_id === session.id).map(a => a.question_id))];
    if (ids.length > 150) return { state: 'unavailable' };
    questionIds.set(session.id, ids);
  }
  const allIds = [...new Set([...questionIds.values()].flat())];
  const questionMap = new Map<string, Record<string, unknown>>();
  const tagMap = new Map<string, SmartTagSet>();
  let manualAvailable = Date.now() >= missingEditorTableUntil;
  // Bound REST URLs as well as row counts. Topic metadata supplies an automatic fallback.
  for (let offset = 0; offset < allIds.length; offset += 150) {
    const ids = allIds.slice(offset, offset + 150);
    const [questions, tags] = await Promise.all([
      supabase.from('questions').select('id,subject_id,topic_id,topics(id,name,subject_id),question_type,correct_option,correct_options,correct_option_sets,answer_min,answer_max,answer_ranges,answer_decimal_places,marks_to_all')
        .eq('exam_id', scope.examId).or(scope.streamId ? `stream_id.eq.${scope.streamId}` : 'stream_id.is.null').in('id', ids).abortSignal(signal),
      manualAvailable ? supabase.from('question_smart_tags').select('question_id,core_concepts,common_error_triggers,reviewed').eq('reviewed', true).in('question_id', ids).abortSignal(signal)
        : { data: [], error: null },
    ]);
    if (questions.error || questions.data?.length !== ids.length) return { state: 'unavailable' };
    for (const q of questions.data) questionMap.set(q.id, q);
    if (tags.error) {
      manualAvailable = false;
      if (['42P01','42703','PGRST205','PGRST204'].includes(tags.error.code)) missingEditorTableUntil = Date.now() + 300000;
    }
    else for (const t of tags.data ?? []) tagMap.set(t.question_id, t as SmartTagSet);
  }
  const answerMap = new Map((answers.data ?? []).map(a => [JSON.stringify([a.session_id, a.question_id]), a]));
  const recent: TaggedAttempt[] = [], previous: TaggedAttempt[] = [];
  for (const [index, session] of sessions.data.entries()) {
    if (!session.completed_at) continue;
    for (const id of questionIds.get(session.id) ?? []) {
      const q = questionMap.get(id)!;
      const answer = answerMap.get(JSON.stringify([session.id, id]));
      const question = q as unknown as TaggedAttempt['question'];
      const tags = resolveAutomaticTags(q as unknown as Parameters<typeof resolveAutomaticTags>[0], tagMap.get(id));
      (index < 3 ? recent : previous).push({ sessionId: session.id, questionId: id, subjectId: String(q.subject_id),
        completedAt: session.completed_at, question, tags,
        response: answer?.numeric_answer ?? (answer?.selected_options?.length ? answer.selected_options : answer?.selected_option) ?? null });
    }
  }
  const diagnostic = compareConceptProgress(diagnoseConcepts(recent), diagnoseConcepts(previous));
  diagnostic.sessionCount = Math.min(3, sessions.data.length);
  return { state: 'ready', diagnostic };
}
