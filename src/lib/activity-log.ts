import { useEffect, useState } from "react";

export type ActivityKind =
  | "task"
  | "note"
  | "list"
  | "block"
  | "task_done"
  | "list_item_done"
  | "focus"
  | "presence";

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

const LAST_SEEN_KEY = "fm.last-seen";
const BACKFILL_KEY = "fm.presence-backfilled";

export function markPresenceFor(dateKey: string, title = "Entrou no app") {
  const list = read();
  if (list.some((e) => e.kind === "presence" && e.date === dateKey)) return;
  const now = new Date();
  const [y, m, d] = dateKey.split("-").map(Number);
  // Usa meio-dia local para não vazar para outro dia por fuso.
  const at = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0).toISOString();
  const entry: ActivityEntry = {
    id: uid(),
    kind: "presence",
    title,
    at: dateKey === dateKeyLocal(now) ? now.toISOString() : at,
    date: dateKey,
  };
  list.unshift(entry);
  write(list.slice(0, 5000));
}

function daysBetween(fromKey: string, toKey: string): string[] {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  const out: string[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    out.push(dateKeyLocal(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * Marca presença do dia (entrou no app). Idempotente: registra no máximo
 * uma entrada "presence" por dia local. NÃO preenche dias passados — se o
 * usuário não abriu o app, aquele dia conta como falta.
 */
export function markPresenceToday() {
  if (typeof window === "undefined") return;
  const today = dateKeyLocal();
  markPresenceFor(today, "Entrou no app");
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, today);
  } catch {
    /* noop */
  }
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
  presence: "Presença no app",
};
