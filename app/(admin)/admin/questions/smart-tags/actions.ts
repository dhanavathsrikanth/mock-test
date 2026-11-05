'use server';

import { parseTagLines } from '@/lib/smart-tags';
import { requireTagEditor } from '@/lib/tag-editor-auth';

export async function searchTagQuestions(term: string) {
  try {
    const supabase = await requireTagEditor();
    if (typeof term !== 'string' || term.trim().length < 3 || term.length > 100) return { error: 'Enter a question ID or at least 3 characters of its text.' };
    let query = supabase.from('questions').select('id,question_text,explanation,year,paper,source_question_number,subjects(name),topics(name)').order('id').limit(20);
    query = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term.trim())
      ? query.eq('id', term.trim()) : query.ilike('question_text', `%${term.trim().replace(/[%_]/g, '\\$&')}%`);
    const result = await query;
    if (result.error) throw result.error;
    const ids = (result.data ?? []).map(q => q.id);
    if (!ids.length) return { questions: [] };
    const tags = await supabase.from('question_smart_tags').select('question_id,core_concepts,common_error_triggers,reviewed,review_note').in('question_id', ids);
    if (tags.error) return { error: 'Concept tagging is not available. Check that its database migration has been applied.' };
    const byId = new Map((tags.data ?? []).map(t => [t.question_id, t]));
    return { questions: (result.data ?? []).map(q => {
      const subject = Array.isArray(q.subjects) ? q.subjects[0] : q.subjects;
      const topic = Array.isArray(q.topics) ? q.topics[0] : q.topics;
      return { id: q.id, text: q.question_text, explanation: q.explanation, source: `${q.year ?? 'Year unknown'} · ${q.paper ?? 'Paper unknown'} · Q${q.source_question_number ?? '?'}`,
        subject: subject?.name ?? '', topic: topic?.name ?? '', tags: byId.get(q.id) ?? null };
    }) };
  } catch (error) { return { error: error instanceof Error ? error.message : 'Question search could not load. Please retry.' }; }
}

export async function saveSmartTags(input: { questionId: string; concepts: string; traps: string; reviewed: boolean; note: string }) {
  try {
    const supabase = await requireTagEditor();
    if (!input || typeof input.questionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.questionId) ||
      typeof input.concepts !== 'string' || typeof input.traps !== 'string' || typeof input.note !== 'string' || typeof input.reviewed !== 'boolean')
      return { error: 'Provide a valid question and tag fields.' };
    const core = parseTagLines(input.concepts), traps = parseTagLines(input.traps);
    if (input.note.length > 1000 || (input.reviewed && (!core.length || input.note.trim().length < 3))) return { error: 'Reviewed tags need at least one concept and a review note (3–1,000 characters).' };
    const saved = await supabase.from('question_smart_tags').upsert({ question_id: input.questionId, core_concepts: core,
      common_error_triggers: traps, reviewed: input.reviewed, review_note: input.note.trim() }, { onConflict: 'question_id' });
    if (saved.error) return { error: 'Tags could not be saved. Check your admin access and retry.' };
    return { success: true };
  } catch (error) { return { error: error instanceof Error ? error.message : 'Tags could not be saved. Please retry.' }; }
}
