/**
 * Hermes Notify Tool — agenda notificações locais.
 * Wrapper fino sobre `notification-service`. SSR-safe (no-op no servidor).
 */

import {
  cancelScheduled,
  listScheduled,
  scheduleNotification,
} from "@/lib/notifications/notification-service";
import type { NotificationKind, ScheduledNotification } from "@/lib/notifications/notification-types";

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
