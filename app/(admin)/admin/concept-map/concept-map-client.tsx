"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MathText } from "@/components/MathText";
import {
  ChevronRight, ChevronDown, Plus, Trash2, Pencil, GripVertical,
  Search, Link2, Unlink, Download, Loader2, Check, X, AlertTriangle,
  BookOpen, Network, BarChart3, Users, Target, FileDown, Save,
} from "lucide-react";

const EMOJIS = ["📚", "📐", "🔬", "📖", "🧮", "⚡", "🌍", "🧬", "📝", "🎯", "💡", "📊", "🏛️", "🔢", "🧪", "📜", "⚙️", "🔧", "📏", "🧠", "🗺️", "📈", "🔬", "🖥️", "💻"];

type Topic = { id: string; subject_id: string; parent_id: string | null; name: string; description: string | null; icon: string; level: number; x_position: number | null; y_position: number | null; sort_order: number; questionCount: number; subjectName: string; subjectSlug: string; };
type Subject = { id: string; name: string; slug: string; };

export function ConceptMapClient({ subjects, topics, unlinkedCount }: { subjects: Subject[]; topics: Topic[]; unlinkedCount: number }) {
  const router = useRouter();
  const supabase = createClient();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Concept Map</h1><p className="text-sm text-muted-foreground mt-0.5">{topics.length} topics · {subjects.length} subjects · {unlinkedCount} unlinked questions</p></div>
      </div>
      <TabbedConceptMap subjects={subjects} topics={topics} unlinkedCount={unlinkedCount} routerRefresh={() => router.refresh()} />
    </div>
  );
}

function TabbedConceptMap({ subjects, topics, unlinkedCount, routerRefresh }: { subjects: Subject[]; topics: Topic[]; unlinkedCount: number; routerRefresh: () => void }) {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [
    { label: "Node Manager", icon: Network },
    { label: "Question Links", icon: Link2 },
    { label: "Coverage Stats", icon: BarChart3 },
  ];

  return (
    <div>
      <div className="flex border-b mb-6">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === i ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>
      {activeTab === 0 && <NodeManagerTab subjects={subjects} topics={topics} routerRefresh={routerRefresh} />}
      {activeTab === 1 && <QuestionLinksTab subjects={subjects} topics={topics} unlinkedCount={unlinkedCount} routerRefresh={routerRefresh} />}
      {activeTab === 2 && <CoverageStatsTab subjects={subjects} topics={topics} />}
    </div>
  );
}

/* ──────── TAB 1: NODE MANAGER ──────── */

function NodeManagerTab({ subjects, topics, routerRefresh }: { subjects: Subject[]; topics: Topic[]; routerRefresh: () => void }) {
  const { confirmDialog } = useConfirm();
  const [subjectFilter, setSubjectFilter] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", icon: "📚", level: 0, parentId: "", subjectId: "", x: "", y: "" });
  const [addingChild, setAddingChild] = useState<string | null>(null);
  const [childName, setChildName] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const supabase = createClient();

  const filteredTopics = useMemo(() => {
    if (!subjectFilter) return topics;
    return topics.filter((t) => t.subject_id === subjectFilter);
  }, [topics, subjectFilter]);

  const getRootTopics = (list: Topic[]) => list.filter((t) => !t.parent_id);
  const getChildren = (list: Topic[], parentId: string) => list.filter((t) => t.parent_id === parentId);

  const startEdit = (t: Topic) => {
    setEditingId(t.id);
    setEditForm({ name: t.name, icon: t.icon || "📚", level: t.level ?? 0, parentId: t.parent_id || "", subjectId: t.subject_id, x: t.x_position?.toString() || "", y: t.y_position?.toString() || "" });
  };

  const saveEdit = async () => {
    if (!editForm.name.trim() || !editingId) return;
    setSaving(true);
    await supabase.from("topics").update({
      name: editForm.name, icon: editForm.icon, level: editForm.level,
      parent_id: editForm.parentId || null,
      x_position: editForm.x ? parseFloat(editForm.x) : null,
      y_position: editForm.y ? parseFloat(editForm.y) : null,
    }).eq("id", editingId);
    setSaving(false);
    setEditingId(null);
    routerRefresh();
  };

  const handleDelete = async (id: string) => {
    const children = getChildren(filteredTopics, id);
    const t = topics.find((x) => x.id === id);
    if (t && t.questionCount > 0 && !await confirmDialog({ title: "Delete Node", message: `This node has ${t.questionCount} linked questions. Delete anyway?` })) return;
    if (children.length > 0 && !await confirmDialog({ title: "Delete Node", message: `This node has ${children.length} child nodes. Delete all?` })) return;
    if (!t?.questionCount && !children.length && !await confirmDialog({ title: "Delete Node", message: `Delete "${t?.name}"?` })) return;
    await supabase.from("topics").delete().eq("id", id);
    routerRefresh();
  };

  const handleAddChild = async (parentId: string) => {
    if (!childName.trim()) return;
    setSaving(true);
    const parent = topics.find((t) => t.id === parentId);
    await supabase.from("topics").insert({
      subject_id: parent?.subject_id || "", parent_id: parentId, name: childName.trim(), sort_order: getChildren(filteredTopics, parentId).length,
    });
    setSaving(false);
    setAddingChild(null);
    setChildName("");
    setExpanded({ ...expanded, [parentId]: true });
    routerRefresh();
  };

  const handleDrop = async (topicId: string, targetParentId: string | null, newSort: number) => {
    await supabase.from("topics").update({ parent_id: targetParentId, sort_order: newSort }).eq("id", topicId);
    routerRefresh();
  };

  const renderNode = (node: Topic, allTopics: Topic[], depth = 0) => {
    const children = getChildren(allTopics, node.id);
    const hasChildren = children.length > 0;
    const isOpen = expanded[node.id];
    const isEditing = editingId === node.id;

    return (
      <div key={node.id}>
        <div
          draggable
          onDragStart={() => setDragId(node.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (dragId && dragId !== node.id) handleDrop(dragId, node.parent_id, node.sort_order); setDragId(null); }}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm group hover:bg-muted/20 transition-colors ${isEditing ? "bg-muted/30 ring-1 ring-primary/20" : ""}`}
          style={{ marginLeft: depth * 24 }}
        >
          {/* Drag handle */}
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 cursor-grab" />

          {/* Expand/collapse */}
          <button onClick={() => setExpanded({ ...expanded, [node.id]: !isOpen })} className="shrink-0 w-4">
            {hasChildren ? (isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />) : null}
          </button>

          {/* Icon */}
          <span className="text-base shrink-0">{node.icon || "📚"}</span>

          {isEditing ? (
            <>
              <select value={editForm.icon} onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                className="h-7 w-10 rounded border border-input bg-background text-center text-base">
                {EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-7 text-xs flex-1 min-w-[120px]" />
              <select value={editForm.level} onChange={(e) => setEditForm({ ...editForm, level: parseInt(e.target.value) })}
                className="h-7 w-16 rounded border border-input bg-background text-[10px]">
                {[0, 1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>L{l}</option>)}
              </select>
              <select value={editForm.parentId} onChange={(e) => setEditForm({ ...editForm, parentId: e.target.value })}
                className="h-7 w-24 rounded border border-input bg-background text-[10px] hidden sm:block">
                <option value="">Root</option>
                {allTopics.filter((t) => t.id !== node.id && t.subject_id === node.subject_id).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={saveEdit} className="p-0.5 rounded hover:bg-green-50"><Check className="h-3.5 w-3.5 text-green-600" /></button>
                <button onClick={() => setEditingId(null)} className="p-0.5 rounded hover:bg-red-50"><X className="h-3.5 w-3.5 text-destructive" /></button>
              </div>
            </>
          ) : (
            <>
              <span className="flex-1 truncate min-w-0">{node.name}</span>
              <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                node.level === 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20" :
                node.level === 1 ? "bg-green-100 text-green-700 dark:bg-green-900/20" :
                "bg-muted text-muted-foreground"
              }`}>L{node.level ?? 0}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{node.questionCount}Q</span>

              {/* Quick actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                <button onClick={() => { setAddingChild(node.id); setChildName(""); }} className="p-0.5 rounded hover:bg-muted"><Plus className="h-3 w-3 text-muted-foreground" /></button>
                <button onClick={() => startEdit(node)} className="p-0.5 rounded hover:bg-muted"><Pencil className="h-3 w-3 text-muted-foreground" /></button>
                <button onClick={() => handleDelete(node.id)} className="p-0.5 rounded hover:bg-red-50"><Trash2 className="h-3 w-3 text-destructive" /></button>
              </div>
            </>
          )}
        </div>

        {/* Inline add child */}
        {addingChild === node.id && (
          <div className="flex items-center gap-2 ml-[72px] mb-1 mt-0.5" style={{ marginLeft: 72 + depth * 24 }}>
            <Input value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Child topic name" className="h-7 text-xs flex-1" autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAddChild(node.id)} />
            <Button size="sm" variant="ghost" onClick={() => handleAddChild(node.id)} disabled={!childName.trim() || saving} className="h-7 px-2 text-xs">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAddingChild(null)} className="h-7 px-2 text-xs"><X className="h-3 w-3" /></Button>
          </div>
        )}

        {/* Children */}
        {isOpen && hasChildren && children.map((c) => renderNode(c, allTopics, depth + 1))}
      </div>
    );
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Tree */}
      <div className="lg:col-span-2 border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm flex items-center gap-1.5"><Network className="h-4 w-4" /> Concept Tree</h2>
          <div className="flex items-center gap-2">
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs">
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">{filteredTopics.length} nodes</span>
          </div>
        </div>
        <div className="space-y-0.5 max-h-[600px] overflow-y-auto">
          {subjectFilter && !getRootTopics(filteredTopics).length && (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">No concepts for this subject</div>
          )}
          {!subjectFilter && subjects.map((s) => {
            const subjTopics = getRootTopics(topics.filter((t) => t.subject_id === s.id));
            if (!subjTopics.length) return null;
            return (
              <div key={s.id} className="mb-2">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">{s.name}</div>
                {subjTopics.map((t) => renderNode(t, topics))}
              </div>
            );
          })}
          {subjectFilter && getRootTopics(filteredTopics).map((t) => renderNode(t, filteredTopics))}
          {!subjectFilter && subjects.every((s) => !getRootTopics(topics.filter((t) => t.subject_id === s.id)).length) && (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">No concept nodes yet</div>
          )}
        </div>
      </div>

      {/* Visual position editor */}
      <div className="border rounded-xl p-4 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-1.5"><Target className="h-4 w-4" /> Position Editor</h2>
        <p className="text-xs text-muted-foreground">Set X/Y coordinates for map layout visualization.</p>
        <div className="space-y-3">
          {subjectFilter ? getRootTopics(filteredTopics).map((t) => (
            <PositionRow key={t.id} topic={t} routerRefresh={routerRefresh} />
          )) : subjects.slice(0, 3).map((s) => {
            const roots = getRootTopics(topics.filter((t) => t.subject_id === s.id));
            if (!roots.length) return null;
            return (
              <div key={s.id}>
                <p className="text-[10px] font-medium text-muted-foreground mb-1">{s.name}</p>
                {roots.slice(0, 5).map((t) => <PositionRow key={t.id} topic={t} routerRefresh={routerRefresh} />)}
              </div>
            );
          })}
          {topics.length === 0 && <p className="text-xs text-muted-foreground">No nodes to position</p>}
        </div>
      </div>
    </div>
  );
}

function PositionRow({ topic, routerRefresh }: { topic: Topic; routerRefresh: () => void }) {
  const [x, setX] = useState(topic.x_position?.toString() || "");
  const [y, setY] = useState(topic.y_position?.toString() || "");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const save = async () => {
    setSaving(true);
    await supabase.from("topics").update({
      x_position: x ? parseFloat(x) : null,
      y_position: y ? parseFloat(y) : null,
    }).eq("id", topic.id);
    setSaving(false);
    routerRefresh();
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs truncate flex-1 min-w-0">{topic.icon} {topic.name}</span>
      <Input value={x} onChange={(e) => setX(e.target.value)} placeholder="X" className="h-7 w-14 text-[10px] text-center" />
      <Input value={y} onChange={(e) => setY(e.target.value)} placeholder="Y" className="h-7 w-14 text-[10px] text-center" />
      <button onClick={save} disabled={saving} className="p-0.5 shrink-0"><Save className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>
    </div>
  );
}

/* ──────── TAB 2: QUESTION LINKS ──────── */

function QuestionLinksTab({ subjects, topics, unlinkedCount, routerRefresh }: { subjects: Subject[]; topics: Topic[]; unlinkedCount: number; routerRefresh: () => void }) {
  const [search, setSearch] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [showUnlinked, setShowUnlinked] = useState(false);
  const [unlinkedQuestions, setUnlinkedQuestions] = useState<any[]>([]);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkTarget, setBulkTarget] = useState("");
  const [bulking, setBulking] = useState(false);
  const [linkedCounts, setLinkedCounts] = useState<Record<string, number>>({});
  const supabase = createClient();

  const searchQuestions = useCallback(async (q?: string) => {
    const query = q ?? search;
    if (!query.trim()) { setQuestions([]); return; }
    setLoading(true);
    const { data } = await supabase.from("questions").select("id, question_text, topic_id, subject_id, subjects(name)").ilike("question_text", `%${query}%`).limit(30);
    setQuestions(data || []);
    setLoading(false);
  }, [search]);

  const loadUnlinked = useCallback(async () => {
    setLoading(true);
    setShowUnlinked(true);
    const { data } = await supabase.from("questions").select("id, question_text, subject_id, subjects(name)").is("topic_id", null).limit(50);
    setUnlinkedQuestions(data || []);
    setLoading(false);
  }, []);

  const handleLink = async (questionId: string, topicId: string) => {
    setSaving(questionId);
    await supabase.from("questions").update({ topic_id: topicId || null }).eq("id", questionId);
    setSaving(null);
    setQuestions(questions.map((q) => q.id === questionId ? { ...q, topic_id: topicId } : q));
    setUnlinkedQuestions(unlinkedQuestions.filter((q) => q.id !== questionId));
    routerRefresh();
  };

  const handleBulkLink = async () => {
    if (!bulkSubject || !bulkTarget) return;
    setBulking(true);
    await supabase.from("questions").update({ topic_id: bulkTarget }).eq("subject_id", bulkSubject).is("topic_id", null);
    setBulking(false);
    setShowUnlinked(false);
    routerRefresh();
  };

  const getLinkedCount = (topicId: string) => {
    return topics.find((t) => t.id === topicId)?.questionCount || 0;
  };

  const topicTree = (parentId: string | null = null, depth = 0): any[] => {
    return topics.filter((t) => t.parent_id === parentId).map((t) => ({
      ...t,
      linkedCount: getLinkedCount(t.id),
      children: topicTree(t.id, depth + 1),
    }));
  };

  const renderTopicOption = (t: any, depth = 0) => (
    <option key={t.id} value={t.id}>
      {"  ".repeat(depth)}{t.icon} {t.name} ({t.linkedCount}Q)
    </option>
  );

  const flattenTopics = (nodes: any[]): any[] => {
    const result: any[] = [];
    const walk = (list: any[], d: number) => {
      list.forEach((n) => { result.push({ ...n, _depth: d }); walk(n.children || [], d + 1); });
    };
    walk(nodes, 0);
    return result;
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left: Questions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchQuestions()}
              placeholder="Search questions..." className="pl-8 h-9" />
          </div>
          <Button size="sm" variant="outline" onClick={() => searchQuestions()} disabled={loading} className="h-9">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <div className="border rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
          {!showUnlinked && questions.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground space-y-2">
              <p>Search for questions to link</p>
              <Button size="sm" variant="outline" onClick={loadUnlinked} className="text-xs">
                <Unlink className="h-3 w-3 mr-1" /> Show {unlinkedCount} Unlinked
              </Button>
            </div>
          )}
          {showUnlinked && (
            <div>
              <div className="px-4 py-2.5 border-b bg-amber-50 dark:bg-amber-950/10 flex items-center justify-between">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{unlinkedQuestions.length} Unlinked Questions</span>
                <button onClick={() => setShowUnlinked(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
              </div>
              {unlinkedQuestions.map((q) => (
                <div key={q.id} className="px-4 py-2.5 border-b last:border-0 hover:bg-muted/20 flex items-center gap-2">
                  <MathText text={q.question_text} className="flex-1 text-xs line-clamp-1 min-w-0" />
                  <span className="text-[10px] text-muted-foreground shrink-0">{q.subjects?.name}</span>
                  <select onChange={(e) => handleLink(q.id, e.target.value)} value=""
                    className="h-7 w-28 rounded border border-input bg-background text-[10px] shrink-0">
                    <option value="">Link to...</option>
                    {topics.filter((t) => t.subject_id === q.subject_id).map((t) => (
                      <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
          {questions.map((q) => (
            <div key={q.id} className="px-4 py-2.5 border-b last:border-0 hover:bg-muted/20 flex items-center gap-2">
              <MathText text={q.question_text} className="flex-1 text-xs line-clamp-1 min-w-0" />
              <span className="text-[10px] text-muted-foreground shrink-0">{q.subjects?.name}</span>
              <select value={q.topic_id || ""} onChange={(e) => handleLink(q.id, e.target.value)}
                className="h-7 w-28 rounded border border-input bg-background text-[10px] shrink-0">
                <option value="">None</option>
                {topics.filter((t) => t.subject_id === q.subject_id).map((t) => (
                  <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                ))}
              </select>
              {saving === q.id ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : q.topic_id ? <Check className="h-3 w-3 text-green-500 shrink-0" /> : null}
            </div>
          ))}
        </div>

        {/* Bulk link */}
        <div className="border rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-medium flex items-center gap-1"><Link2 className="h-3.5 w-3.5" /> Bulk Link by Subject</h3>
          <div className="flex items-center gap-2">
            <select value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs flex-1">
              <option value="">Select subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={bulkTarget} onChange={(e) => setBulkTarget(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs flex-1">
              <option value="">Target node</option>
              {flattenTopics(topicTree()).map((t) => (
                <option key={t.id} value={t.id}>{"  ".repeat(t._depth)}{t.icon} {t.name}</option>
              ))}
            </select>
            <Button size="sm" onClick={handleBulkLink} disabled={!bulkSubject || !bulkTarget || bulking} className="h-8 text-xs">
              {bulking ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Link All
            </Button>
          </div>
        </div>
      </div>

      {/* Right: Concept tree with counts */}
      <div className="border rounded-xl p-4 max-h-[600px] overflow-y-auto">
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-1.5"><Network className="h-4 w-4" /> Concept Nodes</h2>
        <div className="space-y-0.5">
          {subjects.map((s) => {
            const roots = topics.filter((t) => t.subject_id === s.id && !t.parent_id);
            if (!roots.length) return null;
            return (
              <div key={s.id}>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">{s.name}</div>
                {roots.map((r) => renderConceptNode(r, topics))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function renderConceptNode(node: Topic, allTopics: Topic[], depth = 0): React.ReactNode {
  const children = allTopics.filter((t) => t.parent_id === node.id);
  const hasChildren = children.length > 0;
  const [open, setOpen] = useState(false);

  return (
    <div key={node.id}>
      <div className="flex items-center gap-2 px-2 py-1 rounded-lg text-sm hover:bg-muted/20" style={{ marginLeft: depth * 16 }}>
        {hasChildren ? (
          <button onClick={() => setOpen(!open)} className="shrink-0">
            {open ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </button>
        ) : <span className="w-3 shrink-0" />}
        <span className="text-sm">{node.icon || "📚"}</span>
        <span className="flex-1 text-xs truncate">{node.name}</span>
        <span className="text-[10px] font-medium tabular-nums">{node.questionCount}Q</span>
      </div>
      {open && hasChildren && children.map((c) => renderConceptNode(c, allTopics, depth + 1))}
    </div>
  );
}

/* ──────── TAB 3: COVERAGE STATS ──────── */

function CoverageStatsTab({ subjects, topics }: { subjects: Subject[]; topics: Topic[] }) {
  const [subjectFilter, setSubjectFilter] = useState("");
  const supabase = createClient();

  const filtered = useMemo(() => {
    if (!subjectFilter) return topics;
    return topics.filter((t) => t.subject_id === subjectFilter);
  }, [topics, subjectFilter]);

  const zeroQuestionNodes = filtered.filter((t) => t.questionCount === 0);
  const totalQuestions = topics.reduce((s, t) => s + t.questionCount, 0);

  const exportCsv = () => {
    const header = "Subject,Node,Level,Parent,Questions,Icon\n";
    const rows = filtered.map((t) => {
      const parent = topics.find((p) => p.id === t.parent_id);
      return `${t.subjectName},"${t.name}",${t.level ?? 0},"${parent?.name || ""}",${t.questionCount},${t.icon || "📚"}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "concept-map-nodes.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const coverageBySubject = useMemo(() => {
    return subjects.map((s) => {
      const subjTopics = topics.filter((t) => t.subject_id === s.id);
      const withQ = subjTopics.filter((t) => t.questionCount > 0);
      const qCount = subjTopics.reduce((sum, t) => sum + t.questionCount, 0);
      return { ...s, totalTopics: subjTopics.length, coveredTopics: withQ.length, questionCount: qCount };
    });
  }, [subjects, topics]);

  return (
    <div className="space-y-6">
      {/* Subject coverage cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-xl p-4"><Users className="h-4 w-4 text-blue-500 mb-1" /><p className="text-2xl font-bold">{topics.length}</p><p className="text-xs text-muted-foreground">Total Nodes</p></div>
        <div className="border rounded-xl p-4"><BookOpen className="h-4 w-4 text-green-500 mb-1" /><p className="text-2xl font-bold">{totalQuestions}</p><p className="text-xs text-muted-foreground">Total Questions</p></div>
        <div className="border rounded-xl p-4"><AlertTriangle className="h-4 w-4 text-orange-500 mb-1" /><p className="text-2xl font-bold">{zeroQuestionNodes.length}</p><p className="text-xs text-muted-foreground">Nodes w/o Questions</p></div>
        <div className="border rounded-xl p-4"><Target className="h-4 w-4 text-purple-500 mb-1" /><p className="text-2xl font-bold">{totalQuestions > 0 ? Math.round((topics.filter((t) => t.questionCount > 0).length / topics.length) * 100) : 0}%</p><p className="text-xs text-muted-foreground">Coverage Rate</p></div>
      </div>

      {/* Subject coverage */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Subject Coverage</h2>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Subject</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Nodes</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Covered</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Questions</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Coverage</th>
          </tr></thead>
          <tbody>
            {coverageBySubject.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium text-sm">{s.name}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">{s.totalTopics}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">{s.coveredTopics}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">{s.questionCount}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${s.totalTopics > 0 ? (s.coveredTopics / s.totalTopics) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs tabular-nums">{s.totalTopics > 0 ? Math.round((s.coveredTopics / s.totalTopics) * 100) : 0}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {coverageBySubject.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">No subjects</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Node detail table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Node Detail</h2>
          <div className="flex items-center gap-2">
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs">
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={exportCsv} className="h-8 text-xs">
              <FileDown className="h-3.5 w-3.5 mr-1" /> CSV
            </Button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Node</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Subject</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Level</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Questions</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Status</th>
          </tr></thead>
          <tbody>
            {filtered.map((t) => {
              const parent = topics.find((p) => p.id === t.parent_id);
              return (
                <tr key={t.id} className={`border-b last:border-0 hover:bg-muted/20 ${t.questionCount === 0 ? "bg-orange-50/50 dark:bg-orange-950/5" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{t.icon || "📚"}</span>
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        {parent && <p className="text-[10px] text-muted-foreground">Parent: {parent.name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{t.subjectName}</td>
                  <td className="px-4 py-3 text-center"><span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium">L{t.level ?? 0}</span></td>
                  <td className="px-4 py-3 text-center tabular-nums">{t.questionCount}</td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {t.questionCount === 0 ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 flex items-center gap-1 w-fit mx-auto">
                        <AlertTriangle className="h-3 w-3" /> Needs Content
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">Covered</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">No nodes</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
