import { topicDescendants } from './stream-scope';
export type PoolQuestion = {
    id: string;
    subject_id: string;
    topic_id: string | null;
    year: number | null;
    paper: string | null;
    source_question_number: number | null;
    marks: number | null;
    question_type?: string;
    marks_to_all?: boolean;
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
    years?: number[];
    papers?: string[];
    subjectIds?: string[];
    topicIds?: string[];
};
type TestFilters = Pick<TestSelection, 'year' | 'paper' | 'subjectId' | 'topicId' | 'years' | 'papers' | 'subjectIds' | 'topicIds'>;
export function testFilterValues(selection: TestFilters) {
    return { years: selection.years ?? (selection.year == null ? [] : [selection.year]),
        papers: selection.papers ?? (selection.paper ? [selection.paper] : []),
        subjects: selection.subjectIds ?? (selection.subjectId ? [selection.subjectId] : []),
        topics: selection.topicIds ?? (selection.topicId ? [selection.topicId] : []) };
}
export function filterTestPool(pool: PoolQuestion[], selection: TestFilters, topics: TestTopic[]) {
    const filters = testFilterValues(selection);
    const ids = filters.topics.length ? new Set(filters.topics.flatMap(id => topicDescendants(topics, id))) : null;
    return pool.filter(q => (!filters.years.length || (q.year != null && filters.years.includes(q.year))) &&
        (!filters.papers.length || (q.paper != null && filters.papers.includes(q.paper))) &&
        (!filters.subjects.length || filters.subjects.includes(q.subject_id)) && (!ids || (q.topic_id != null && ids.has(q.topic_id))));
}
export function validateTestSelection(selection: TestSelection, requiresStream: boolean): string | null {
    if (!['full_paper', 'full_mock', 'subject_wise', 'topic_wise', 'custom'].includes(selection.mode))
        return 'Choose a test mode.';
    if (!Number.isInteger(selection.count) || selection.count < 1 || selection.count > 150 || typeof selection.timed !== 'boolean')
        return 'Choose a valid question count and timer.';
    if (selection.year != null && (!Number.isInteger(selection.year) || selection.year < 1900 || selection.year > 2200))
        return 'Choose a valid source year.';
    if ([selection.paper, selection.subjectId, selection.topicId].some(value => value != null && typeof value !== 'string')) return 'Choose valid filter options.';
    for (const values of [selection.papers, selection.subjectIds, selection.topicIds]) {
        if (values !== undefined && (!Array.isArray(values) || values.length > 500 || values.some(value => typeof value !== 'string' || !value.trim()) || new Set(values).size !== values.length)) return 'Choose valid filter options.';
    }
    if (selection.years !== undefined && (!Array.isArray(selection.years) || selection.years.length > 301 || selection.years.some(year => !Number.isInteger(year) || year < 1900 || year > 2200) || new Set(selection.years).size !== selection.years.length)) return 'Choose valid source years.';
    const filters = testFilterValues(selection);
    if (selection.mode === 'full_paper' && (filters.years.length !== 1 || filters.papers.length !== 1)) return 'Choose exactly one year and paper / shift for a full paper.';
    if (requiresStream && (!selection.streamId || !filters.years.length || !filters.papers.length))
        return 'Select the source year and paper / shift for your stream.';
    if (requiresStream && selection.mode === 'full_mock')
        return 'Choose a full paper for this stream.';
    if (!requiresStream && selection.mode === 'full_paper')
        return 'Full paper selection is unavailable for this exam.';
    if ((selection.mode === 'subject_wise' || selection.mode === 'topic_wise') && !filters.subjects.length)
        return 'Choose a subject.';
    if (selection.mode === 'topic_wise' && !filters.topics.length)
        return 'Choose a topic or subtopic.';
    return null;
}
