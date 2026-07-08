self.addEventListener("push", function (event) {
  if (!event.data) return;

  var data;
  try {
    data = event.data.json();
  } catch (e) {
    return;
  }

  var title = data.title || "Notification";
  var options = {
    body: data.body || "",
    icon: data.icon || "/icon.png",
    badge: data.badge || "/badge.png",
    image: data.image || undefined,
    data: { url: data.url || "/dashboard" },
    actions: data.actions || [],
    tag: data.tag || undefined,
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    timestamp: data.timestamp || Date.now(),
    vibrate: data.vibrate || undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var url = (event.notification.data && event.notification.data.url) || "/dashboard";

  if (event.action) {
    if (event.action === "open" || event.action === "default") {
      event.waitUntil(openUrl(url));
    } else if (event.action === "dismiss") {
      return;
    }
  } else {
    event.waitUntil(openUrl(url));
  }
});

self.addEventListener("notificationclose", function (event) {
  // Track notification close for analytics if needed
});

self.addEventListener("pushsubscriptionchange", function (event) {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options).then(function (sub) {
      return fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
    })
  );
});

function openUrl(url) {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clients) {
    for (var i = 0; i < clients.length; i++) {
      var client = clients[i];
      if (client.url === url && "focus" in client) {
        return client.focus();
      }
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow(url);
    }
  });
}
