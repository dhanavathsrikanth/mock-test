import { createClient } from '@/lib/supabase/server';
import { diagnoseConcepts, type SmartTagSet, type TaggedAttempt, type SmartDiagnostic } from './smart-tags';

export type DiagnosticLoad = { state: 'ready'; diagnostic: SmartDiagnostic } | { state: 'unavailable' | 'not_enabled' };
type Scope = { userId: string; examId: string; streamId: string | null; sessionId?: string };
const missingSchema = (error: { code?: string }) => ['42P01', '42703', 'PGRST205', 'PGRST204'].includes(error.code ?? '');

/** Server-only use: the query includes keys to re-grade responses; callers receive counters only. */
export async function loadSmartDiagnostic(scope: Scope): Promise<DiagnosticLoad> {
  try { return await querySmartDiagnostic(scope); }
  catch { return { state: 'unavailable' }; }
}

async function querySmartDiagnostic(scope: Scope): Promise<DiagnosticLoad> {
  const supabase = await createClient();
  let query = supabase.from('test_sessions').select('id,completed_at,question_ids').eq('user_id', scope.userId)
    .eq('exam_id', scope.examId).or(scope.streamId ? `stream_id.eq.${scope.streamId}` : 'stream_id.is.null')
    .eq('status', 'completed').order('completed_at', { ascending: false }).order('id').limit(scope.sessionId ? 1 : 3);
  if (scope.sessionId) query = query.eq('id', scope.sessionId);
  const sessions = await query;
  if (sessions.error) return { state: 'unavailable' };
  if (!sessions.data?.length) return { state: 'ready', diagnostic: diagnoseConcepts([]) };
  const attempts: TaggedAttempt[] = [];
  for (const session of sessions.data) {
    if (!session.completed_at) continue;
    const answers = await supabase.from('test_answers').select('question_id,selected_option,selected_options,numeric_answer').eq('session_id', session.id);
    if (answers.error) return { state: 'unavailable' };
    const ids: string[] = [...new Set<string>(session.question_ids ?? (answers.data ?? []).map(a => a.question_id))];
    if (!ids.length) continue;
    if (ids.length > 150) return { state: 'unavailable' };
    // A session can contain at most 150 questions. Keys and tag metadata never reach the client.
    const [questions, tags] = await Promise.all([
      supabase.from('questions').select('id,subject_id,question_type,correct_option,correct_options,correct_option_sets,answer_min,answer_max,answer_ranges,answer_decimal_places,marks_to_all')
        .eq('exam_id', scope.examId).or(scope.streamId ? `stream_id.eq.${scope.streamId}` : 'stream_id.is.null').in('id', ids),
      supabase.from('question_smart_tags').select('question_id,core_concepts,common_error_triggers,reviewed').eq('reviewed', true).in('question_id', ids),
    ]);
    if (tags.error) return { state: missingSchema(tags.error) ? 'not_enabled' : 'unavailable' };
    if (questions.error || questions.data?.length !== ids.length) return { state: 'unavailable' };
    const tagMap = new Map((tags.data ?? []).map(t => [t.question_id, t as SmartTagSet]));
    const questionMap = new Map((questions.data ?? []).map(q => [q.id, q]));
    for (const answer of answers.data ?? []) {
      const question = questionMap.get(answer.question_id);
      if (!question) continue;
      attempts.push({ sessionId: session.id, questionId: question.id, subjectId: question.subject_id,
        completedAt: session.completed_at, question, tags: tagMap.get(question.id) ?? null,
        response: answer.numeric_answer ?? (answer.selected_options?.length ? answer.selected_options : answer.selected_option) });
    }
  }
  return { state: 'ready', diagnostic: diagnoseConcepts(attempts) };
}
