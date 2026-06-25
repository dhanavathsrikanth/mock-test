"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCircle2, XCircle, Star, Reply, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("user_feedback").select("*, profiles(full_name, email)").order("created_at", { ascending: false }).then(({ data }) => setFeedback(data || []));
  }, []);

  const filtered = useMemo(() => {
    let items = [...feedback];
    if (filter === "unread") items = items.filter((f) => !f.is_read);
    else if (filter === "resolved") items = items.filter((f) => f.resolved_at);
    else if (filter === "unresolved") items = items.filter((f) => !f.resolved_at);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((f) => f.subject?.toLowerCase().includes(q) || f.message?.toLowerCase().includes(q) || f.profiles?.full_name?.toLowerCase().includes(q));
    }
    return items;
  }, [feedback, filter, search]);

  const markRead = async (id: string) => {
    await supabase.from("user_feedback").update({ is_read: true }).eq("id", id);
    setFeedback(feedback.map((f) => f.id === id ? { ...f, is_read: true } : f));
  };

  const resolve = async (id: string, resolved: boolean) => {
    await supabase.from("user_feedback").update({ resolved_at: resolved ? new Date().toISOString() : null }).eq("id", id);
    setFeedback(feedback.map((f) => f.id === id ? { ...f, resolved_at: resolved ? new Date().toISOString() : null } : f));
  };

  const handleReply = async (id: string) => {
    if (!replyText[id]?.trim()) return;
    setReplying(id);
    await supabase.from("user_feedback").update({ admin_reply: replyText[id], resolved_at: new Date().toISOString() }).eq("id", id);
    setReplying(null);
    setReplyText({ ...replyText, [id]: "" });
    const { data } = await supabase.from("user_feedback").select("*, profiles(full_name, email)").order("created_at", { ascending: false });
    setFeedback(data || []);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">User Feedback</h1><p className="text-sm text-muted-foreground mt-0.5">{feedback.length} submissions</p></div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-8" /></div>
        {["all", "unread", "unresolved", "resolved"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.length === 0 ? <div className="border rounded-xl p-12 text-center text-sm text-muted-foreground">No feedback found</div> : filtered.map((f) => (
          <div key={f.id} className={`border rounded-xl overflow-hidden ${!f.is_read ? "border-primary/30 bg-primary/[0.02]" : ""}`}>
            <div className="p-4 space-y-2" onClick={() => !f.is_read && markRead(f.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{f.profiles?.full_name || "Anonymous"}</p>
                    <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</span>
                    {f.rating && <span className="flex items-center text-xs text-yellow-500"><Star className="h-3 w-3 fill-current" />{f.rating}</span>}
                  </div>
                  {f.subject && <p className="text-xs text-muted-foreground mt-0.5">{f.subject}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {f.resolved_at ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                  {!f.resolved_at && <button onClick={() => resolve(f.id, true)} className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">Resolve</button>}
                  {f.resolved_at && <button onClick={() => resolve(f.id, false)} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Reopen</button>}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{f.message}</p>
              {f.admin_reply && (
                <div className="bg-muted/30 rounded-lg p-3 mt-2 border-l-2 border-primary/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Admin Reply</p>
                  <p className="text-sm">{f.admin_reply}</p>
                </div>
              )}
            </div>
            {!f.resolved_at && (
              <div className="border-t px-4 py-3 bg-muted/10 flex gap-2">
                <Input value={replyText[f.id] || ""} onChange={(e) => setReplyText({ ...replyText, [f.id]: e.target.value })}
                  placeholder="Reply..." className="h-8 text-xs" onKeyDown={(e) => e.key === "Enter" && handleReply(f.id)} />
                <Button size="sm" variant="ghost" onClick={() => handleReply(f.id)} disabled={!replyText[f.id]?.trim() || replying === f.id}>
                  {replying === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Reply className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
