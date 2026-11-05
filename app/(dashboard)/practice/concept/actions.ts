'use server';

import { requireExamContext } from '@/lib/exam-context';
import { createClient } from '@/lib/supabase/server';
import { getConceptFixPool } from '@/lib/concept-fix-server';
import { chooseConceptFix } from '@/lib/smart-tags';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function startConceptFix(subjectId: string, concept: string, requestId: string): Promise<{ sessionId: string } | { error: string }> {
  if (typeof subjectId !== 'string' || !uuid.test(subjectId) || typeof requestId !== 'string' || !uuid.test(requestId) ||
      typeof concept !== 'string' || concept.trim().length < 2 || concept.length > 80 || /[\x00-\x1f\x7f]/.test(concept)) return { error: 'Choose a valid concept from your diagnostics.' };
  const { user, exam, stream } = await requireExamContext();
  const supabase = await createClient();
  try {
    const previous = await supabase.from('test_sessions').select('id,subject_id,topic_id,mode,duration_minutes,total_questions,question_ids').eq('id', requestId).eq('user_id', user.id)
      .eq('exam_id', exam.id).or(stream ? `stream_id.eq.${stream.id}` : 'stream_id.is.null').maybeSingle();
    if (previous.error) throw previous.error;
    const pool = await getConceptFixPool(exam.id, stream?.id ?? null, subjectId, concept);
    if (!pool.length) return { error: 'No matching questions are available for this concept in your current stream. Choose another practice selection.' };
    const eligible = new Set(pool.map(q => q.id));
    const matchingPrevious = (s: { subject_id: string | null; mode: string; duration_minutes: number; total_questions: number; question_ids: string[] | null }) =>
      s.subject_id === subjectId && s.mode === 'custom' && s.duration_minutes === 10 && s.total_questions >= 1 && s.total_questions <= 3 &&
      s.question_ids?.length === s.total_questions && s.question_ids.every(id => eligible.has(id));
    if (previous.data) return matchingPrevious(previous.data) ? { sessionId: previous.data.id }
      : { error: 'This request belongs to another practice selection. Refresh to start again.' };
    const recent = await supabase.from('test_sessions').select('question_ids').eq('user_id', user.id).eq('exam_id', exam.id)
      .or(stream ? `stream_id.eq.${stream.id}` : 'stream_id.is.null').eq('status', 'completed').order('completed_at', { ascending: false }).limit(3);
    if (recent.error) throw recent.error;
    const seen = new Set<string>((recent.data ?? []).flatMap(s => s.question_ids ?? []));
    const chosen = chooseConceptFix(pool, seen);
    // Existing custom sessions support fixed question IDs and an authoritative timer.
    // Automatic practice therefore works without the optional editorial-tag migration.
    const inserted = await supabase.from('test_sessions').insert({ id: requestId, user_id: user.id, exam_id: exam.id, stream_id: stream?.id ?? null,
      subject_id: subjectId, topic_id: pool[0].topic_id ?? null, mode: 'custom', question_ids: chosen.map(q => q.id),
      total_questions: chosen.length, duration_minutes: 10, status: 'in_progress' }).select('id').single();
    if (inserted.error?.code === '23505') {
      const retry = await supabase.from('test_sessions').select('id,subject_id,mode,duration_minutes,total_questions,question_ids').eq('id', requestId).eq('user_id', user.id).eq('exam_id', exam.id)
        .or(stream ? `stream_id.eq.${stream.id}` : 'stream_id.is.null').maybeSingle();
      if (retry.data && matchingPrevious(retry.data)) return { sessionId: retry.data.id };
    }
    if (inserted.error || !inserted.data) throw inserted.error ?? new Error('Session not returned');
    return { sessionId: inserted.data.id };
  } catch {
    return { error: 'Concept practice could not start. Please retry; if this continues, contact support.' };
  }
}
