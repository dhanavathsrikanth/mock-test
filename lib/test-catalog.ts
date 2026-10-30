import { createClient } from '@/lib/supabase/server';
import { streamCondition } from '@/lib/stream-scope';
import type { PoolQuestion } from '@/lib/test-pool';
/** Page through metadata so banks larger than the API row limit remain complete. */
export async function getTestPool(examId: string, stream: {
    id: string;
} | null): Promise<PoolQuestion[]> {
    const supabase = await createClient();
    const pool: PoolQuestion[] = [];
    for (let offset = 0;; offset += 1000) {
        const result = await supabase.from('questions')
            .select('id,subject_id,topic_id,year,paper,source_question_number,marks').eq('exam_id', examId).or(streamCondition(stream))
            .order('id').range(offset, offset + 999);
        if (result.error)
            throw result.error;
        const rows = result.data || [];
        pool.push(...rows);
        if (rows.length < 1000)
            return pool;
    }
}
