import { createClient } from '@/lib/supabase/server';
import { conceptKey } from './smart-tags';

export async function getConceptFixPool(examId: string, streamId: string | null, subjectId: string, concept: string) {
  const supabase = await createClient();
  const rows: { id: string; core_concepts: string[]; question_id: string }[] = [];
  // Page metadata only; do not load question text, solutions or keys into the selection page.
  for (let offset = 0;; offset += 1000) {
    const page = await supabase.from('question_smart_tags').select('question_id,core_concepts,questions!inner(id,exam_id,stream_id,subject_id,marks_to_all)')
      .eq('reviewed', true).eq('questions.exam_id', examId).eq('questions.subject_id', subjectId)
      .or(streamId ? `stream_id.eq.${streamId}` : 'stream_id.is.null', { referencedTable: 'questions' })
      .eq('questions.marks_to_all', false).order('question_id').range(offset, offset + 999);
    if (page.error) throw page.error;
    for (const row of page.data ?? []) if (row.core_concepts.some((label: string) => conceptKey(label) === conceptKey(concept)))
      rows.push({ id: row.question_id, question_id: row.question_id, core_concepts: row.core_concepts });
    if ((page.data ?? []).length < 1000) break;
  }
  return rows;
}
