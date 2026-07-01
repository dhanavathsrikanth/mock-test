import { createCronClient } from "@/lib/supabase/cron";

function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
}

function getVapidPrivateKey(): string {
  return process.env.VAPID_PRIVATE_KEY || "";
}

export async function sendPushNotificationToUser(
  userId: string,
  title: string,
  body: string,
  url?: string
): Promise<void> {
  const supabase = createCronClient();

  const { data: subscription } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", userId)
    .maybeSingle();

  if (!subscription) return;

  const webpush = (await import("web-push")).default;

  webpush.setVapidDetails(
    "mailto:admin@tgpscprep.com",
    getVapidPublicKey(),
    getVapidPrivateKey()
  );

  try {
    await webpush.sendNotification(
      subscription.subscription as any,
      JSON.stringify({ title, body, url: url || "/daily" })
    );
  } catch (err) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId);
    throw err;
  }
}

export async function sendPushToAllUsers(
  title: string,
  body: string,
  url?: string
): Promise<{ sent: number; failed: number }> {
  const supabase = createCronClient();

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("user_id, subscription");

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const webpush = (await import("web-push")).default;

  webpush.setVapidDetails(
    "mailto:admin@tgpscprep.com",
    getVapidPublicKey(),
    getVapidPrivateKey()
  );

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        sub.subscription as any,
        JSON.stringify({ title, body, url: url || "/daily" })
      );
      sent++;
    } catch {
      failed++;
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", sub.user_id);
    }
  }

  return { sent, failed };
}
