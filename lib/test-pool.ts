import { topicDescendants } from './stream-scope';
export type PoolQuestion = {
    id: string;
    subject_id: string;
    topic_id: string | null;
    year: number | null;
    paper: string | null;
    source_question_number: number | null;
    marks: number | null;
};
export type TestTopic = {
    id: string;
    subject_id: string;
    parent_id: string | null;
    name: string;
};
export type TestMode = 'full_paper' | 'full_mock' | 'subject_wise' | 'topic_wise' | 'custom';
export type TestSelection = {
    examId: string;
    streamId: string | null;
    mode: TestMode;
    year: number | null;
    paper: string | null;
    subjectId: string | null;
    topicId: string | null;
    count: number;
    timed: boolean;
};
export function filterTestPool(pool: PoolQuestion[], selection: Pick<TestSelection, 'year' | 'paper' | 'subjectId' | 'topicId'>, topics: TestTopic[]) {
    const ids = selection.topicId ? new Set(topicDescendants(topics, selection.topicId)) : null;
    return pool.filter(q => (selection.year == null || q.year === selection.year) &&
        (!selection.paper || q.paper === selection.paper) && (!selection.subjectId || q.subject_id === selection.subjectId) && (!ids || (q.topic_id != null && ids.has(q.topic_id))));
}
export function validateTestSelection(selection: TestSelection, requiresStream: boolean): string | null {
    if (!['full_paper', 'full_mock', 'subject_wise', 'topic_wise', 'custom'].includes(selection.mode))
        return 'Choose a test mode.';
    if (!Number.isInteger(selection.count) || selection.count < 1 || selection.count > 150 || typeof selection.timed !== 'boolean')
        return 'Choose a valid question count and timer.';
    if (selection.year != null && (!Number.isInteger(selection.year) || selection.year < 1900 || selection.year > 2200))
        return 'Choose a valid source year.';
    if (requiresStream && (!selection.streamId || !selection.year || typeof selection.paper !== 'string' || !selection.paper.trim()))
        return 'Select the source year and paper / shift for your stream.';
    if (requiresStream && selection.mode === 'full_mock')
        return 'Choose a full paper for this stream.';
    if (!requiresStream && selection.mode === 'full_paper')
        return 'Full paper selection is unavailable for this exam.';
    if ((selection.mode === 'subject_wise' || selection.mode === 'topic_wise') && !selection.subjectId)
        return 'Choose a subject.';
    if (selection.mode === 'topic_wise' && !selection.topicId)
        return 'Choose a topic or subtopic.';
    return null;
}
