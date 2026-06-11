/* FocusMind notification service worker.
 * Handles notification clicks/actions and routes them back to the app.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function broadcast(message) {
  const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of all) {
    client.postMessage(message);
  }
}

async function focusOrOpen(path) {
  const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of all) {
    if ("focus" in client) {
      try {
        await client.focus();
        if (path && "navigate" in client) {
          try {
            await client.navigate(path);
          } catch (_e) {
            /* noop */
          }
        }
        return;
      } catch (_e) {
        /* noop */
      }
    }
  }
  if (self.clients.openWindow) {
    await self.clients.openWindow(path || "/");
  }
}

self.addEventListener("notificationclick", (event) => {
  const data = (event.notification && event.notification.data) || {};
  const action = event.action || "open";
  event.notification.close();
  event.waitUntil(
    (async () => {
      await broadcast({
        source: "fm-notification",
        action,
        entityType: data.entityType,
        entityId: data.entityId,
        path: data.path,
      });
      if (action === "open" || action === "" || action === "restart_timer") {
        await focusOrOpen(data.path || "/");
      }
    })(),
  );
});
