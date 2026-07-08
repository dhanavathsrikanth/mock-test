import { createCronClient } from "@/lib/supabase/cron";
import {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationFilters,
  NotificationListParams,
  NotificationListResponse,
  NotificationCounts,
  CreateNotificationPayload,
  NotificationEventPayload,
} from "@/types/notifications";
import { NOTIFICATION_PAGE_SIZE, NOTIFICATION_BATCH_SIZE, TYPE_TO_CHANNEL_MAP } from "./constants";
import { resolveNotificationTemplate } from "./event-emitter";
import { getQueue } from "./queue";
import { isNotificationExpired } from "./utils";

export class NotificationService {
  private supabase = createCronClient();

  async createNotification(payload: CreateNotificationPayload): Promise<Notification | null> {
    const { data, error } = await this.supabase
      .from("notifications")
      .insert({
        user_id: payload.user_id,
        type: payload.type,
        title: payload.title,
        message: payload.message || null,
        link: payload.link || null,
        deep_link_url: payload.deep_link_url || null,
        image_url: payload.image_url || null,
        priority: payload.priority || NotificationPriority.Normal,
        channel: payload.channel || NotificationChannel.InApp,
        status: NotificationStatus.Delivered,
        group_key: payload.group_key || null,
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : "{}",
        expires_at: payload.expires_at || null,
        is_read: false,
        retry_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create notification:", error);
      return null;
    }

    return data as unknown as Notification;
  }

  async createBulkNotifications(
    userIds: string[],
    type: NotificationType,
    title: string,
    message?: string,
    link?: string,
    metadata?: Record<string, unknown>
  ): Promise<number> {
    let created = 0;

    for (let i = 0; i < userIds.length; i += NOTIFICATION_BATCH_SIZE) {
      const batch = userIds.slice(i, i + NOTIFICATION_BATCH_SIZE);
      const rows = batch.map((user_id) => ({
        user_id,
        type,
        title,
        message: message || null,
        link: link || null,
        priority: NotificationPriority.Normal,
        channel: NotificationChannel.InApp,
        status: NotificationStatus.Delivered,
        metadata: metadata ? JSON.stringify(metadata) : "{}",
        is_read: false,
        retry_count: 0,
      }));

      const { error } = await this.supabase.from("notifications").insert(rows);
      if (!error) created += batch.length;
    }

    return created;
  }

  async getUserNotifications(
    userId: string,
    params: NotificationListParams = {}
  ): Promise<NotificationListResponse> {
    const { page = 1, limit = NOTIFICATION_PAGE_SIZE, filters = {} } = params;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .eq("status", NotificationStatus.Delivered)
      .order("created_at", { ascending: false });

    query = this.applyFilters(query, filters);

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("Failed to fetch notifications:", error);
      return { notifications: [], total: 0, unread_count: 0, has_more: false, next_cursor: null };
    }

    const notifications = (data || []) as unknown as Notification[];
    const filteredNotifications = notifications.filter((n) => !isNotificationExpired(n));

    const unreadCount = await this.getUnreadCount(userId);

    return {
      notifications: filteredNotifications,
      total: count || 0,
      unread_count: unreadCount,
      has_more: (count || 0) > offset + limit,
      next_cursor:
        filteredNotifications.length === limit
          ? filteredNotifications[filteredNotifications.length - 1]?.id || null
          : null,
    };
  }

  async getNotificationById(notificationId: string, userId: string): Promise<Notification | null> {
    const { data, error } = await this.supabase
      .from("notifications")
      .select("*")
      .eq("id", notificationId)
      .eq("user_id", userId)
      .single();

    if (error) return null;
    return data as unknown as Notification;
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", userId);

    return !error;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const { data } = await this.supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false)
      .select("id");

    return data?.length || 0;
  }

  async archiveNotification(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("notifications")
      .update({ status: NotificationStatus.Archived, archived_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", userId);

    return !error;
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("notifications")
      .update({ status: NotificationStatus.Deleted })
      .eq("id", notificationId)
      .eq("user_id", userId);

    return !error;
  }

  async undoDelete(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("notifications")
      .update({ status: NotificationStatus.Delivered, archived_at: null })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .eq("status", NotificationStatus.Deleted);

    return !error;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .eq("status", NotificationStatus.Delivered);

    if (error) return 0;
    return count || 0;
  }

  async getCounts(userId: string): Promise<NotificationCounts> {
    const [totalResult, unreadResult, typeResults] = await Promise.all([
      this.supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", NotificationStatus.Delivered),
      this.supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false)
        .eq("status", NotificationStatus.Delivered),
      this.supabase
        .from("notifications")
        .select("type")
        .eq("user_id", userId)
        .eq("status", NotificationStatus.Delivered),
    ]);

    const byType = {} as Record<NotificationType, number>;
    const byPriority = {} as Record<NotificationPriority, number>;

    if (typeResults.data) {
      for (const row of typeResults.data) {
        const t = row.type as NotificationType;
        byType[t] = (byType[t] || 0) + 1;
      }
    }

    return {
      total: totalResult.count || 0,
      unread: unreadResult.count || 0,
      by_type: byType,
      by_priority: byPriority,
    };
  }

  async processEvent(eventPayload: NotificationEventPayload): Promise<string | null> {
    const template = resolveNotificationTemplate(
      eventPayload.event_type,
      eventPayload.payload || {}
    );

    if (!template) return null;

    const channels = eventPayload.channels || template.channel || TYPE_TO_CHANNEL_MAP[template.type] || [NotificationChannel.InApp];

    const expiresAt = template.expires_in_hours
      ? new Date(Date.now() + template.expires_in_hours * 3600000).toISOString()
      : undefined;

    const notification = await this.createNotification({
      user_id: eventPayload.user_id,
      type: template.type,
      title: template.title,
      message: template.message,
      link: template.link,
      deep_link_url: template.deep_link_url,
      priority: template.priority || NotificationPriority.Normal,
      channel: NotificationChannel.InApp,
      group_key: template.group_key,
      metadata: { ...eventPayload.payload, ...template.metadata },
      expires_at: expiresAt,
    });

    if (!notification) return null;

    if (channels.includes(NotificationChannel.Push)) {
      const queue = getQueue();
      await queue.enqueue(
        "send_push",
        {
          notification_id: notification.id,
          user_id: eventPayload.user_id,
          title: template.title,
          body: template.message || "",
          url: template.link || "/dashboard",
        },
        template.priority || NotificationPriority.Normal
      );
    }

    return notification.id;
  }

  private applyFilters(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: any,
    filters: NotificationFilters
  ) {
    if (filters.type) {
      if (Array.isArray(filters.type)) {
        query = query.in("type", filters.type);
      } else {
        query = query.eq("type", filters.type);
      }
    }

    if (filters.is_read !== undefined) {
      query = query.eq("is_read", filters.is_read);
    }

    if (filters.priority) {
      query = query.eq("priority", filters.priority);
    }

    if (filters.group_key) {
      query = query.eq("group_key", filters.group_key);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
    }

    if (filters.created_after) {
      query = query.gte("created_at", filters.created_after);
    }

    if (filters.created_before) {
      query = query.lte("created_at", filters.created_before);
    }

    return query;
  }
}

let serviceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!serviceInstance) {
    serviceInstance = new NotificationService();
  }
  return serviceInstance;
}
