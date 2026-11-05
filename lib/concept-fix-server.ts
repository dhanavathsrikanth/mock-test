import { createClient } from '@/lib/supabase/server';
import { conceptKey } from './smart-tags';
import { conceptTopicId, resolveAutomaticTags } from './automatic-smart-tags';

export async function getConceptFixPool(examId: string, streamId: string | null, subjectId: string, concept: string) {
  const supabase = await createClient();
  const rows: { id: string; core_concepts: string[]; question_id: string; label: string; topic_id: string | null }[] = [];
  const topicId = conceptTopicId(concept);
  if (topicId) {
    for (let offset = 0;; offset += 1000) {
      const page = await supabase.from('questions').select('id,subject_id,topic_id,topics(id,name,subject_id)')
        .eq('exam_id', examId).eq('subject_id', subjectId).eq('topic_id', topicId).eq('marks_to_all', false)
        .or(streamId ? `stream_id.eq.${streamId}` : 'stream_id.is.null').order('id').range(offset, offset + 999);
      if (page.error) throw page.error;
      for (const q of page.data ?? []) {
        const tags = resolveAutomaticTags(q);
        if (tags) rows.push({ id: q.id, question_id: q.id, core_concepts: tags.core_concepts, label: tags.core_concepts[0], topic_id: q.topic_id });
      }
      if ((page.data ?? []).length < 1000) return rows;
    }
  }
  // Page metadata only; do not load question text, solutions or keys into the selection page.
  for (let offset = 0;; offset += 1000) {
    const page = await supabase.from('question_smart_tags').select('question_id,core_concepts,questions!inner(id,exam_id,stream_id,subject_id,marks_to_all)')
      .eq('reviewed', true).eq('questions.exam_id', examId).eq('questions.subject_id', subjectId)
      .or(streamId ? `stream_id.eq.${streamId}` : 'stream_id.is.null', { referencedTable: 'questions' })
      .eq('questions.marks_to_all', false).order('question_id').range(offset, offset + 999);
    if (page.error) {
      if (['42P01','PGRST205','42501'].includes(page.error.code)) return [];
      throw page.error;
    }
    for (const row of page.data ?? []) if (row.core_concepts.some((label: string) => conceptKey(label) === conceptKey(concept)))
      rows.push({ id: row.question_id, question_id: row.question_id, core_concepts: row.core_concepts,
        label: row.core_concepts.find((label: string) => conceptKey(label) === conceptKey(concept))!, topic_id: null });
    if ((page.data ?? []).length < 1000) break;
  }
  return rows;
}
