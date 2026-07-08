"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Bell,
  BellOff,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { usePushSubscription } from "@/hooks/use-push-subscription";

export function NotificationPreferencesPanel() {
  const { preferences, loading, saving, updatePreferences, toggleType } =
    useNotificationPreferences();
  const { supported: pushSupported, subscribed: pushEnabled, permission, subscribe, unsubscribe } =
    usePushSubscription();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!preferences) return null;

  const togglePush = async () => {
    if (pushEnabled) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Push Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-master">Push Notifications</Label>
            <p className="text-xs text-muted-foreground">
              {permission === "denied"
                ? "Blocked in browser settings"
                : pushEnabled
                ? "Notifications are active"
                : "Get reminded about tests, streaks, and daily questions"}
            </p>
          </div>
          <Switch
            id="push-master"
            checked={pushEnabled}
            onCheckedChange={togglePush}
            disabled={!pushSupported || permission === "denied"}
          />
        </div>

        {permission === "denied" && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-400 text-xs">
              Notifications are blocked. Enable them in your browser site settings.
            </p>
          </div>
        )}

        {!pushSupported && (
          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
            <BellOff className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-muted-foreground text-xs">
              Push notifications are not supported in your browser.
            </p>
          </div>
        )}

        <hr />

        {/* Type-specific toggles */}
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Notification Types
          </p>

          <ToggleRow
            id="system"
            label="System Messages"
            description="Account updates, security alerts"
            checked={preferences.system}
            onToggle={() => toggleType("system")}
          />

          <ToggleRow
            id="achievement"
            label="Achievements"
            description="Badge unlocks and milestones"
            checked={preferences.achievement}
            onToggle={() => toggleType("achievement")}
          />

          <ToggleRow
            id="reminder"
            label="Reminders"
            description="Daily practice and streak alerts"
            checked={preferences.reminder}
            onToggle={() => toggleType("reminder")}
          />

          <ToggleRow
            id="exam"
            label="Exam Updates"
            description="Exam dates, new papers, and changes"
            checked={preferences.exam}
            onToggle={() => toggleType("exam")}
          />

          <ToggleRow
            id="mock_test"
            label="Mock Tests"
            description="New mock tests and results"
            checked={preferences.mock_test}
            onToggle={() => toggleType("mock_test")}
          />

          <ToggleRow
            id="pyq"
            label="Previous Year Questions"
            description="New PYQ publications"
            checked={preferences.pyq}
            onToggle={() => toggleType("pyq")}
          />

          <ToggleRow
            id="leaderboard"
            label="Leaderboard"
            description="Rank changes and competition updates"
            checked={preferences.leaderboard}
            onToggle={() => toggleType("leaderboard")}
          />

          <ToggleRow
            id="streak"
            label="Streak Updates"
            description="Streak milestones and warnings"
            checked={preferences.streak}
            onToggle={() => toggleType("streak")}
          />

          <ToggleRow
            id="friend_activity"
            label="Friend Activity"
            description="Friend requests and activity"
            checked={preferences.friend_activity}
            onToggle={() => toggleType("friend_activity")}
          />

          <ToggleRow
            id="feature_release"
            label="Feature Releases"
            description="New features and improvements"
            checked={preferences.feature_release}
            onToggle={() => toggleType("feature_release")}
          />

          <ToggleRow
            id="announcement"
            label="Announcements"
            description="Important platform announcements"
            checked={preferences.announcement}
            onToggle={() => toggleType("announcement")}
          />

          <ToggleRow
            id="marketing"
            label="Marketing"
            description="Tips, offers, and promotions"
            checked={preferences.marketing}
            onToggle={() => toggleType("marketing")}
          />
        </div>

        <hr />

        {/* Quiet Hours */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Quiet Hours
          </p>
          <p className="text-xs text-muted-foreground">
            No push notifications during these hours
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="quiet-start" className="text-xs">
                From
              </Label>
              <Input
                id="quiet-start"
                type="time"
                value={preferences.quiet_hours_start || ""}
                onChange={(e) =>
                  updatePreferences({ quiet_hours_start: e.target.value || null })
                }
                className="h-9"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="quiet-end" className="text-xs">
                To
              </Label>
              <Input
                id="quiet-end"
                type="time"
                value={preferences.quiet_hours_end || ""}
                onChange={(e) =>
                  updatePreferences({ quiet_hours_end: e.target.value || null })
                }
                className="h-9"
              />
            </div>
          </div>
        </div>

        {/* Save indicator */}
        <div className="flex items-center justify-end">
          {saving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>
          )}
          {!saving && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onToggle} />
    </div>
  );
}
