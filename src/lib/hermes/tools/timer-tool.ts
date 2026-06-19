/**
 * Hermes Timer Tool — leitura do timer ativo.
 * Wrapper SSR-safe sobre `timer-store` + snapshot derivado.
 */

import { getStoredTimer } from "@/lib/timer/timer-store";
import { getTimerSnapshot } from "@/lib/timer/timer-engine";
import type { PersistedTimer, TimerSnapshot } from "@/lib/timer/timer-types";

export type ActiveTimerInfo = {
  timer: PersistedTimer;
  snapshot: TimerSnapshot;
};

export function getActiveTimer(): ActiveTimerInfo | null {
  if (typeof window === "undefined") return null;
  const t = getStoredTimer();
  if (!t) return null;
  return { timer: t, snapshot: getTimerSnapshot(t) };
}

export function isTimerRunning(): boolean {
  const info = getActiveTimer();
  return info?.timer.status === "running";
}
