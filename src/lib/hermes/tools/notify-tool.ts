/**
 * Hermes Notify Tool — agenda lembretes/alarmes.
 *
 * Dois caminhos:
 *   - `notifyAt({...})`  → notificação única em timestamp (notification-service).
 *   - `createAlarm({...})` → cria entrada no `fm.alarms` (com repetição).
 *
 * SSR-safe (no-op no servidor).
 */

import {
  cancelScheduled,
  listScheduled,
  scheduleNotification,
} from "@/lib/notifications/notification-service";
import type {
  NotificationKind,
  ScheduledNotification,
} from "@/lib/notifications/notification-types";
import type { Alarm, AlarmRepeat, WeekDay } from "@/lib/alarms-store";

export type ScheduleNotifyInput = {
  title: string;
  body?: string;
  at: Date | string | number;
  kind?: NotificationKind;
  entityId?: string;
  entityType?: "task" | "timer";
};

export type NotifyResult =
  | { ok: true; id: string; scheduledAt: number }
  | { ok: false; reason: string };

function toMs(at: Date | string | number): number | null {
  if (at instanceof Date) return at.getTime();
  if (typeof at === "number" && Number.isFinite(at)) return at;
  if (typeof at === "string") {
    const ms = Date.parse(at);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

export function notifyAt(input: ScheduleNotifyInput): NotifyResult {
  if (typeof window === "undefined") return { ok: false, reason: "ssr" };
  const scheduledAt = toMs(input.at);
  if (scheduledAt == null) return { ok: false, reason: "invalid date" };
  const id = scheduleNotification({
    kind: input.kind ?? "test",
    title: input.title,
    body: input.body ?? "",
    scheduledAt,
    entityId: input.entityId,
    entityType: input.entityType,
  });
  return { ok: true, id, scheduledAt };
}

export function cancelNotification(id: string): { ok: boolean } {
  if (typeof window === "undefined") return { ok: false };
  cancelScheduled(id);
  return { ok: true };
}

export function listScheduledNotifications(): ScheduledNotification[] {
  if (typeof window === "undefined") return [];
  return listScheduled();
}

/* ============== ALARMES RECORRENTES ============== */

const ALARMS_KEY = "fm.alarms";
const ALARMS_EVT = "fm:alarms";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function readAlarms(): Alarm[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ALARMS_KEY);
    return raw ? (JSON.parse(raw) as Alarm[]) : [];
  } catch {
    return [];
  }
}

function writeAlarms(list: Alarm[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ALARMS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(ALARMS_EVT));
}

export type CreateAlarmInput = {
  label: string;
  /** "HH:MM" 24h */
  time: string;
  repeat?: AlarmRepeat;
  days?: WeekDay[];
  sound?: boolean;
  notify?: boolean;
};

export type CreateAlarmResult =
  | { ok: true; alarm: Alarm }
  | { ok: false; reason: string };

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function createAlarm(input: CreateAlarmInput): CreateAlarmResult {
  if (typeof window === "undefined") return { ok: false, reason: "ssr" };
  if (!HHMM_RE.test(input.time)) return { ok: false, reason: "invalid time (use HH:MM)" };
  const alarm: Alarm = {
    id: uid(),
    label: input.label,
    time: input.time,
    enabled: true,
    repeat: input.repeat ?? "once",
    days: input.days,
    sound: input.sound ?? true,
    notify: input.notify ?? true,
  };
  const next = [...readAlarms(), alarm].sort((a, b) => a.time.localeCompare(b.time));
  writeAlarms(next);
  return { ok: true, alarm };
}

export function listAlarms(): Alarm[] {
  return readAlarms();
}

export function removeAlarm(id: string): { ok: boolean } {
  if (typeof window === "undefined") return { ok: false };
  writeAlarms(readAlarms().filter((a) => a.id !== id));
  return { ok: true };
}

/**
 * Extrai uma intenção de alarme do texto do usuário.
 * Suporta:
 *   - "me acorda às 07:30"
 *   - "alarme para 06:00 todos os dias"
 *   - "me lembra às 14:00 de segunda a sexta"
 */
export function parseAlarmIntent(input: string): CreateAlarmInput | null {
  const text = input.trim();
  const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (!timeMatch) {
    // Aceita "às 7" / "às 19h"
    const hMatch = text.match(/\b(?:à[s]?|as)\s+(\d{1,2})\s*h?\b/i);
    if (!hMatch) return null;
    const h = Number(hMatch[1]);
    if (h < 0 || h > 23) return null;
    timeMatch[0] = `${String(h).padStart(2, "0")}:00`;
    timeMatch[1] = String(h);
    timeMatch[2] = "00";
  }
  const hh = String(Number(timeMatch[1])).padStart(2, "0");
  const mm = (timeMatch[2] ?? "00").padStart(2, "0");
  const time = `${hh}:${mm}`;

  let repeat: AlarmRepeat = "once";
  if (/\b(todos? os dias|diariamente|todo dia)\b/i.test(text)) repeat = "daily";
  else if (/\b(seg(unda)?\s+a\s+sex(ta)?|dias úteis|semana)\b/i.test(text)) repeat = "weekday";
  else if (/\b(fim de semana|s[áa]bado e domingo)\b/i.test(text)) repeat = "weekend";

  // Label: retira a expressão de hora e verbos comuns.
  const label = text
    .replace(/\b(me\s+(acorda[r]?|avisa[r]?|lembra[r]?|notifica[r]?))\b/gi, "")
    .replace(/\b(alarme|alarm|lembrete)\b/gi, "")
    .replace(/\bpara\b/gi, "")
    .replace(/\b(à[s]?|as)\s+\d{1,2}(:\d{2})?\s*h?\b/gi, "")
    .replace(/\b(todos? os dias|diariamente|todo dia|seg(unda)?\s+a\s+sex(ta)?|dias úteis|fim de semana|s[áa]bado e domingo)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^de\s+/i, "")
    .replace(/[?!.]+$/, "");

  return {
    label: label || "Lembrete",
    time,
    repeat,
    sound: true,
    notify: true,
  };
}
