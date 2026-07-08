"use client";

import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePushSubscription } from "@/hooks/use-push-subscription";

export function PushToggle() {
  const { supported, subscribed, loading, subscribe, unsubscribe } = usePushSubscription();

  if (!supported || loading) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={subscribed ? unsubscribe : subscribe}
      className="gap-2"
    >
      {subscribed ? (
        <>
          <BellOff className="h-4 w-4" />
          Disable Push
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          Enable Push
        </>
      )}
    </Button>
  );
}
