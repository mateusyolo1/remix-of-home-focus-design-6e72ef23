import { useEffect, useState } from "react";

export type ActivityKind =
  | "task"
  | "note"
  | "list"
  | "block"
  | "task_done"
  | "list_item_done"
  | "focus";

export type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
  /** Tag da tarefa, quando aplicável. */
  tag?: string;
  /** Minutos efetivos (para sessões de foco). */
  minutes?: number;
  /** ISO timestamp */
  at: string;
  /** yyyy-mm-dd local */
  date: string;
};



const KEY = "fm.activity-log";
const EVT = "fm:activity-log";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function dateKeyLocal(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function read(): ActivityEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

function write(list: ActivityEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function logActivity(input: {
  kind: ActivityKind;
  title: string;
  detail?: string;
  tag?: string;
  minutes?: number;
}) {
  const now = new Date();
  const entry: ActivityEntry = {
    id: uid(),
    kind: input.kind,
    title: input.title,
    detail: input.detail,
    tag: input.tag,
    minutes: input.minutes,
    at: now.toISOString(),
    date: dateKeyLocal(now),
  };

  const list = read();
  list.unshift(entry);
  write(list.slice(0, 5000));
  return entry;
}

/** Soma minutos de foco registrados em um dia (yyyy-mm-dd). */
export function focusMinutesOn(list: ActivityEntry[], date: string): number {
  return list
    .filter((e) => e.kind === "focus" && e.date === date)
    .reduce((acc, e) => acc + (e.minutes ?? 0), 0);
}

/** Dias consecutivos (até hoje) com pelo menos 1 atividade registrada. */
export function streakDays(list: ActivityEntry[]): number {
  if (list.length === 0) return 0;
  const days = new Set(list.map((e) => e.date));
  let count = 0;
  const d = new Date();
  while (true) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (days.has(k)) {
      count += 1;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return count;
}


export function useActivityLog() {
  const [list, setList] = useState<ActivityEntry[]>([]);
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
  return list;
}

export function activitiesByDate(list: ActivityEntry[]): Map<string, ActivityEntry[]> {
  const m = new Map<string, ActivityEntry[]>();
  for (const e of list) {
    const arr = m.get(e.date) ?? [];
    arr.push(e);
    m.set(e.date, arr);
  }
  return m;
}

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  task: "Tarefa criada",
  task_done: "Tarefa concluída",
  note: "Nota criada",
  list: "Lista criada",
  list_item_done: "Item concluído",
  block: "Bloco agendado",
  focus: "Sessão de foco",
};
