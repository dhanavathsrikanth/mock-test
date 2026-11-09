"use server";

import { requireExamContext } from '@/lib/exam-context';
import { createClient } from '@/lib/supabase/server';
import { getSprintCatalog } from '@/lib/sprint-catalog';
import { chooseSprint, sprintPool, sprintFilterValues, validateSprint, sprintCreationMessage, type SprintSelection } from '@/lib/micro-practice';

export async function createSprint(selection: SprintSelection, requestId: string): Promise<{ sessionId: string } | { error: string }> {
  const { user, exam, stream } = await requireExamContext();
  if (!selection || selection.examId !== exam.id || selection.streamId !== (stream?.id ?? null)) return { error: 'Your exam or stream changed. Refresh before starting.' };
  if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) return { error: 'Unable to identify this sprint. Refresh and try again.' };
  try {
    const catalog = await getSprintCatalog();
    const invalid = validateSprint(selection, catalog.topics, catalog.subjects);
    if (invalid) return { error: invalid };
    const supabase = await createClient();
    const previous = await supabase.from('test_sessions').select('id').eq('id', requestId).eq('user_id', user.id)
      .eq('exam_id', exam.id).eq('mode', 'sprint').or(stream ? `stream_id.eq.${stream.id}` : 'stream_id.is.null').maybeSingle();
    if (previous.error) {
      console.error('Sprint lookup failed', { code: previous.error.code, message: previous.error.message });
      return { error: sprintCreationMessage(previous.error) };
    }
    if (previous.data) return { sessionId: previous.data.id };
    const chosen = chooseSprint(sprintPool(catalog.pool, selection, catalog.topics), catalog.mixed);
    if (chosen.length !== 5) return { error: catalog.mixed ? 'This selection needs 3 MCQs, 1 MSQ and 1 NAT. Broaden the topic or year range.' : 'This selection needs 5 MCQs. Broaden the topic or year range.' };
    const filters = sprintFilterValues(selection);
    const { data, error } = await supabase.from('test_sessions').insert({
      id: requestId, user_id: user.id, exam_id: exam.id, stream_id: stream?.id ?? null,
      subject_id: filters.subjects.length === 1 ? filters.subjects[0] : null,
      topic_id: filters.topics.length === 1 ? filters.topics[0] : null, year: null, paper: null,
      mode: 'sprint', question_ids: chosen.map(q => q.id), total_questions: 5,
      duration_minutes: selection.minutes, status: 'in_progress',
    }).select('id').single();
    if (error?.code === '23505') {
      const retry = await supabase.from('test_sessions').select('id').eq('id', requestId).eq('user_id', user.id).eq('mode', 'sprint').maybeSingle();
      if (retry.data) return { sessionId: retry.data.id };
    }
    if (error || !data) {
      console.error('Sprint creation failed', error ? { code: error.code, message: error.message } : { message: 'No session returned' });
      return { error: error ? sprintCreationMessage(error) : 'Unable to start your sprint. Please retry.' };
    }
    await supabase.from('user_question_history').upsert(chosen.map(q => ({ user_id: user.id, question_id: q.id })), { onConflict: 'user_id,question_id', ignoreDuplicates: true });
    return { sessionId: data.id };
  } catch (error) {
    console.error('Sprint setup failed', error instanceof Error ? error.message : 'Unknown error');
    return { error: 'Unable to load sprint questions. Please retry.' };
  }
}
