/**
 * Serviço de notificações com fallback web e suporte a ações via Service Worker.
 *
 * Estratégia:
 *  - Registra `/notification-sw.js` em produção/APK; em dev Lovable preview, evita.
 *  - Agendamento "local" é feito via setTimeout enquanto o app está aberto;
 *    quando o timestamp chega, mostra notificação real (com ações se SW ativo)
 *    ou fallback (Notification API simples + áudio/vibração).
 *  - Quando o app reabre, varre notificações pendentes em localStorage e
 *    dispara as que já venceram (ou agenda novamente as futuras).
 */
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationKind,
  type NotificationLogEntry,
  type NotificationSettings,
  type ScheduledNotification,
} from "./notification-types";
import { useEffect, useState } from "react";

const KEY_QUEUE = "fm.notif.queue.v1";
const KEY_SETTINGS = "fm.notif.settings.v1";
const KEY_LOG = "fm.notif.log.v1";
const EVT_SETTINGS = "fm:notif-settings";

const timers = new Map<string, number>();
let swRegistration: ServiceWorkerRegistration | null = null;
let swTried = false;

function isLovablePreview() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h.endsWith(".lovableproject.com") ||
    h.endsWith(".lovableproject-dev.com") ||
    h.endsWith(".beta.lovable.dev") ||
    window.top !== window.self
  );
}

async function ensureSW(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration) return swRegistration;
  if (swTried) return null;
  swTried = true;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  if (isLovablePreview()) return null;
  try {
    const reg = await navigator.serviceWorker.register("/notification-sw.js");
    swRegistration = reg;
    return reg;
  } catch {
    return null;
  }
}

// ---------- settings ----------
function readSettings(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY_SETTINGS);
    return raw
      ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...(JSON.parse(raw) as Partial<NotificationSettings>) }
      : DEFAULT_NOTIFICATION_SETTINGS;
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

function writeSettings(s: NotificationSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_SETTINGS, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent(EVT_SETTINGS));
}

export function getNotificationSettings(): NotificationSettings {
  return readSettings();
}

export function useNotificationSettings() {
  const [s, setS] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  useEffect(() => {
    setS(readSettings());
    const on = () => setS(readSettings());
    window.addEventListener(EVT_SETTINGS, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(EVT_SETTINGS, on);
      window.removeEventListener("storage", on);
    };
  }, []);
  const update = (patch: Partial<NotificationSettings>) => {
    const next = { ...readSettings(), ...patch };
    writeSettings(next);
    setS(next);
  };
  return [s, update] as const;
}

// ---------- queue persistence ----------
function readQueue(): ScheduledNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_QUEUE);
    return raw ? (JSON.parse(raw) as ScheduledNotification[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(q: ScheduledNotification[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_QUEUE, JSON.stringify(q));
}

// ---------- log ----------
function appendLog(entry: NotificationLogEntry) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY_LOG);
    const list = raw ? (JSON.parse(raw) as NotificationLogEntry[]) : [];
    list.unshift(entry);
    window.localStorage.setItem(KEY_LOG, JSON.stringify(list.slice(0, 200)));
  } catch {
    /* noop */
  }
}

export function getNotificationLog(): NotificationLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_LOG);
    return raw ? (JSON.parse(raw) as NotificationLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function clearNotificationLog() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY_LOG);
}

// ---------- quiet hours ----------
function isQuietNow(s: NotificationSettings, now = new Date()): boolean {
  if (!s.quietHoursEnabled) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = s.quietStart.split(":").map(Number);
  const [eh, em] = s.quietEnd.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start === end) return false;
  if (start < end) return cur >= start && cur < end;
  return cur >= start || cur < end; // cruza meia-noite
}

// ---------- sound / vibration ----------
function playBeep() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = ctx.currentTime + i * 0.45;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.3, t0 + 0.02);
      gain.gain.linearRampToValueAtTime(0, t0 + 0.35);
      osc.start(t0);
      osc.stop(t0 + 0.4);
    }
    setTimeout(() => ctx.close().catch(() => {}), 2200);
  } catch {
    /* noop */
  }
}

function vibrate() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([300, 150, 300, 150, 500]);
    }
  } catch {
    /* noop */
  }
}

// ---------- showing notification ----------
type ShowOptions = {
  title: string;
  body: string;
  kind: NotificationKind;
  entityId?: string;
  entityType?: "task" | "timer";
  /** Path para abrir ao clicar. */
  openPath?: string;
  actions?: { action: string; title: string }[];
  tag?: string;
};

export async function showNotificationNow(opts: ShowOptions): Promise<boolean> {
  const settings = readSettings();
  if (!settings.enabled) return false;
  if (isQuietNow(settings)) {
    appendLog({
      id: cryptoId(),
      type: opts.kind,
      title: opts.title,
      body: opts.body,
      entityId: opts.entityId,
      entityType: opts.entityType,
      status: "dismissed",
      sentAt: Date.now(),
    });
    return false;
  }

  if (settings.soundEnabled) playBeep();
  if (settings.vibrationEnabled) vibrate();

  let sent = false;
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      const reg = await ensureSW();
      const data = {
        source: "fm-notification",
        entityId: opts.entityId,
        entityType: opts.entityType,
        path: opts.openPath ?? "/",
      };
      if (reg) {
        await reg.showNotification(opts.title, {
          body: opts.body,
          tag: opts.tag ?? `${opts.kind}-${opts.entityId ?? ""}`,
          renotify: true,
          requireInteraction: settings.repeatUntilDismissed,
          data,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          // @ts-expect-error actions é suportado em alguns navegadores
          actions: opts.actions ?? [],
        });
        sent = true;
      } else {
        new Notification(opts.title, {
          body: opts.body,
          tag: opts.tag,
          icon: "/icon-192.png",
        });
        sent = true;
      }
    } catch (err) {
      console.warn("notification failed", err);
    }
  }

  appendLog({
    id: cryptoId(),
    type: opts.kind,
    title: opts.title,
    body: opts.body,
    entityId: opts.entityId,
    entityType: opts.entityType,
    status: sent ? "sent" : "failed",
    sentAt: Date.now(),
  });
  return sent;
}

function cryptoId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ---------- scheduling ----------
function clearTimerById(id: string) {
  const handle = timers.get(id);
  if (handle !== undefined) {
    window.clearTimeout(handle);
    timers.delete(id);
  }
}

export function cancelScheduled(id: string) {
  clearTimerById(id);
  const q = readQueue().filter((n) => n.id !== id);
  writeQueue(q);
}

export function cancelByEntity(entityType: "task" | "timer", entityId: string) {
  const q = readQueue();
  for (const n of q) {
    if (n.entityType === entityType && n.entityId === entityId) clearTimerById(n.id);
  }
  writeQueue(q.filter((n) => !(n.entityType === entityType && n.entityId === entityId)));
}

function actionsFor(kind: NotificationKind, entityType?: "task" | "timer") {
  if (entityType === "timer") {
    return [
      { action: "complete", title: "Concluir" },
      { action: "restart_timer", title: "Reiniciar" },
      { action: "open", title: "Abrir" },
    ];
  }
  if (entityType === "task") {
    return [
      { action: "complete", title: "Concluir" },
      { action: "snooze", title: "Adiar 15 min" },
      { action: "open", title: "Abrir" },
    ];
  }
  void kind;
  return [{ action: "open", title: "Abrir" }];
}

function pathFor(entityType?: "task" | "timer") {
  if (entityType === "timer") return "/timer";
  return "/";
}

function scheduleInternal(n: ScheduledNotification) {
  clearTimerById(n.id);
  const delay = Math.max(0, n.scheduledAt - Date.now());
  // Limite seguro de setTimeout (~24 dias); para mais que isso só persiste e re-agendará.
  if (delay > 2_000_000_000) return;
  const handle = window.setTimeout(() => {
    showNotificationNow({
      title: n.title,
      body: n.body,
      kind: n.kind,
      entityId: n.entityId,
      entityType: n.entityType,
      openPath: pathFor(n.entityType),
      actions: actionsFor(n.kind, n.entityType),
      tag: n.id,
    });
    cancelScheduled(n.id);
  }, delay);
  timers.set(n.id, handle);
}

export function scheduleNotification(input: Omit<ScheduledNotification, "id"> & { id?: string }): string {
  const id = input.id ?? cryptoId();
  const n: ScheduledNotification = { ...input, id };
  const q = readQueue().filter((x) => x.id !== id);
  q.push(n);
  writeQueue(q);

  appendLog({
    id: cryptoId(),
    type: n.kind,
    title: n.title,
    body: n.body,
    entityId: n.entityId,
    entityType: n.entityType,
    status: "scheduled",
    scheduledAt: n.scheduledAt,
  });

  scheduleInternal(n);
  return id;
}

/** Restaura agendamentos pendentes (chamar no boot). */
export function rehydrateScheduled() {
  if (typeof window === "undefined") return;
  const q = readQueue();
  const now = Date.now();
  const remaining: ScheduledNotification[] = [];
  for (const n of q) {
    if (n.scheduledAt <= now) {
      showNotificationNow({
        title: n.title,
        body: n.body,
        kind: n.kind,
        entityId: n.entityId,
        entityType: n.entityType,
        openPath: pathFor(n.entityType),
        actions: actionsFor(n.kind, n.entityType),
        tag: n.id,
      });
    } else {
      remaining.push(n);
      scheduleInternal(n);
    }
  }
  writeQueue(remaining);
}

export function listScheduled(): ScheduledNotification[] {
  return readQueue();
}
