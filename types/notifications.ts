export enum NotificationType {
  System = "system",
  Success = "success",
  Warning = "warning",
  Error = "error",
  Info = "info",
  Achievement = "achievement",
  Reminder = "reminder",
  Marketing = "marketing",
  Exam = "exam",
  MockTest = "mock_test",
  PYQ = "pyq",
  Leaderboard = "leaderboard",
  Streak = "streak",
  FriendActivity = "friend_activity",
  FeatureRelease = "feature_release",
  Announcement = "announcement",
  Admin = "admin",
}

export enum NotificationChannel {
  InApp = "in_app",
  Push = "push",
  Email = "email",
}

export enum NotificationPriority {
  Low = "low",
  Normal = "normal",
  High = "high",
  Urgent = "urgent",
}

export enum NotificationStatus {
  Pending = "pending",
  Delivered = "delivered",
  Failed = "failed",
  Archived = "archived",
  Deleted = "deleted",
  Scheduled = "scheduled",
  Expired = "expired",
}

export enum NotificationEventType {
  UserRegistered = "user_registered",
  TestCompleted = "test_completed",
  ResultGenerated = "result_generated",
  LeaderboardUpdated = "leaderboard_updated",
  PYQsPublished = "pyqs_published",
  MockTestPublished = "mock_test_published",
  FriendRequestAccepted = "friend_request_accepted",
  AchievementUnlocked = "achievement_unlocked",
  StreakUpdated = "streak_updated",
  ProfileCompleted = "profile_completed",
  AdminAnnouncement = "admin_announcement",
  SubscriptionUpdated = "subscription_updated",
  PasswordChanged = "password_changed",
  DailyReminder = "daily_reminder",
  StreakAlert = "streak_alert",
  DailyQuestionAlert = "daily_question_alert",
  ExamDateAlert = "exam_date_alert",
  Custom = "custom",
}

export enum DeliveryStatus {
  Pending = "pending",
  Sent = "sent",
  Delivered = "delivered",
  Failed = "failed",
  Retrying = "retrying",
  Bounced = "bounced",
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  deep_link_url: string | null;
  image_url: string | null;
  is_read: boolean;
  read_at: string | null;
  status: NotificationStatus;
  priority: NotificationPriority;
  channel: NotificationChannel;
  group_key: string | null;
  metadata: Record<string, unknown> | null;
  expires_at: string | null;
  archived_at: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  system: boolean;
  success: boolean;
  warning: boolean;
  error: boolean;
  info: boolean;
  achievement: boolean;
  reminder: boolean;
  marketing: boolean;
  exam: boolean;
  mock_test: boolean;
  pyq: boolean;
  leaderboard: boolean;
  streak: boolean;
  friend_activity: boolean;
  feature_release: boolean;
  announcement: boolean;
  daily_reminder: boolean;
  streak_alert: boolean;
  daily_question_alert: boolean;
  exam_date_alert: boolean;
  reminder_time: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationEvent {
  id: string;
  event_type: NotificationEventType;
  user_id: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
}

export interface DeliveryLog {
  id: string;
  notification_id: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  error_message: string | null;
  attempts: number;
  last_attempt_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  deep_link_url?: string;
  priority?: NotificationPriority;
  channel?: NotificationChannel[];
  group_key?: string;
  metadata?: Record<string, unknown>;
  expires_in_hours?: number;
}

export interface CreateNotificationPayload {
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  deep_link_url?: string;
  image_url?: string;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  group_key?: string;
  metadata?: Record<string, unknown>;
  expires_at?: string;
}

export interface NotificationFilters {
  type?: NotificationType | NotificationType[];
  status?: NotificationStatus;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  is_read?: boolean;
  search?: string;
  group_key?: string;
  created_after?: string;
  created_before?: string;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  cursor?: string;
  filters?: NotificationFilters;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
  has_more: boolean;
  next_cursor: string | null;
}

export interface NotificationCounts {
  total: number;
  unread: number;
  by_type: Record<NotificationType, number>;
  by_priority: Record<NotificationPriority, number>;
}

export interface QueueJob {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority: NotificationPriority;
  attempts: number;
  max_attempts: number;
  status: "pending" | "processing" | "completed" | "failed" | "dead";
  error: string | null;
  scheduled_at: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationEventPayload {
  event_type: NotificationEventType;
  user_id: string;
  template?: NotificationTemplate;
  payload?: Record<string, unknown>;
  channels?: NotificationChannel[];
}

export interface NotificationBellState {
  unread_count: number;
  notifications: Notification[];
  loading: boolean;
  has_more: boolean;
  cursor: string | null;
}

export const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  { label: string; color: string; icon: string; defaultChannel: NotificationChannel }
> = {
  [NotificationType.System]: { label: "System", color: "text-blue-500", icon: "Settings", defaultChannel: NotificationChannel.InApp },
  [NotificationType.Success]: { label: "Success", color: "text-green-500", icon: "CheckCircle", defaultChannel: NotificationChannel.InApp },
  [NotificationType.Warning]: { label: "Warning", color: "text-yellow-500", icon: "AlertTriangle", defaultChannel: NotificationChannel.InApp },
  [NotificationType.Error]: { label: "Error", color: "text-red-500", icon: "XCircle", defaultChannel: NotificationChannel.InApp },
  [NotificationType.Info]: { label: "Info", color: "text-blue-400", icon: "Info", defaultChannel: NotificationChannel.InApp },
  [NotificationType.Achievement]: { label: "Achievement", color: "text-purple-500", icon: "Trophy", defaultChannel: NotificationChannel.InApp },
  [NotificationType.Reminder]: { label: "Reminder", color: "text-orange-500", icon: "Clock", defaultChannel: NotificationChannel.Push },
  [NotificationType.Marketing]: { label: "Marketing", color: "text-pink-500", icon: "Megaphone", defaultChannel: NotificationChannel.InApp },
  [NotificationType.Exam]: { label: "Exam", color: "text-indigo-500", icon: "FileText", defaultChannel: NotificationChannel.Push },
  [NotificationType.MockTest]: { label: "Mock Test", color: "text-cyan-500", icon: "ClipboardList", defaultChannel: NotificationChannel.InApp },
  [NotificationType.PYQ]: { label: "PYQ", color: "text-teal-500", icon: "BookOpen", defaultChannel: NotificationChannel.InApp },
  [NotificationType.Leaderboard]: { label: "Leaderboard", color: "text-amber-500", icon: "TrendingUp", defaultChannel: NotificationChannel.InApp },
  [NotificationType.Streak]: { label: "Streak", color: "text-orange-500", icon: "Flame", defaultChannel: NotificationChannel.Push },
  [NotificationType.FriendActivity]: { label: "Friend Activity", color: "text-emerald-500", icon: "Users", defaultChannel: NotificationChannel.InApp },
  [NotificationType.FeatureRelease]: { label: "Feature Release", color: "text-violet-500", icon: "Sparkles", defaultChannel: NotificationChannel.InApp },
  [NotificationType.Announcement]: { label: "Announcement", color: "text-sky-500", icon: "Megaphone", defaultChannel: NotificationChannel.InApp },
  [NotificationType.Admin]: { label: "Admin", color: "text-slate-500", icon: "Shield", defaultChannel: NotificationChannel.InApp },
};

export const NOTIFICATION_CATEGORIES = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: NotificationType.System, label: "System" },
  { key: NotificationType.Achievement, label: "Achievements" },
  { key: NotificationType.Reminder, label: "Reminders" },
  { key: NotificationType.Exam, label: "Exams" },
  { key: NotificationType.MockTest, label: "Mock Tests" },
  { key: NotificationType.PYQ, label: "PYQs" },
  { key: NotificationType.Leaderboard, label: "Leaderboard" },
  { key: NotificationType.Streak, label: "Streaks" },
  { key: NotificationType.Announcement, label: "Announcements" },
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]["key"];
