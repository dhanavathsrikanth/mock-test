import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return date.toLocaleDateString();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "\u2026";
}

export function getNotificationIcon(type: string): string {
  const iconMap: Record<string, string> = {
    system: "Settings",
    success: "CheckCircle",
    warning: "AlertTriangle",
    error: "XCircle",
    info: "Info",
    achievement: "Trophy",
    reminder: "Clock",
    marketing: "Megaphone",
    exam: "FileText",
    mock_test: "ClipboardList",
    pyq: "BookOpen",
    leaderboard: "TrendingUp",
    streak: "Flame",
    friend_activity: "Users",
    feature_release: "Sparkles",
    announcement: "Megaphone",
    admin: "Shield",
  };
  return iconMap[type] || "Bell";
}

export function getNotificationColor(type: string): string {
  const colorMap: Record<string, string> = {
    system: "text-blue-500",
    success: "text-green-500",
    warning: "text-yellow-500",
    error: "text-red-500",
    info: "text-blue-400",
    achievement: "text-purple-500",
    reminder: "text-orange-500",
    marketing: "text-pink-500",
    exam: "text-indigo-500",
    mock_test: "text-cyan-500",
    pyq: "text-teal-500",
    leaderboard: "text-amber-500",
    streak: "text-orange-500",
    friend_activity: "text-emerald-500",
    feature_release: "text-violet-500",
    announcement: "text-sky-500",
    admin: "text-slate-500",
  };
  return colorMap[type] || "text-gray-500";
}

export function isNotificationExpired(notification: { expires_at: string | null }): boolean {
  if (!notification.expires_at) return false;
  return new Date(notification.expires_at) < new Date();
}

export function buildNotificationGroupKey(type: string, referenceId?: string): string {
  if (referenceId) return `${type}:${referenceId}`;
  return type;
}

export function generateNotificationId(): string {
  return crypto.randomUUID();
}
