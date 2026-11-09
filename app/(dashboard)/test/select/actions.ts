"use server";
import { requireExamContext } from '@/lib/exam-context';
import { createClient } from '@/lib/supabase/server';
import { getTestPool } from '@/lib/test-catalog';
import { filterTestPool, testFilterValues, validateTestSelection, type TestSelection, type TestTopic } from '@/lib/test-pool';
export async function createBookmarkTest(): Promise<{
    error: string;
} | {
    sessionId: string;
}> {
    const { user, exam, stream } = await requireExamContext();
    const supabase = await createClient();
    const { data: bookmarks, error } = await supabase.from('bookmarks').select('question_id').eq('user_id', user.id);
    if (error)
        return { error: 'Unable to load bookmarks.' };
    const ids = new Set((bookmarks || []).map(b => b.question_id));
    const questions = (await getTestPool(exam.id, stream)).filter(q => ids.has(q.id));
    if (!questions.length)
        return { error: 'No bookmarked questions are available for this stream.' };
    const { data: session, error: sessionError } = await supabase.from('test_sessions').insert({ user_id: user.id, exam_id: exam.id, stream_id: stream?.id || null, mode: 'custom', question_ids: questions.map(q => q.id), total_questions: questions.length, duration_minutes: 0, status: 'in_progress' }).select('id').single();
    return sessionError || !session ? { error: 'Unable to start bookmark practice.' } : { sessionId: session.id };
}
export async function createTest(selection: TestSelection): Promise<{
    error: string;
} | {
    sessionId: string;
}> {
    const { user, exam, stream } = await requireExamContext();
    if (!selection || selection.examId !== exam.id || selection.streamId !== (stream?.id || null))
        return { error: 'Your exam or stream changed. Refresh this page before starting.' };
    const invalid = validateTestSelection(selection, exam.requires_stream);
    if (invalid)
        return { error: invalid };
    const supabase = await createClient();
    const pool = await getTestPool(exam.id, stream);
    const filters = testFilterValues(selection);
    if (filters.years.some(year => !pool.some(q => q.year === year)) ||
        filters.papers.some(paper => !pool.some(q => q.paper === paper && (!filters.years.length || (q.year != null && filters.years.includes(q.year))))))
        return { error: 'Choose source years and papers available in your stream.' };
    const subjectIds = [...new Set(pool.map(q => q.subject_id))];
    if (filters.subjects.some(id => !subjectIds.includes(id)))
        return { error: 'Choose a subject available in your stream.' };
    const { data: topics, error: topicError } = subjectIds.length ? await supabase.from('topics').select('id,subject_id,parent_id,name').in('subject_id', subjectIds) : { data: [], error: null };
    if (topicError)
        return { error: 'Unable to load topics. Please try again.' };
    const nodes = (topics || []) as TestTopic[];
    if (filters.topics.some(id => !nodes.some(t => t.id === id && subjectIds.includes(t.subject_id) && (!filters.subjects.length || filters.subjects.includes(t.subject_id)))))
        return { error: 'Choose a topic belonging to the selected subject.' };
    const full = selection.mode === 'full_paper' || selection.mode === 'full_mock';
    const matching = filterTestPool(pool, full ? { ...selection, subjectId: null, topicId: null, subjectIds: [], topicIds: [] } : selection, nodes);
    if (!matching.length)
        return { error: 'No questions match this stream, year, paper and topic.' };
    if (selection.mode === 'full_paper')
        matching.sort((a, b) => (a.source_question_number || 0) - (b.source_question_number || 0));
    else
        for (let i = matching.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [matching[i], matching[j]] = [matching[j], matching[i]];
        }
    const chosen = selection.mode === 'full_paper' ? matching : matching.slice(0, selection.count);
    const { data: session, error } = await supabase.from('test_sessions').insert({
        user_id: user.id, exam_id: exam.id, stream_id: stream?.id || null,
        subject_id: !full && filters.subjects.length === 1 ? filters.subjects[0] : null,
        topic_id: !full && filters.topics.length === 1 ? filters.topics[0] : null,
        year: filters.years.length === 1 ? filters.years[0] : null,
        paper: filters.papers.length === 1 ? filters.papers[0] : null, mode: selection.mode,
        question_ids: chosen.map(q => q.id), total_questions: chosen.length,
        duration_minutes: selection.timed ? selection.mode === 'full_paper' ? 180 : chosen.length : 0, status: 'in_progress',
    }).select('id').single();
    if (error || !session)
        return { error: 'Unable to create the test. Please try again.' };
    await supabase.from('user_question_history').upsert(chosen.map(q => ({ user_id: user.id, question_id: q.id })), { onConflict: 'user_id,question_id', ignoreDuplicates: true });
    return { sessionId: session.id };
}
