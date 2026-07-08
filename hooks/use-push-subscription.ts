"use client";

import { useState, useEffect, useCallback } from "react";

interface PushSubscriptionState {
  supported: boolean;
  subscribed: boolean;
  permission: NotificationPermission;
  loading: boolean;
}

export function usePushSubscription() {
  const [state, setState] = useState<PushSubscriptionState>({
    supported: false,
    subscribed: false,
    permission: "default",
    loading: true,
  });

  useEffect(() => {
    async function checkSupport() {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!supported) {
        setState((s) => ({ ...s, supported: false, loading: false }));
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setState({
          supported: true,
          subscribed: !!subscription,
          permission: Notification.permission,
          loading: false,
        });
      } catch {
        setState((s) => ({ ...s, supported: true, loading: false }));
      }
    }

    checkSupport();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((s) => ({ ...s, permission }));
        return false;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const vapidRes = await fetch("/api/push/vapid-key");
      const { publicKey } = await vapidRes.json();

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      if (res.ok) {
        setState((s) => ({ ...s, subscribed: true, permission: "granted" }));
        return true;
      }

      return false;
    } catch {
      setState((s) => ({ ...s, permission: Notification.permission }));
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      await fetch("/api/push", { method: "DELETE" });
      setState((s) => ({ ...s, subscribed: false }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setState((s) => ({
        ...s,
        subscribed: !!sub,
        permission: Notification.permission,
      }));
    } catch {
      // ignore
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
    refresh,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
