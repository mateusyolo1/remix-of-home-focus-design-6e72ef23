/**
 * Hermes Task Mutations — escrita direta no storage de tarefas.
 *
 * Escrevemos no localStorage e disparamos `fm:store` para que componentes
 * que usam `useTasks` re-renderizem automaticamente (ver focus-store.ts).
 *
 * Mutações destrutivas (delete) devem ser oferecidas pelo Planner via
 * `HermesConfirmation` antes de chamar aqui.
 */

import type { Task, TaskTag } from "@/lib/focus-store";
import { findTask } from "./tasks-tool";

const KEY_TASKS = "fm.tasks";
const EVT = "fm:store";

function read(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_TASKS);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

function write(list: Task[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_TASKS, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT, { detail: { key: KEY_TASKS } }));
}

function resolveId(idOrQuery: string): string | null {
  const list = read();
  if (list.some((t) => t.id === idOrQuery)) return idOrQuery;
  return findTask(idOrQuery)?.id ?? null;
}

export type MutationResult = { ok: boolean; taskId?: string; reason?: string };

export function completeTask(idOrQuery: string): MutationResult {
  const id = resolveId(idOrQuery);
  if (!id) return { ok: false, reason: "task not found" };
  write(read().map((t) => (t.id === id ? { ...t, done: true } : t)));
  return { ok: true, taskId: id };
}

export function reopenTask(idOrQuery: string): MutationResult {
  const id = resolveId(idOrQuery);
  if (!id) return { ok: false, reason: "task not found" };
  write(read().map((t) => (t.id === id ? { ...t, done: false } : t)));
  return { ok: true, taskId: id };
}

export function updateTask(
  idOrQuery: string,
  patch: Partial<Pick<Task, "title" | "tag" | "dueAt" | "reminderAt" | "important" | "scheduledFor">>,
): MutationResult {
  const id = resolveId(idOrQuery);
  if (!id) return { ok: false, reason: "task not found" };
  write(read().map((t) => (t.id === id ? { ...t, ...patch } : t)));
  return { ok: true, taskId: id };
}

export function deleteTask(idOrQuery: string): MutationResult {
  const id = resolveId(idOrQuery);
  if (!id) return { ok: false, reason: "task not found" };
  write(read().filter((t) => t.id !== id));
  return { ok: true, taskId: id };
}

export function moveTaskToToday(idOrQuery: string): MutationResult {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return updateTask(idOrQuery, { scheduledFor: today });
}

export function setTaskTag(idOrQuery: string, tag: TaskTag): MutationResult {
  return updateTask(idOrQuery, { tag });
}
