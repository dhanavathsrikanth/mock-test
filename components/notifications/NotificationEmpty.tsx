"use client";

import { Inbox, CheckCircle } from "lucide-react";

interface NotificationEmptyProps {
  type?: "all" | "unread" | string;
}

interface EmptyConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export function NotificationEmpty({ type = "all" }: NotificationEmptyProps) {
  const messages: Record<string, EmptyConfig> = {
    all: {
      icon: Inbox,
      title: "No notifications",
      description: "You're all caught up! New notifications will appear here.",
    },
    unread: {
      icon: CheckCircle,
      title: "No unread notifications",
      description: "All your notifications have been read.",
    },
  };

  const config = messages[type] || messages.all;
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">{config.title}</h3>
      <p className="text-xs text-muted-foreground/70 text-center max-w-[200px]">
        {config.description}
      </p>
    </div>
  );
}
