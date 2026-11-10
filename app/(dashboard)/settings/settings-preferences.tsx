"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LogOut, Shield } from "lucide-react";
import { useSignOut } from "@/hooks/use-sign-out";
import { createClient } from "@/lib/supabase/client";
import { BadgeGrid } from "@/components/badges/BadgeGrid";
import { NotificationPreferencesPanel } from "@/components/notifications/NotificationPreferences";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SettingsPreferencesProps {
  userId: string;
  examId: string;
  streamId: string | null;
  email?: string | null;
}

export function SettingsPreferences({ userId, examId, streamId, email }: SettingsPreferencesProps) {
  const router = useRouter();
  const { signOut, signingOut, signOutError } = useSignOut();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");

  const clearHistory = async () => {
    if (clearing) return;
    setClearing(true);
    setClearError("");
    const supabase = createClient();
    try {
      const [{ data: sessions, error: sessionsError }, { data: bookmarks, error: bookmarksError }] = await Promise.all([
        supabase.from("test_sessions").select("id").eq("user_id", userId).eq("exam_id", examId)
          .or(streamId ? `stream_id.eq.${streamId}` : "stream_id.is.null"),
        supabase.from("bookmarks").select("question_id, questions!inner(exam_id)").eq("user_id", userId)
          .eq("questions.exam_id", examId)
          .or(streamId ? `stream_id.eq.${streamId}` : "stream_id.is.null", { referencedTable: "questions" }),
      ]);
      if (sessionsError || bookmarksError) throw new Error("Unable to load this exam's history.");

      const sessionIds = (sessions ?? []).map(session => session.id);
      if (sessionIds.length) {
        const { error } = await supabase.from("test_answers").delete().in("session_id", sessionIds);
        if (error) throw error;
        const { error: deleteError } = await supabase.from("test_sessions").delete()
          .eq("user_id", userId).eq("exam_id", examId).in("id", sessionIds);
        if (deleteError) throw deleteError;
      }

      const questionIds = (bookmarks ?? []).map(bookmark => bookmark.question_id);
      if (questionIds.length) {
        const { error } = await supabase.from("bookmarks").delete().eq("user_id", userId).in("question_id", questionIds);
        if (error) throw error;
      }
      setConfirmingClear(false);
      router.refresh();
    } catch {
      setClearError("History could not be cleared. Please try again.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-8">
      <section aria-labelledby="appearance-heading" className="space-y-3">
        <div><h2 id="appearance-heading" className="text-lg font-semibold">Appearance</h2><p className="text-sm text-muted-foreground">Set how the study workspace looks on this device.</p></div>
        <Card><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Color theme</p><p className="text-sm text-muted-foreground">Choose light, dark, or follow your system.</p></div><ThemeSwitcher /></CardContent></Card>
      </section>

      <section aria-labelledby="notifications-heading" className="space-y-3">
        <div><h2 id="notifications-heading" className="text-lg font-semibold">Notifications</h2><p className="text-sm text-muted-foreground">Choose the updates and reminders you receive.</p></div>
        <NotificationPreferencesPanel />
      </section>

      <section aria-labelledby="account-heading" className="space-y-3">
        <div><h2 id="account-heading" className="text-lg font-semibold">Account</h2><p className="text-sm text-muted-foreground">Manage your current sign-in session.</p></div>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-muted-foreground" />Signed-in account</CardTitle><CardDescription>{email || "Your account email"}</CardDescription></CardHeader><CardContent className="space-y-3"><Button variant="outline" onClick={signOut} disabled={signingOut}><LogOut className="h-4 w-4" />{signingOut ? "Signing out…" : "Sign out"}</Button>{signOutError && <p role="alert" className="text-sm text-destructive">{signOutError}</p>}</CardContent></Card>
      </section>

      <section aria-labelledby="achievements-heading" className="space-y-3">
        <div><h2 id="achievements-heading" className="text-lg font-semibold">Achievements</h2><p className="text-sm text-muted-foreground">Review the study streak badges you have earned.</p></div>
        <BadgeGrid />
      </section>

      <section aria-labelledby="data-heading" className="space-y-3">
        <div><h2 id="data-heading" className="text-lg font-semibold">Study data</h2><p className="text-sm text-muted-foreground">Clear saved activity for the selected exam and stream.</p></div>
        <Card className="border-destructive/40"><CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" />Clear exam history</CardTitle><CardDescription>This permanently removes your test sessions, answers, and bookmarks for {streamId ? "the selected stream" : "unstreamed content"} in this exam.</CardDescription></CardHeader><CardContent className="space-y-3">{clearError && <p role="alert" className="text-sm text-destructive">{clearError}</p>}{confirmingClear ? <div className="flex flex-wrap gap-2"><Button variant="destructive" onClick={clearHistory} disabled={clearing}>{clearing ? "Deleting…" : "Confirm deletion"}</Button><Button variant="outline" onClick={() => setConfirmingClear(false)} disabled={clearing}>Cancel</Button></div> : <Button variant="destructive" onClick={() => setConfirmingClear(true)}>Clear exam history</Button>}</CardContent></Card>
      </section>
    </div>
  );
}
