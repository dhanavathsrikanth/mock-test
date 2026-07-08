import { createCronClient } from "@/lib/supabase/cron";
import {
  NotificationChannel,
  DeliveryStatus,
} from "@/types/notifications";

export class DeliveryService {
  private supabase = createCronClient();

  async logDelivery(
    notificationId: string,
    channel: NotificationChannel,
    status: DeliveryStatus,
    errorMessage?: string
  ): Promise<void> {
    await this.supabase.from("delivery_logs").insert({
      notification_id: notificationId,
      channel,
      status,
      error_message: errorMessage || null,
      attempts: status === DeliveryStatus.Failed ? 1 : 0,
      last_attempt_at: new Date().toISOString(),
      delivered_at: status === DeliveryStatus.Delivered ? new Date().toISOString() : null,
    });
  }

  async updateDeliveryStatus(
    logId: string,
    status: DeliveryStatus,
    errorMessage?: string
  ): Promise<void> {
    const update: Record<string, unknown> = {
      status,
      last_attempt_at: new Date().toISOString(),
    };

    if (errorMessage) update.error_message = errorMessage;
    if (status === DeliveryStatus.Delivered) {
      update.delivered_at = new Date().toISOString();
    }

    await this.supabase.from("delivery_logs").update(update).eq("id", logId);
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    url?: string,
    notificationId?: string
  ): Promise<boolean> {
    const { data: subscription } = await this.supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId)
      .maybeSingle();

    if (!subscription?.endpoint) return false;

    try {
      const webpush = (await import("web-push")).default;
      webpush.setVapidDetails(
        "mailto:admin@tgpscprep.com",
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
        process.env.VAPID_PRIVATE_KEY || ""
      );

      // web-push expects its own PushSubscription type, not DOM's PushSubscriptionJSON
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        JSON.stringify({ title, body, url: url || "/dashboard" })
      );

      if (notificationId) {
        await this.logDelivery(notificationId, NotificationChannel.Push, DeliveryStatus.Delivered);
      }

      return true;
    } catch (err) {
      const isExpired =
        err instanceof Error &&
        (err.message.includes("404") ||
          err.message.includes("410") ||
          err.message.includes("expired"));

      if (isExpired) {
        await this.supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId);
      }

      if (notificationId) {
        await this.logDelivery(
          notificationId,
          NotificationChannel.Push,
          DeliveryStatus.Failed,
          err instanceof Error ? err.message : "Unknown error"
        );
      }

      return false;
    }
  }

  async sendBulkPush(
    userIds: string[],
    title: string,
    body: string,
    url?: string
  ): Promise<{ sent: number; failed: number }> {
    if (userIds.length === 0) return { sent: 0, failed: 0 };

    const { data: subscriptions } = await this.supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")
      .in("user_id", userIds);

    if (!subscriptions || subscriptions.length === 0) return { sent: 0, failed: 0 };

    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(
      "mailto:admin@tgpscprep.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
      process.env.VAPID_PRIVATE_KEY || ""
    );

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          JSON.stringify({ title, body, url: url || "/dashboard" })
        );
        sent++;
      } catch {
        failed++;
        await this.supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", sub.user_id);
      }
    }

    return { sent, failed };
  }

  async cleanupExpiredSubscriptions(): Promise<number> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data } = await this.supabase
      .from("push_subscriptions")
      .delete()
      .lt("updated_at", ninetyDaysAgo)
      .select("id");

    return data?.length || 0;
  }

  async cleanupExpiredNotifications(): Promise<number> {
    const { data } = await this.supabase
      .from("notifications")
      .update({ status: "expired" })
      .lt("expires_at", new Date().toISOString())
      .not("status", "in", "(expired,deleted)")
      .select("id");

    return data?.length || 0;
  }

  async cleanupOldDeliveryLogs(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data } = await this.supabase
      .from("delivery_logs")
      .delete()
      .lt("created_at", thirtyDaysAgo)
      .select("id");

    return data?.length || 0;
  }
}

let deliveryInstance: DeliveryService | null = null;

export function getDeliveryService(): DeliveryService {
  if (!deliveryInstance) {
    deliveryInstance = new DeliveryService();
  }
  return deliveryInstance;
}
