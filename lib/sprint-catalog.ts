import { cache } from 'react';
import { requireExamContext } from '@/lib/exam-context';
import { createClient } from '@/lib/supabase/server';
import { getTestPool } from '@/lib/test-catalog';
import type { SprintCatalog } from '@/lib/micro-practice';

export const getSprintCatalog = cache(async (): Promise<SprintCatalog> => {
  const { user, exam, stream } = await requireExamContext();
  const supabase = await createClient();
  const pool = await getTestPool(exam.id, stream);
  const ids = [...new Set(pool.map(q => q.subject_id))];
  const [subjects, topics, resume] = await Promise.all([
    ids.length ? supabase.from('subjects').select('id,name').eq('exam_id', exam.id).eq('is_active', true).in('id', ids).order('name') : { data: [], error: null },
    ids.length ? supabase.from('topics').select('id,subject_id,parent_id,name').in('subject_id', ids).order('sort_order') : { data: [], error: null },
    supabase.from('test_sessions').select('id').eq('user_id', user.id).eq('exam_id', exam.id)
      .or(stream ? `stream_id.eq.${stream.id}` : 'stream_id.is.null').eq('mode', 'sprint').eq('status', 'in_progress')
      .order('started_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (subjects.error) throw subjects.error;
  if (topics.error) throw topics.error;
  if (resume.error) throw resume.error;
  return { examId: exam.id, streamId: stream?.id ?? null, label: stream?.name ?? exam.name, mixed: !!exam.requires_stream,
    pool, subjects: subjects.data ?? [], topics: topics.data ?? [], resumeId: resume.data?.id ?? null };
});
