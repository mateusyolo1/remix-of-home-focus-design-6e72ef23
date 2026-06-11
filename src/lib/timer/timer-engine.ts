import type { PersistedTimer, TimerSnapshot } from "./timer-types";

/** Calcula o estado real do timer a partir dos timestamps (fonte da verdade). */
export function getTimerSnapshot(t: PersistedTimer | null | undefined): TimerSnapshot {
  if (!t) return { status: "idle", remainingMs: 0, elapsedMs: 0, isCompleted: false };

  if (t.status === "idle") {
    return { status: "idle", remainingMs: t.durationMs, elapsedMs: 0, isCompleted: false };
  }

  if (t.status === "completed") {
    return { status: "completed", remainingMs: 0, elapsedMs: t.durationMs, isCompleted: true };
  }

  if (t.status === "paused") {
    const remaining = Math.max(0, t.remainingMs ?? t.durationMs);
    return {
      status: "paused",
      remainingMs: remaining,
      elapsedMs: t.durationMs - remaining,
      isCompleted: false,
    };
  }

  // running
  const now = Date.now();
  const end = t.expectedEndAt ?? now;
  const remainingMs = Math.max(0, end - now);
  const elapsedMs = t.durationMs - remainingMs;
  const isCompleted = remainingMs <= 0;
  return {
    status: isCompleted ? "completed" : "running",
    remainingMs,
    elapsedMs,
    isCompleted,
  };
}

export function formatMmSs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
