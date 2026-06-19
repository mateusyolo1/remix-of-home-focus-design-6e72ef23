/**
 * Hermes Note Mutations — escrita em `fm.quick-notes`.
 * `deleteNote` é destrutiva — exigir `HermesConfirmation` antes.
 */

import type { QuickNote } from "@/lib/focus-store";
import { getNote } from "./notes-tool";

const KEY_QNOTES = "fm.quick-notes";
const EVT = "fm:store";

function read(): QuickNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_QNOTES);
    return raw ? (JSON.parse(raw) as QuickNote[]) : [];
  } catch {
    return [];
  }
}

function write(list: QuickNote[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_QNOTES, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT, { detail: { key: KEY_QNOTES } }));
}

function resolveId(idOrTitle: string): string | null {
  const all = read();
  if (all.some((n) => n.id === idOrTitle)) return idOrTitle;
  return getNote(idOrTitle)?.id ?? null;
}

export type NoteMutationResult = { ok: boolean; noteId?: string; reason?: string };

export function updateNote(
  idOrTitle: string,
  patch: Partial<Pick<QuickNote, "title" | "body" | "ttlDays">>,
): NoteMutationResult {
  const id = resolveId(idOrTitle);
  if (!id) return { ok: false, reason: "note not found" };
  write(read().map((n) => (n.id === id ? { ...n, ...patch } : n)));
  return { ok: true, noteId: id };
}

export function deleteNote(idOrTitle: string): NoteMutationResult {
  const id = resolveId(idOrTitle);
  if (!id) return { ok: false, reason: "note not found" };
  write(read().filter((n) => n.id !== id));
  return { ok: true, noteId: id };
}

export function archiveNote(idOrTitle: string): NoteMutationResult {
  const id = resolveId(idOrTitle);
  if (!id) return { ok: false, reason: "note not found" };
  write(
    read().map((n) =>
      n.id === id ? { ...n, archivedAt: new Date().toISOString() } : n,
    ),
  );
  return { ok: true, noteId: id };
}

export function extendTtl(idOrTitle: string, extraDays: number): NoteMutationResult {
  const id = resolveId(idOrTitle);
  if (!id) return { ok: false, reason: "note not found" };
  write(
    read().map((n) =>
      n.id === id ? { ...n, ttlDays: (n.ttlDays ?? 7) + extraDays } : n,
    ),
  );
  return { ok: true, noteId: id };
}
