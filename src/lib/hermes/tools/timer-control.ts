/**
 * Hermes Timer Control — controle do timer ativo.
 * Wrapper sobre `timer-store`. `stopTimer` é destrutivo — exigir
 * `HermesConfirmation` se houver tempo significativo restante.
 */

import {
  clearTimer,
  getStoredTimer,
  pauseTimer as pauseStoreTimer,
  resetTimer as resetStoreTimer,
  setStoredTimer,
  startTimer as startStoreTimer,
} from "@/lib/timer/timer-store";
import type { PersistedTimer } from "@/lib/timer/timer-types";

export type TimerControlResult = { ok: boolean; timer?: PersistedTimer | null; reason?: string };

export function pauseTimer(): TimerControlResult {
  if (typeof window === "undefined") return { ok: false, reason: "ssr" };
  const t = pauseStoreTimer();
  if (!t) return { ok: false, reason: "no timer" };
  return { ok: true, timer: t };
}

export function resumeTimer(): TimerControlResult {
  if (typeof window === "undefined") return { ok: false, reason: "ssr" };
  const current = getStoredTimer();
  if (!current) return { ok: false, reason: "no timer" };
  if (current.status === "running") return { ok: true, timer: current };
  const t = startStoreTimer();
  return t ? { ok: true, timer: t } : { ok: false, reason: "could not start" };
}

export function stopTimer(): TimerControlResult {
  if (typeof window === "undefined") return { ok: false, reason: "ssr" };
  const current = getStoredTimer();
  if (!current) return { ok: false, reason: "no timer" };
  clearTimer();
  return { ok: true, timer: null };
}

export function resetTimer(): TimerControlResult {
  if (typeof window === "undefined") return { ok: false, reason: "ssr" };
  const t = resetStoreTimer();
  if (!t) return { ok: false, reason: "no timer" };
  return { ok: true, timer: t };
}

/** Adiciona minutos à duração restante (timer continua no estado atual). */
export function extendTimer(minutes: number): TimerControlResult {
  if (typeof window === "undefined") return { ok: false, reason: "ssr" };
  const current = getStoredTimer();
  if (!current) return { ok: false, reason: "no timer" };
  const extraMs = Math.max(0, Math.round(minutes * 60_000));
  const now = Date.now();
  const next: PersistedTimer = {
    ...current,
    durationMs: current.durationMs + extraMs,
    remainingMs: (current.remainingMs ?? current.durationMs) + extraMs,
    expectedEndAt:
      current.status === "running" && current.expectedEndAt
        ? current.expectedEndAt + extraMs
        : current.expectedEndAt,
    updatedAt: now,
  };
  setStoredTimer(next);
  return { ok: true, timer: next };
}
