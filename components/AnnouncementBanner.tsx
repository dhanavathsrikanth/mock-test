"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Info, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";

const TYPE_CONFIG: Record<string, { icon: any; bg: string; border: string; text: string }> = {
  info: { icon: Info, bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300" },
  warning: { icon: AlertTriangle, bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-700 dark:text-yellow-300" },
  update: { icon: CheckCircle, bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-800", text: "text-green-700 dark:text-green-300" },
  maintenance: { icon: AlertCircle, bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-300" },
};

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("announcements")
      .select("id, title, body, type, starts_at, expires_at, is_active")
      .eq("is_active", true)
      .then(({ data, error }) => {
        if (error) {
          console.error("Announcement fetch error:", error);
          return;
        }
        if (!data) return;

        const now = new Date();
        const active = data.filter((a) => {
          if (a.starts_at && new Date(a.starts_at) > now) return false;
          if (a.expires_at && new Date(a.expires_at) < now) return false;
          return true;
        });

        setAnnouncements(active);
      });
  }, []);

  const visible = announcements.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((a) => {
        const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.info;
        const Icon = cfg.icon;
        return (
          <div
            key={a.id}
            className={`rounded-xl border p-3 sm:p-4 ${cfg.bg} ${cfg.border} flex items-start gap-3`}
          >
            <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${cfg.text}`} />
            <div className="flex-1 min-w-0">
              {a.title && <p className={`text-sm font-semibold ${cfg.text}`}>{a.title}</p>}
              <p className="text-sm">{a.body}</p>
            </div>
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(a.id))}
              className="shrink-0 p-0.5 rounded hover:bg-black/10"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
