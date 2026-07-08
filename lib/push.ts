import { getDeliveryService } from "@/lib/notifications";

export async function sendPushNotificationToUser(
  userId: string,
  title: string,
  body: string,
  url?: string
): Promise<void> {
  const delivery = getDeliveryService();
  const success = await delivery.sendPushNotification(userId, title, body, url);
  if (!success) {
    throw new Error("Failed to send push notification");
  }
}

export async function sendPushToAllUsers(
  title: string,
  body: string,
  url?: string
): Promise<{ sent: number; failed: number }> {
  const delivery = getDeliveryService();
  const { createCronClient } = await import("@/lib/supabase/cron");
  const supabase = createCronClient();

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("user_id");

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const userIds = subscriptions.map((s) => s.user_id);
  return delivery.sendBulkPush(userIds, title, body, url);
}
