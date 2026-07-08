import { NotificationEventType, NotificationTemplate, NotificationType, NotificationPriority, NotificationChannel } from "@/types/notifications";
import { EVENT_TO_TEMPLATE_MAP } from "./constants";

type EventHandler = (payload: Record<string, unknown>) => NotificationTemplate | null | Promise<NotificationTemplate | null>;

const handlers = new Map<string, EventHandler>();

function registerHandler(eventType: NotificationEventType, handler: EventHandler) {
  handlers.set(eventType, handler);
}

export function getEventHandler(eventType: NotificationEventType): EventHandler | undefined {
  return handlers.get(eventType);
}

export function resolveNotificationTemplate(
  eventType: NotificationEventType,
  payload: Record<string, unknown>
): NotificationTemplate | null {
  const customHandler = handlers.get(eventType);
  if (customHandler) {
    const result = customHandler(payload);
    if (result && typeof result === "object" && "then" in result) {
      return null;
    }
    return result as NotificationTemplate | null;
  }

  const base = EVENT_TO_TEMPLATE_MAP[eventType];
  if (!base) return null;

  return {
    type: base.type,
    title: interpolateTemplate(base.title, payload),
    message: base.message ? interpolateTemplate(base.message, payload) : undefined,
    link: base.link ? interpolateTemplate(base.link, payload) : undefined,
    priority: base.priority,
    channel: base.channels,
    metadata: payload,
  };
}

function interpolateTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = data[key];
    return value !== undefined && value !== null ? String(value) : `{{${key}}}`;
  });
}

registerHandler(NotificationEventType.AchievementUnlocked, (payload) => ({
  type: NotificationType.Achievement,
  title: `Achievement Unlocked: ${payload.badge_name || "New Badge"}`,
  message: payload.description
    ? String(payload.description)
    : "You've earned a new achievement!",
  link: "/profile",
  priority: NotificationPriority.High,
  channel: [NotificationChannel.InApp, NotificationChannel.Push],
  group_key: `achievement:${payload.badge_id || "unknown"}`,
  metadata: payload,
  expires_in_hours: 168,
}));

registerHandler(NotificationEventType.StreakUpdated, (payload) => {
  const streak = Number(payload.current_streak || 0);
  return {
    type: NotificationType.Streak,
    title: streak > 1 ? `${streak}-Day Streak!` : "Streak Started!",
    message: `You're on a ${streak} day practice streak. Keep it up!`,
    link: "/dashboard",
    priority: streak >= 7 ? NotificationPriority.High : NotificationPriority.Normal,
    channel: [NotificationChannel.InApp, NotificationChannel.Push],
    group_key: "streak:daily",
    metadata: payload,
  };
});

registerHandler(NotificationEventType.AdminAnnouncement, (payload) => ({
  type: NotificationType.Announcement,
  title: String(payload.title || "Announcement"),
  message: payload.body ? String(payload.body) : undefined,
  link: String(payload.url || "/dashboard"),
  priority: NotificationPriority.High,
  channel: [NotificationChannel.InApp, NotificationChannel.Push],
  metadata: payload,
}));

registerHandler(NotificationEventType.TestCompleted, (payload) => ({
  type: NotificationType.Success,
  title: "Test Completed!",
  message: payload.score
    ? `You scored ${payload.score}% on ${payload.test_name || "your test"}`
    : "You've finished your test. View your results.",
  link: payload.session_id ? `/result/${payload.session_id}` : "/recent-tests",
  priority: NotificationPriority.Normal,
  metadata: payload,
}));

export { registerHandler };
