/**
 * Hermes Tasks Tool — leitura do estado de tarefas.
 *
 * Tudo aqui é puro (lê do localStorage) e seguro pra rodar no servidor
 * (no SSR retorna listas vazias). O Planner deve chamar antes de
 * responder perguntas como "o que tenho hoje?", "quantas tarefas?",
 * "qual minha próxima tarefa?".
 */

import type { Task, TaskTag } from "@/lib/focus-store";

const KEY_TASKS = "fm.tasks";

function readTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_TASKS);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type TaskFilter = {
  when?: "today" | "week" | "overdue" | "all";
  tag?: TaskTag;
  status?: "open" | "done" | "all";
};

export function listTasks(filter: TaskFilter = {}): Task[] {
  const { when = "all", tag, status = "open" } = filter;
  const now = Date.now();
  const today = todayKey();
  const weekEnd = now + 7 * 86_400_000;
  return readTasks().filter((t) => {
    if (status === "open" && t.done) return false;
    if (status === "done" && !t.done) return false;
    if (tag && t.tag !== tag) return false;
    if (when === "today") {
      const isToday = t.scheduledFor === today || (t.dueAt && t.dueAt <= now + 86_400_000);
      if (!isToday) return false;
    } else if (when === "week") {
      if (!t.dueAt || t.dueAt > weekEnd) return false;
    } else if (when === "overdue") {
      if (!t.dueAt || t.dueAt >= now || t.done) return false;
    }
    return true;
  });
}

export function findTask(query: string): Task | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const all = readTasks();
  return (
    all.find((t) => t.title.toLowerCase() === q) ??
    all.find((t) => t.title.toLowerCase().includes(q)) ??
    null
  );
}

export type TaskStats = {
  total: number;
  open: number;
  done: number;
  overdue: number;
  today: number;
  byTag: Partial<Record<TaskTag, number>>;
};

export function getTaskStats(): TaskStats {
  const all = readTasks();
  const now = Date.now();
  const today = todayKey();
  const stats: TaskStats = { total: all.length, open: 0, done: 0, overdue: 0, today: 0, byTag: {} };
  for (const t of all) {
    if (t.done) stats.done += 1;
    else stats.open += 1;
    if (!t.done && t.dueAt && t.dueAt < now) stats.overdue += 1;
    if (t.scheduledFor === today) stats.today += 1;
    if (t.tag) stats.byTag[t.tag] = (stats.byTag[t.tag] ?? 0) + 1;
  }
  return stats;
}

export function getNextTask(): Task | null {
  const open = readTasks()
    .filter((t) => !t.done)
    .sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity));
  return open[0] ?? null;
}
