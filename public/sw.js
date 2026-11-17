const CACHE_NAME = "studentace-static-v1";
const PRECACHE_URLS = [
  "/icon.png",
  "/badge.png",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).catch(function () {
        // Non-blocking in case local icons differ
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) {
            return name.startsWith("studentace-") && name !== CACHE_NAME;
          })
          .map(function (name) {
            return caches.delete(name);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);

  // Bypass non-HTTP schemes and dynamic API/auth routes
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Static assets (fonts, styles, scripts, images) -> Cache-first with background revalidation
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(woff2?|ttf|eot|png|jpg|jpeg|svg|webp|ico|css)$/i)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(request).then(function (cachedResponse) {
          var fetchPromise = fetch(request)
            .then(function (networkResponse) {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(function () {
              return cachedResponse;
            });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Navigation requests -> Network first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            var copy = networkResponse.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, copy);
            });
          }
          return networkResponse;
        })
        .catch(function () {
          return caches.match(request);
        })
    );
  }
});

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
