import { requireExamContext } from '@/lib/exam-context';
import { createClient } from '@/lib/supabase/server';
import { getTestPool } from '@/lib/test-catalog';
import { TestSelectForm } from './test-select-form';
export const metadata = { title: 'New Test | Exam Prep' };
export default async function TestSelectPage() {
    const { exam, stream } = await requireExamContext();
    const supabase = await createClient();
    const pool = await getTestPool(exam.id, stream);
    const ids = [...new Set(pool.map(q => q.subject_id))];
    const [subjects, topics] = await Promise.all([
        ids.length ? supabase.from('subjects').select('id,name').eq('exam_id', exam.id).eq('is_active', true).in('id', ids).order('name') : { data: [], error: null },
        ids.length ? supabase.from('topics').select('id,subject_id,parent_id,name').in('subject_id', ids).order('sort_order') : { data: [], error: null },
    ]);
    if (subjects.error)
        throw subjects.error;
    if (topics.error)
        throw topics.error;
    return <TestSelectForm examId={exam.id} examName={exam.name} stream={stream} requiresStream={exam.requires_stream} subjects={subjects.data || []} topics={topics.data || []} pool={pool}/>;
}
