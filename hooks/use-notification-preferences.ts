"use client";

import { useState, useEffect, useCallback } from "react";
import type { NotificationPreference } from "@/types/notifications";

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/notification-preferences");
      if (res.ok) {
        const data = await res.json();
        setPreferences(data);
        setError(null);
      } else setError('Unable to load notification settings. Please retry.');
    } catch {
      setError('Unable to load notification settings. Please retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(
    async (updates: Partial<Omit<NotificationPreference, "id" | "user_id" | "created_at" | "updated_at">>) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/notification-preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (res.ok) {
          setPreferences((prev) => (prev ? { ...prev, ...updates } : null));
          return true;
        }
        setError('Unable to save settings. Your previous settings still apply.');
        return false;
      } catch {
        setError('Unable to save settings. Please reconnect and retry.');
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const toggleType = useCallback(
    async (type: keyof NotificationPreference) => {
      if (!preferences) return;
      const currentValue = Boolean(preferences[type]);
      return updatePreferences({ [type]: !currentValue });
    },
    [preferences, updatePreferences]
  );

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    error,
    preferences,
    loading,
    saving,
    updatePreferences,
    toggleType,
    refresh: fetchPreferences,
  };
}
