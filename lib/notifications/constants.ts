import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationEventType,
} from "@/types/notifications";

export const NOTIFICATION_PAGE_SIZE = 20;
export const NOTIFICATION_BELL_PAGE_SIZE = 10;
export const NOTIFICATION_MAX_RETRY_COUNT = 3;
export const NOTIFICATION_BATCH_SIZE = 100;
export const NOTIFICATION_POLL_INTERVAL_MS = 30_000;
export const NOTIFICATION_EXPIRY_HOURS = 168; // 7 days
export const NOTIFICATION_UNREAD_BADGE_MAX = 99;

export const CRON_SECRET_HEADER = "authorization";
export const CRON_BEARER_PREFIX = "Bearer ";

export const PUSH_SUBSCRIPTION_TTL_DAYS = 90;

export const QUEUE_MAX_CONCURRENT_JOBS = 10;
export const QUEUE_RETRY_DELAYS_MS = [1_000, 5_000, 30_000, 120_000, 600_000];

export const TYPE_TO_CHANNEL_MAP: Record<NotificationType, NotificationChannel[]> = {
  [NotificationType.System]: [NotificationChannel.InApp],
  [NotificationType.Success]: [NotificationChannel.InApp],
  [NotificationType.Warning]: [NotificationChannel.InApp],
  [NotificationType.Error]: [NotificationChannel.InApp],
  [NotificationType.Info]: [NotificationChannel.InApp],
  [NotificationType.Achievement]: [NotificationChannel.InApp, NotificationChannel.Push],
  [NotificationType.Reminder]: [NotificationChannel.InApp, NotificationChannel.Push],
  [NotificationType.Marketing]: [NotificationChannel.InApp],
  [NotificationType.Exam]: [NotificationChannel.InApp, NotificationChannel.Push],
  [NotificationType.MockTest]: [NotificationChannel.InApp],
  [NotificationType.PYQ]: [NotificationChannel.InApp],
  [NotificationType.Leaderboard]: [NotificationChannel.InApp],
  [NotificationType.Streak]: [NotificationChannel.InApp, NotificationChannel.Push],
  [NotificationType.FriendActivity]: [NotificationChannel.InApp],
  [NotificationType.FeatureRelease]: [NotificationChannel.InApp],
  [NotificationType.Announcement]: [NotificationChannel.InApp, NotificationChannel.Push],
  [NotificationType.Admin]: [NotificationChannel.InApp, NotificationChannel.Push],
};

export const EVENT_TO_TEMPLATE_MAP: Record<
  string,
  {
    type: NotificationType;
    title: string;
    message?: string;
    link?: string;
    priority?: NotificationPriority;
    channels?: NotificationChannel[];
  }
> = {
  [NotificationEventType.UserRegistered]: {
    type: NotificationType.System,
    title: "Welcome!",
    message: "Your account has been created. Start practicing now!",
    link: "/dashboard",
  },
  [NotificationEventType.TestCompleted]: {
    type: NotificationType.Success,
    title: "Test Completed!",
    message: "You've finished your test. View your results.",
    link: "/recent-tests",
  },
  [NotificationEventType.ResultGenerated]: {
    type: NotificationType.Info,
    title: "Results Ready",
    message: "Your test results are now available.",
    link: "/recent-tests",
  },
  [NotificationEventType.LeaderboardUpdated]: {
    type: NotificationType.Leaderboard,
    title: "Leaderboard Updated",
    message: "Check your new position on the leaderboard.",
    link: "/analytics",
  },
  [NotificationEventType.PYQsPublished]: {
    type: NotificationType.PYQ,
    title: "New PYQs Available",
    message: "New Previous Year Questions have been published.",
    link: "/test/select",
  },
  [NotificationEventType.MockTestPublished]: {
    type: NotificationType.MockTest,
    title: "New Mock Test",
    message: "A new mock test is now available.",
    link: "/test/select",
  },
  [NotificationEventType.AchievementUnlocked]: {
    type: NotificationType.Achievement,
    title: "Achievement Unlocked!",
    message: "You've earned a new badge!",
    link: "/profile",
    priority: NotificationPriority.High,
  },
  [NotificationEventType.StreakUpdated]: {
    type: NotificationType.Streak,
    title: "Streak Updated",
    message: "Your practice streak has been updated.",
    link: "/dashboard",
  },
  [NotificationEventType.AdminAnnouncement]: {
    type: NotificationType.Announcement,
    title: "Announcement",
    link: "/dashboard",
    priority: NotificationPriority.High,
    channels: [NotificationChannel.InApp, NotificationChannel.Push],
  },
  [NotificationEventType.PasswordChanged]: {
    type: NotificationType.System,
    title: "Password Changed",
    message: "Your password was successfully changed.",
    link: "/profile",
  },
};

export const AUDIENCE_TYPES = ["all", "active_7d", "streak_gt_7", "inactive_3d", "custom"] as const;
export type AudienceType = (typeof AUDIENCE_TYPES)[number];
