"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  BellOff,
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  subscribeToPush,
  unsubscribeFromPush,
  isPushSupported,
  getExistingSubscription,
} from "@/lib/push/subscribe";

interface NotificationPrefs {
  daily_reminder: boolean;
  streak_alert: boolean;
  daily_question_alert: boolean;
  exam_date_alert: boolean;
  reminder_time: string;
}

const DEFAULT_PREFS: NotificationPrefs = {
  daily_reminder: true,
  streak_alert: true,
  daily_question_alert: true,
  exam_date_alert: true,
  reminder_time: "08:00",
};

export function NotificationToggle() {
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function init() {
      const supported = await isPushSupported();
      setPushSupported(supported);

      if (supported) {
        const sub = await getExistingSubscription();
        setPushEnabled(!!sub);
        setPermission(Notification.permission);
      }

      try {
        const res = await fetch("/api/notification-preferences");
        if (res.ok) {
          const data = await res.json();
          setPrefs({
            daily_reminder: data.daily_reminder ?? true,
            streak_alert: data.streak_alert ?? true,
            daily_question_alert: data.daily_question_alert ?? true,
            exam_date_alert: data.exam_date_alert ?? true,
            reminder_time: data.reminder_time ?? "08:00",
          });
        }
      } catch {
        // use defaults
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const savePrefs = useCallback(
    async (updated: NotificationPrefs) => {
      setSaving(true);
      setSaved(false);
      try {
        await fetch("/api/notification-preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        // ignore
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const togglePush = useCallback(async () => {
    if (pushEnabled) {
      const ok = await unsubscribeFromPush();
      if (ok) setPushEnabled(false);
    } else {
      const ok = await subscribeToPush();
      if (ok) {
        setPushEnabled(true);
        setPermission("granted");
      } else {
        setPermission(Notification.permission);
      }
    }
  }, [pushEnabled]);

  const updatePref = useCallback(
    (key: keyof NotificationPrefs, value: boolean | string) => {
      const updated = { ...prefs, [key]: value };
      setPrefs(updated);
      savePrefs(updated);
    },
    [prefs, savePrefs]
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!pushSupported) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-2">
          <BellOff className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            Push notifications are not supported in your browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-master">Enable Notifications</Label>
            <p className="text-xs text-muted-foreground">
              {permission === "denied"
                ? "Blocked in browser settings. Update your site permissions."
                : pushEnabled
                ? "Notifications are active"
                : "Get reminded about tests, streaks, and daily questions"}
            </p>
          </div>
          <Switch
            id="push-master"
            checked={pushEnabled}
            onCheckedChange={togglePush}
            disabled={permission === "denied"}
          />
        </div>

        {permission === "denied" && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-400 text-xs">
              Notifications are blocked. Enable them in your browser site
              settings to receive alerts.
            </p>
          </div>
        )}

        {pushEnabled && (
          <>
            <hr />

            {/* Individual toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="daily-reminder">Daily practice reminder</Label>
                  <p className="text-xs text-muted-foreground">
                    8 AM IST reminder if you haven&apos;t practiced
                  </p>
                </div>
                <Switch
                  id="daily-reminder"
                  checked={prefs.daily_reminder}
                  onCheckedChange={(v) => updatePref("daily_reminder", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="streak-alert">Streak alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    9 PM alert if your streak is about to end
                  </p>
                </div>
                <Switch
                  id="streak-alert"
                  checked={prefs.streak_alert}
                  onCheckedChange={(v) => updatePref("streak_alert", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="daily-question-alert">
                    Daily question alert
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    7 AM reminder to answer today&apos;s question
                  </p>
                </div>
                <Switch
                  id="daily-question-alert"
                  checked={prefs.daily_question_alert}
                  onCheckedChange={(v) => updatePref("daily_question_alert", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="exam-date-alert">Exam date alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Notify about exam date changes and milestones
                  </p>
                </div>
                <Switch
                  id="exam-date-alert"
                  checked={prefs.exam_date_alert}
                  onCheckedChange={(v) => updatePref("exam_date_alert", v)}
                />
              </div>
            </div>

            <hr />

            {/* Reminder time */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="reminder-time">Reminder Time</Label>
                <p className="text-xs text-muted-foreground">
                  When should we send daily reminders?
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="reminder-time"
                  type="time"
                  value={prefs.reminder_time}
                  onChange={(e) => updatePref("reminder_time", e.target.value)}
                  className="w-28"
                />
              </div>
            </div>
          </>
        )}

        {/* Save indicator */}
        <div className="flex items-center justify-end">
          {saving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>
          )}
          {saved && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
