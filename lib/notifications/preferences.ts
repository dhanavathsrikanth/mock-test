import { createCronClient } from "@/lib/supabase/cron";
import {
  NotificationPreference,
  NotificationType,
  NotificationChannel,
} from "@/types/notifications";

export class PreferenceService {
  private supabase = createCronClient();

  async getPreferences(userId: string): Promise<NotificationPreference | null> {
    const { data, error } = await this.supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as unknown as NotificationPreference;
  }

  async getOrCreatePreferences(userId: string): Promise<NotificationPreference> {
    const existing = await this.getPreferences(userId);
    if (existing) return existing;

    const defaults = this.getDefaultPreferences(userId);
    const { data, error } = await this.supabase
      .from("notification_preferences")
      .insert(defaults)
      .select()
      .single();

    if (error) {
      console.error("Failed to create default preferences:", error);
      return defaults as unknown as NotificationPreference;
    }

    return data as unknown as NotificationPreference;
  }

  async updatePreferences(
    userId: string,
    updates: Partial<Omit<NotificationPreference, "id" | "user_id" | "created_at" | "updated_at">>
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    return !error;
  }

  async isChannelEnabled(userId: string, channel: NotificationChannel): Promise<boolean> {
    const prefs = await this.getOrCreatePreferences(userId);

    switch (channel) {
      case NotificationChannel.Push:
        return prefs.push_enabled;
      case NotificationChannel.Email:
        return prefs.email_enabled;
      case NotificationChannel.InApp:
        return true;
      default:
        return true;
    }
  }

  async isTypeEnabled(userId: string, type: NotificationType): Promise<boolean> {
    const prefs = await this.getOrCreatePreferences(userId);

    const typeKey = type as keyof NotificationPreference;
    if (typeKey in prefs) {
      return Boolean(prefs[typeKey]);
    }

    return true;
  }

  async isQuietHours(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    if (!prefs?.quiet_hours_start || !prefs?.quiet_hours_end) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = prefs.quiet_hours_start.split(":").map(Number);
    const [endH, endM] = prefs.quiet_hours_end.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }

  async shouldNotify(userId: string, type: NotificationType, channel: NotificationChannel): Promise<boolean> {
    const channelEnabled = await this.isChannelEnabled(userId, channel);
    if (!channelEnabled) return false;

    const typeEnabled = await this.isTypeEnabled(userId, type);
    if (!typeEnabled) return false;

    if (channel === NotificationChannel.Push) {
      const inQuietHours = await this.isQuietHours(userId);
      if (inQuietHours) return false;
    }

    return true;
  }

  private getDefaultPreferences(userId: string): Omit<NotificationPreference, "id"> {
    return {
      user_id: userId,
      push_enabled: true,
      email_enabled: false,
      system: true,
      success: true,
      warning: true,
      error: true,
      info: true,
      achievement: true,
      reminder: true,
      marketing: false,
      exam: true,
      mock_test: true,
      pyq: true,
      leaderboard: true,
      streak: true,
      friend_activity: true,
      feature_release: true,
      announcement: true,
      daily_reminder: true,
      streak_alert: true,
      daily_question_alert: true,
      exam_date_alert: true,
      reminder_time: "08:00",
      quiet_hours_start: null,
      quiet_hours_end: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

let preferenceInstance: PreferenceService | null = null;

export function getPreferenceService(): PreferenceService {
  if (!preferenceInstance) {
    preferenceInstance = new PreferenceService();
  }
  return preferenceInstance;
}
