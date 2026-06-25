self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const { title, body, url } = event.data.json();

    const options = {
      body,
      icon: "/icon.png",
      badge: "/badge.png",
      data: { url: url || "/daily" },
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch {
    // ignore malformed push
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/daily";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
