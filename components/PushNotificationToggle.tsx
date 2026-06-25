"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";

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

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, []);

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const subscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      if (res.ok) setSubscribed(true);
    } catch {
      // user denied or error
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      await fetch("/api/push/unsubscribe", { method: "POST" });
      setSubscribed(false);
    } catch {
      // ignore
    }
  }, []);

  if (!supported) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      className="gap-2"
    >
      {subscribed ? (
        <>
          <BellOff className="h-4 w-4" />
          Disable Notifications
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          Enable Notifications
        </>
      )}
    </Button>
  );
}
