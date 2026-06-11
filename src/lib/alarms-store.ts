import { useEffect, useState } from "react";

export type AlarmRepeat =
  | "once"
  | "weekday" // seg-sex
  | "weekend"
  | "daily"
  | "custom"; // ver `days`

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo

export type Alarm = {
  id: string;
  label: string;
  /** HH:MM 24h */
  time: string;
  enabled: boolean;
  repeat: AlarmRepeat;
  /** Para "custom": dias da semana habilitados (0..6) */
  days?: WeekDay[];
  /** Tocar som curto ao disparar. */
  sound: boolean;
  /** Enviar notificação do sistema. */
  notify: boolean;
  /** ISO do último disparo, evita duplicar no mesmo minuto. */
  lastFiredAt?: string;
};

const KEY = "fm.alarms";
const EVT = "fm:alarms";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function read(): Alarm[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Alarm[]) : [];
  } catch {
    return [];
  }
}

function write(list: Alarm[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useAlarms() {
  const [list, setList] = useState<Alarm[]>([]);
  useEffect(() => {
    setList(read());
    const on = () => setList(read());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(EVT, on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const add = (input: Omit<Alarm, "id" | "enabled"> & Partial<Pick<Alarm, "enabled">>) => {
    const a: Alarm = {
      id: uid(),
      enabled: input.enabled ?? true,
      label: input.label,
      time: input.time,
      repeat: input.repeat,
      days: input.days,
      sound: input.sound,
      notify: input.notify,
    };
    const next = [...read(), a].sort((x, y) => x.time.localeCompare(y.time));
    write(next);
    return a;
  };
  const update = (id: string, patch: Partial<Alarm>) =>
    write(read().map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const remove = (id: string) => write(read().filter((a) => a.id !== id));
  const toggle = (id: string) =>
    write(read().map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));

  return { list, add, update, remove, toggle };
}

/** Decide se um alarme deve disparar agora (mesmo minuto). */
export function shouldFire(a: Alarm, now: Date): boolean {
  if (!a.enabled) return false;
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  if (`${hh}:${mm}` !== a.time) return false;
  // Evitar disparar duas vezes no mesmo minuto.
  if (a.lastFiredAt) {
    const last = new Date(a.lastFiredAt);
    if (last.getFullYear() === now.getFullYear()
      && last.getMonth() === now.getMonth()
      && last.getDate() === now.getDate()
      && last.getHours() === now.getHours()
      && last.getMinutes() === now.getMinutes()) return false;
  }
  const dow = now.getDay() as WeekDay;
  switch (a.repeat) {
    case "once":
      return true;
    case "daily":
      return true;
    case "weekday":
      return dow >= 1 && dow <= 5;
    case "weekend":
      return dow === 0 || dow === 6;
    case "custom":
      return Array.isArray(a.days) && a.days.includes(dow);
  }
}

export function describeRepeat(a: Alarm): string {
  switch (a.repeat) {
    case "once":
      return "Uma vez";
    case "daily":
      return "Todos os dias";
    case "weekday":
      return "Seg a sex";
    case "weekend":
      return "Fim de semana";
    case "custom": {
      const map = ["D", "S", "T", "Q", "Q", "S", "S"];
      return (a.days ?? []).sort().map((d) => map[d]).join(" · ") || "Nenhum dia";
    }
  }
}
