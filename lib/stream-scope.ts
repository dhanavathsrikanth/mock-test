export type ExamStream = {
    id: string;
    exam_id: string;
    code: string;
    name: string;
};
/** Never treat a missing stream as permission to read every stream. */
export function streamCondition(stream: {
    id: string;
} | null): string {
    return stream ? `stream_id.eq.${stream.id}` : 'stream_id.is.null';
}
export type TopicNode = {
    id: string;
    parent_id: string | null;
};
export function topicDescendants(topics: TopicNode[], root: string): string[] {
    const ids = new Set([root]);
    let size = 0;
    while (size !== ids.size) {
        size = ids.size;
        for (const topic of topics)
            if (topic.parent_id && ids.has(topic.parent_id))
                ids.add(topic.id);
    }
    return [...ids];
}
