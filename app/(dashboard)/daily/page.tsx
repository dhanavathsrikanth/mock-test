"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ReportButton } from "@/components/report/ReportButton";

interface DailyData {
  id: string;
  assignedDate: string;
  question: {
    id: string;
    text: string;
    options: string[];
    correctOption: number | null;
    explanation: string | null;
    year: number | null;
    subject: string | null;
  };
  userAnswer: { selectedOption: number; isCorrect: boolean } | null;
}

interface HistoryItem {
  id: string;
  assignedDate: string;
  question: { subject: string | null };
  userAnswer: { isCorrect: boolean } | null;
}

export default function DailyQuestionPage() {
  const [data, setData] = useState<DailyData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ isCorrect: boolean; correctOption: number; explanation: string } | null>(null);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const [dailyRes, histRes] = await Promise.all([
        fetch("/api/daily-question"),
        fetch("/api/daily-question?history=true"),
      ]);
      
      if (dailyRes.ok) {
        const json = await dailyRes.json();
        setData(json);
        if (json.userAnswer) {
          setResult({
            isCorrect: json.userAnswer.isCorrect,
            correctOption: json.question.correctOption,
            explanation: json.question.explanation,
          });
          setSelected(json.userAnswer.selectedOption);
        }
      }
      if (histRes.ok) {
        const histJson = await histRes.json();
        setHistory(histJson.history || []);
      }
    }
    load();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!data || selected === null || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/daily-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyQuestionId: data.id,
          selectedOption: selected,
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 409) {
          alert("You have already answered this question.");
        } else {
          alert(err.error || "Export failed");
        }
      } else {
        const json = await res.json();
        setResult({
          isCorrect: json.isCorrect,
          correctOption: json.correctOption,
          explanation: json.explanation,
        });
        setXpAwarded(json.xpAwarded);
        if (typeof window !== "undefined") {
          const { useXPStore } = await import("@/lib/stores/xp-store");
          useXPStore.getState().addToast(json.xpAwarded, json.isCorrect ? "Daily question correct" : "Daily question attempted");
          if (json.leveledUp) {
            useXPStore.getState().showLevelUp({
              levelName: json.newLevelName,
              levelNumber: json.newLevelNumber,
              xpGained: json.xpAwarded,
            });
          }
        }
      }
    } catch (e) {
      alert("Export failed");
    }
    setSubmitting(false);
  }, [data, selected, submitting]);

  const handleBookmark = async () => {
    if (!data?.question?.id) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    if (bookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("question_id", data.question.id);
      setBookmarked(false);
    } else {
      await supabase
        .from("bookmarks")
        .insert({ user_id: user.id, question_id: data.question.id });
      setBookmarked(true);
    }
  };

  useEffect(() => {
    const check = async () => {
      if (!data?.question?.id) return;
      const qid = data.question.id;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: bm } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("question_id", qid)
        .single();
      
      setBookmarked(!!bm);
    };
    check();
  }, [data?.question?.id]);

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight flex items-center">
          <span>📅</span>
          Daily Question — {format(new Date(data.assignedDate), "MMMM d, yyyy")}
        </h1>
        <div className="flex items-center gap-2">
          {data.question.subject && (
            <Badge variant="secondary">
              {data.question.subject}
            </Badge>
          )}
          {data.question.year && (
            <Badge variant="outline">
              {data.question.year}
            </Badge>
          )}
        </div>
        
        {/* XP Badge */}
        <div className="flex items-center gap-4">
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 text-sm">
            ✦ +{result ? (result.isCorrect ? 25 : 10) : 25} XP
          </Badge>
        </div>
        
        {/* Question Card */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-3">
              <p className="text-lg font-medium">
                {data.question.text}
              </p>
              
              <div className="space-y-3">
                {data.question.options.map((opt, idx) => {
                  const optNum = idx + 1;
                  const isSelected = selected === idx;
                  const isCorrect = result?.correctOption === idx;
                  const optionClass = 
                    result 
                      ? (isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950/30 ring-1 ring-green-500" 
                        : isSelected 
                          ? "border-red-500 bg-red-50 dark:bg-red-950/30 ring-1 ring-red-500" 
                          : "border-border opacity-60") 
                      : "border-border opacity-60";
                  
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!!result}
                      className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-all ${optionClass}`}
                    >
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-medium mr-3">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleBookmark}
                  className="flex items-center gap-2">
                  <Bookmark 
                    className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} 
                  />
                  {bookmarked ? "Bookmarked" : "Bookmark this question"}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild
                >
                  <Link href={`/review?question=${data.question.id}`}>
                    Discuss this question
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center pt-2">
                Come back tomorrow for a new question!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
