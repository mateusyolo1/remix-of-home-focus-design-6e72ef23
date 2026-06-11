import { useEffect, useState } from "react";
import type { PersistedTimer, TimerMode } from "./timer-types";
import { getTimerSnapshot } from "./timer-engine";

const KEY = "fm.timer.v1";
const EVT = "fm:timer";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function readTimer(): PersistedTimer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PersistedTimer) : null;
  } catch {
    return null;
  }
}

function writeTimer(t: PersistedTimer | null) {
  if (typeof window === "undefined") return;
  if (t) window.localStorage.setItem(KEY, JSON.stringify(t));
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVT));
}

export function getStoredTimer(): PersistedTimer | null {
  return readTimer();
}

export function setStoredTimer(t: PersistedTimer | null) {
  writeTimer(t);
}

/** Cria um novo timer (idle) com a duração informada (sem iniciar ainda). */
export function createTimer(input: {
  mode?: TimerMode;
  title?: string;
  durationMs: number;
  taskId?: string;
  tag?: string;
}): PersistedTimer {
  const now = Date.now();
  const t: PersistedTimer = {
    id: uid(),
    mode: input.mode ?? "focus",
    title: input.title ?? "Foco",
    status: "idle",
    durationMs: input.durationMs,
    remainingMs: input.durationMs,
    taskId: input.taskId,
    tag: input.tag,
    createdAt: now,
    updatedAt: now,
  };
  writeTimer(t);
  return t;
}

export function startTimer(): PersistedTimer | null {
  const current = readTimer();
  if (!current) return null;
  const now = Date.now();
  const remaining =
    current.status === "paused"
      ? current.remainingMs ?? current.durationMs
      : current.durationMs;
  const next: PersistedTimer = {
    ...current,
    status: "running",
    startedAt: current.startedAt ?? now,
    pausedAt: undefined,
    remainingMs: remaining,
    expectedEndAt: now + remaining,
    updatedAt: now,
  };
  writeTimer(next);
  return next;
}

export function pauseTimer(): PersistedTimer | null {
  const current = readTimer();
  if (!current || current.status !== "running") return current;
  const snap = getTimerSnapshot(current);
  const now = Date.now();
  const next: PersistedTimer = {
    ...current,
    status: "paused",
    pausedAt: now,
    remainingMs: snap.remainingMs,
    expectedEndAt: undefined,
    updatedAt: now,
  };
  writeTimer(next);
  return next;
}

export function resetTimer(): PersistedTimer | null {
  const current = readTimer();
  if (!current) return null;
  const now = Date.now();
  const next: PersistedTimer = {
    ...current,
    status: "idle",
    startedAt: undefined,
    pausedAt: undefined,
    remainingMs: current.durationMs,
    expectedEndAt: undefined,
    updatedAt: now,
  };
  writeTimer(next);
  return next;
}

export function completeTimer(): PersistedTimer | null {
  const current = readTimer();
  if (!current) return null;
  const now = Date.now();
  const next: PersistedTimer = {
    ...current,
    status: "completed",
    remainingMs: 0,
    expectedEndAt: undefined,
    updatedAt: now,
  };
  writeTimer(next);
  return next;
}

export function clearTimer() {
  writeTimer(null);
}

export function setTimerDuration(durationMs: number): PersistedTimer | null {
  const current = readTimer();
  const now = Date.now();
  if (!current) {
    return createTimer({ durationMs });
  }
  const next: PersistedTimer = {
    ...current,
    durationMs,
    remainingMs: durationMs,
    status: "idle",
    startedAt: undefined,
    pausedAt: undefined,
    expectedEndAt: undefined,
    updatedAt: now,
  };
  writeTimer(next);
  return next;
}

/** Hook reativo ao timer persistido (e a updates entre abas). */
export function usePersistedTimer() {
  const [t, setT] = useState<PersistedTimer | null>(null);
  useEffect(() => {
    setT(readTimer());
    const on = () => setT(readTimer());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", on);
    window.addEventListener("visibilitychange", on);
    return () => {
      window.removeEventListener(EVT, on);
      window.removeEventListener("storage", on);
      window.removeEventListener("visibilitychange", on);
    };
  }, []);
  return t;
}
