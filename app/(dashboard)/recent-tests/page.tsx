import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ClipboardList } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Recent Tests | TGPSC AEE Civil Prep" };

const modeLabels: Record<string, string> = {
  full_mock: "Full Mock",
  topic_wise: "Subject-wise",
  custom: "Custom",
};

export default async function RecentTestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const userId = user.id;

  const { data: sessions } = await supabase
    .from("test_sessions")
    .select(
      `id, total_questions, mode, completed_at, subject_id, subjects ( name )`
    )
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  const sessionIds = sessions?.map((s) => s.id) || [];

  const { data: allAnswers } =
    sessionIds.length > 0
      ? await supabase
          .from("test_answers")
          .select("session_id, is_correct")
          .in("session_id", sessionIds)
      : { data: [] };

  const sessionScores = (sessions || []).map((s) => {
    const sessionAnswers = (allAnswers || []).filter(
      (a) => a.session_id === s.id
    );
    const correct = sessionAnswers.filter((a) => a.is_correct === true).length;
    const total = s.total_questions;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { ...s, correct, score };
  });

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Recent Tests</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completed Tests</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionScores.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No tests completed yet. Start your first test from the sidebar!
            </p>
          ) : (
            <div className="divide-y">
              {sessionScores.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between py-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {(test as any).subjects?.name || "General"}
                      </span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {modeLabels[test.mode] || test.mode}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {test.completed_at
                        ? format(new Date(test.completed_at), "MMM d, yyyy h:mm a")
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {test.correct} / {test.total_questions} correct
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4 shrink-0">
                    <span
                      className={`text-sm font-semibold ${
                        test.score >= 60
                          ? "text-green-600 dark:text-green-400"
                          : test.score >= 35
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {test.score}%
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/result/${test.id}`}>Result</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/review/${test.id}`}>Review</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
