"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Trophy,
  Clock,
  Megaphone,
  FileText,
  ClipboardList,
  BookOpen,
  TrendingUp,
  Flame,
  Users,
  Sparkles,
  Shield,
  Settings,
  Undo2,
  Archive,
  Trash2,
  MoreHorizontal,
  Bell,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/notifications/utils";
import type { Notification } from "@/types/notifications";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  system: Settings,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
  achievement: Trophy,
  reminder: Clock,
  marketing: Megaphone,
  exam: FileText,
  mock_test: ClipboardList,
  pyq: BookOpen,
  leaderboard: TrendingUp,
  streak: Flame,
  friend_activity: Users,
  feature_release: Sparkles,
  announcement: Megaphone,
  admin: Shield,
};

const colorMap: Record<string, string> = {
  system: "text-blue-500 bg-blue-500/10",
  success: "text-green-500 bg-green-500/10",
  warning: "text-yellow-500 bg-yellow-500/10",
  error: "text-red-500 bg-red-500/10",
  info: "text-blue-400 bg-blue-400/10",
  achievement: "text-purple-500 bg-purple-500/10",
  reminder: "text-orange-500 bg-orange-500/10",
  marketing: "text-pink-500 bg-pink-500/10",
  exam: "text-indigo-500 bg-indigo-500/10",
  mock_test: "text-cyan-500 bg-cyan-500/10",
  pyq: "text-teal-500 bg-teal-500/10",
  leaderboard: "text-amber-500 bg-amber-500/10",
  streak: "text-orange-500 bg-orange-500/10",
  friend_activity: "text-emerald-500 bg-emerald-500/10",
  feature_release: "text-violet-500 bg-violet-500/10",
  announcement: "text-sky-500 bg-sky-500/10",
  admin: "text-slate-500 bg-slate-500/10",
};

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onUndoDelete: (id: string) => void;
  isDeleted: boolean;
}

export function NotificationItem({
  notification,
  onMarkRead,
  onArchive,
  onDelete,
  onUndoDelete,
  isDeleted,
}: NotificationItemProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const IconComponent = iconMap[notification.type] || Bell;
  const iconColor = colorMap[notification.type] || "text-gray-500 bg-gray-500/10";

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
    const target = notification.deep_link_url || notification.link;
    if (target) {
      router.push(target);
    }
  };

  if (isDeleted) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-950/20 animate-pulse">
        <div className="flex items-center gap-3">
          <Trash2 className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-600 dark:text-red-400">Notification deleted</span>
        </div>
        <button
          onClick={() => onUndoDelete(notification.id)}
          className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
        >
          <Undo2 className="h-3 w-3" />
          Undo
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer group ${
        !notification.is_read ? "bg-primary/[0.03]" : ""
      }`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconColor}`}>
        <IconComponent className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm leading-snug ${
              !notification.is_read ? "font-semibold" : "font-normal"
            }`}
          >
            {notification.title}
          </p>
          {!notification.is_read && (
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
          )}
        </div>

        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-[10px] text-muted-foreground">
            {formatRelativeTime(notification.created_at)}
          </p>
          {notification.priority === "high" || notification.priority === "urgent" ? (
            <span className="text-[9px] font-medium uppercase text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded">
              {notification.priority}
            </span>
          ) : null}
        </div>
      </div>

      {isHovered && (
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded-md hover:bg-muted transition-colors"
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {!notification.is_read && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead(notification.id);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as read
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(notification.id);
                }}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
