'use server';

import { requireExamContext } from '@/lib/exam-context';
import { createClient } from '@/lib/supabase/server';
import { getConceptFixPool } from '@/lib/concept-fix-server';
import { chooseConceptFix, conceptKey } from '@/lib/smart-tags';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function startConceptFix(subjectId: string, concept: string, requestId: string): Promise<{ sessionId: string } | { error: string }> {
  if (typeof subjectId !== 'string' || !uuid.test(subjectId) || typeof requestId !== 'string' || !uuid.test(requestId) ||
      typeof concept !== 'string' || concept.trim().length < 2 || concept.length > 80 || /[\x00-\x1f\x7f]/.test(concept)) return { error: 'Choose a valid concept from your diagnostics.' };
  const { user, exam, stream } = await requireExamContext();
  const supabase = await createClient();
  try {
    const previous = await supabase.from('test_sessions').select('id,subject_id,concept_label').eq('id', requestId).eq('user_id', user.id)
      .eq('exam_id', exam.id).or(stream ? `stream_id.eq.${stream.id}` : 'stream_id.is.null').eq('mode', 'concept_fix').maybeSingle();
    if (previous.error) throw previous.error;
    if (previous.data) return previous.data.subject_id === subjectId && conceptKey(previous.data.concept_label) === conceptKey(concept)
      ? { sessionId: previous.data.id } : { error: 'This request belongs to another concept. Refresh to start again.' };
    const pool = await getConceptFixPool(exam.id, stream?.id ?? null, subjectId, concept);
    if (!pool.length) return { error: 'No reviewed questions are available for this concept in your current stream. Try Quick Practice.' };
    const recent = await supabase.from('test_sessions').select('question_ids').eq('user_id', user.id).eq('exam_id', exam.id)
      .or(stream ? `stream_id.eq.${stream.id}` : 'stream_id.is.null').eq('status', 'completed').order('completed_at', { ascending: false }).limit(3);
    if (recent.error) throw recent.error;
    const seen = new Set<string>((recent.data ?? []).flatMap(s => s.question_ids ?? []));
    const chosen = chooseConceptFix(pool, seen);
    const label = pool[0].core_concepts.find(t => conceptKey(t) === conceptKey(concept))!;
    const inserted = await supabase.from('test_sessions').insert({ id: requestId, user_id: user.id, exam_id: exam.id, stream_id: stream?.id ?? null,
      subject_id: subjectId, mode: 'concept_fix', concept_label: label, question_ids: chosen.map(q => q.id),
      total_questions: chosen.length, duration_minutes: 10, status: 'in_progress' }).select('id').single();
    if (inserted.error?.code === '23505') {
      const retry = await supabase.from('test_sessions').select('id').eq('id', requestId).eq('user_id', user.id).eq('exam_id', exam.id)
        .or(stream ? `stream_id.eq.${stream.id}` : 'stream_id.is.null').eq('mode', 'concept_fix').eq('subject_id', subjectId).eq('concept_label', label).maybeSingle();
      if (retry.data) return { sessionId: retry.data.id };
    }
    if (inserted.error || !inserted.data) throw inserted.error ?? new Error('Session not returned');
    return { sessionId: inserted.data.id };
  } catch {
    return { error: 'Concept practice could not start. Please retry; if this continues, contact support.' };
  }
}
