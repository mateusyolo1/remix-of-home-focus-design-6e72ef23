/**
 * Ponte de ações executadas a partir de notificações.
 * O service worker envia uma postMessage para o cliente quando o usuário
 * toca em uma ação; aqui processamos o evento dentro do app.
 */
import { completeTimer, createTimer, getStoredTimer, startTimer } from "@/lib/timer/timer-store";

export type NotificationActionMessage = {
  source: "fm-notification";
  action: "complete" | "snooze" | "open" | "restart_timer" | "dismiss";
  entityType?: "task" | "timer";
  entityId?: string;
  path?: string;
};

type Handler = (msg: NotificationActionMessage) => void;
const handlers = new Set<Handler>();

export function onNotificationAction(h: Handler) {
  handlers.add(h);
  return () => handlers.delete(h);
}

function dispatch(msg: NotificationActionMessage) {
  for (const h of handlers) {
    try {
      h(msg);
    } catch (err) {
      console.error("notification handler", err);
    }
  }
}

/** Aplica ações default que não dependem de hooks (timer / navegação). */
function applyDefault(msg: NotificationActionMessage) {
  if (msg.entityType === "timer") {
    if (msg.action === "complete") completeTimer();
    if (msg.action === "restart_timer") {
      const t = getStoredTimer();
      if (t) {
        createTimer({
          mode: t.mode,
          title: t.title,
          durationMs: t.durationMs,
          taskId: t.taskId,
          tag: t.tag,
        });
        startTimer();
      }
    }
  }
  if (msg.action === "open" && msg.path && typeof window !== "undefined") {
    window.history.pushState({}, "", msg.path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

export function initNotificationBridge() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("message", (e) => {
    const data = e.data as NotificationActionMessage | undefined;
    if (!data || data.source !== "fm-notification") return;
    applyDefault(data);
    dispatch(data);
  });
}
