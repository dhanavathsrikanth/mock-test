import { createClient } from "@/lib/supabase/server";
import { ConceptMapClient } from "./concept-map-client";

export default async function ConceptMapPage() {
  const supabase = await createClient();

  const [subjectsRes, topicsRes, qCountsRes, unlinkedRes] = await Promise.all([
    supabase.from("subjects").select("id, name, slug").order("name"),
    supabase.from("topics").select("*, subjects(name, slug)").order("sort_order"),
    supabase.from("questions").select("topic_id").limit(10000),
    supabase.from("questions").select("id", { count: "exact", head: true }).is("topic_id", null),
  ]);

  const qTopicCounts: Record<string, number> = {};
  (qCountsRes.data || []).forEach((q: any) => {
    if (q.topic_id) qTopicCounts[q.topic_id] = (qTopicCounts[q.topic_id] || 0) + 1;
  });

  const topics = (topicsRes.data || []).map((t: any) => ({
    ...t,
    questionCount: qTopicCounts[t.id] || 0,
    subjectName: t.subjects?.name || "",
    subjectSlug: t.subjects?.slug || "",
  }));

  return (
    <ConceptMapClient
      subjects={subjectsRes.data || []}
      topics={topics}
      unlinkedCount={unlinkedRes.count || 0}
    />
  );
}
