import { useEffect, useState } from "react";

export type ActivityKind = "task" | "note" | "list" | "block" | "task_done" | "list_item_done";

export type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
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

export function logActivity(input: { kind: ActivityKind; title: string; detail?: string }) {
  const now = new Date();
  const entry: ActivityEntry = {
    id: uid(),
    kind: input.kind,
    title: input.title,
    detail: input.detail,
    at: now.toISOString(),
    date: dateKeyLocal(now),
  };
  const list = read();
  list.unshift(entry);
  write(list.slice(0, 5000));
  return entry;
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
};
