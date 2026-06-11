export type TimerStatus = "idle" | "running" | "paused" | "completed";

export type TimerMode = "focus" | "short_break" | "long_break" | "custom";

export type PersistedTimer = {
  id: string;
  mode: TimerMode;
  title: string;
  status: TimerStatus;
  durationMs: number;
  startedAt?: number;
  pausedAt?: number;
  remainingMs?: number;
  /** Date.now() em que o timer terminará (quando running). */
  expectedEndAt?: number;
  taskId?: string;
  /** Tag para registro de atividade. */
  tag?: string;
  createdAt: number;
  updatedAt: number;
};

export type TimerSnapshot = {
  status: TimerStatus;
  remainingMs: number;
  elapsedMs: number;
  isCompleted: boolean;
};
