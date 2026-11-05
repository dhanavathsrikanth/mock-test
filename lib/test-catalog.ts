import { createClient } from '@/lib/supabase/server';
import { streamCondition } from '@/lib/stream-scope';
import type { PoolQuestion } from '@/lib/test-pool';
import { availabilityScope, summariseAvailability, type AvailabilityRow, type ContentAvailability } from '@/lib/content-availability';

/** Onboarding needs scope counts, not answer keys or question text. Query failures stay failures. */
export async function getContentAvailability(examIds: string[]): Promise<Record<string, ContentAvailability>> {
    if (!examIds.length) return {};
    const supabase = await createClient();
    const rows: (AvailabilityRow & { exam_id: string; stream_id: string | null })[] = [];
    for (let offset = 0;; offset += 1000) {
        const result = await supabase.from('questions')
            .select('exam_id,stream_id,year,paper,source_question_number,marks')
            .in('exam_id', examIds).order('id').range(offset, offset + 999);
        if (result.error) throw result.error;
        rows.push(...(result.data || []));
        if ((result.data || []).length < 1000) break;
    }
    const groups = new Map<string, AvailabilityRow[]>();
    for (const row of rows) {
        const key = availabilityScope(row.exam_id, row.stream_id);
        const group = groups.get(key) || [];
        group.push(row);
        groups.set(key, group);
    }
    return Object.fromEntries([...groups].map(([key, records]) => [key, summariseAvailability(records)]));
}
/** Page through metadata so banks larger than the API row limit remain complete. */
export async function getTestPool(examId: string, stream: {
    id: string;
} | null): Promise<PoolQuestion[]> {
    const supabase = await createClient();
    const pool: PoolQuestion[] = [];
    for (let offset = 0;; offset += 1000) {
        const result = await supabase.from('questions')
            .select('id,subject_id,topic_id,year,paper,source_question_number,marks,question_type,marks_to_all').eq('exam_id', examId).or(streamCondition(stream))
            .order('id').range(offset, offset + 999);
        if (result.error)
            throw result.error;
        const rows = result.data || [];
        pool.push(...rows);
        if (rows.length < 1000)
            return pool;
    }
}
