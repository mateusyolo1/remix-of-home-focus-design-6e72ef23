/**
 * Hermes Units Tool — conversões simples de tempo/data.
 * Foco em casos PT-BR comuns: "90 min em h", "quantos dias até 10/12".
 */

export type TimeUnit = "ms" | "s" | "min" | "h" | "d";

const TO_MS: Record<TimeUnit, number> = {
  ms: 1,
  s: 1_000,
  min: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function convertTime(value: number, from: TimeUnit, to: TimeUnit): number {
  return (value * TO_MS[from]) / TO_MS[to];
}

export function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < 60_000) return `${Math.round(abs / 1000)}s`;
  if (abs < 3_600_000) return `${Math.round(abs / 60_000)}min`;
  if (abs < 86_400_000) {
    const h = Math.floor(abs / 3_600_000);
    const m = Math.round((abs % 3_600_000) / 60_000);
    return m ? `${h}h${m}min` : `${h}h`;
  }
  return `${Math.round(abs / 86_400_000)}d`;
}

/** Dias inteiros entre hoje (00:00) e a data alvo. Negativo se passada. */
export function daysUntil(target: Date | string | number): number {
  const t = typeof target === "object" ? target : new Date(target);
  if (Number.isNaN(t.getTime())) return NaN;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(t);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}
