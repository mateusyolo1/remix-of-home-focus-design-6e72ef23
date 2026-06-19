/**
 * Hermes Notes Tool — leitura de quick notes.
 * Puro, SSR-safe. Lê de `fm.quick-notes`.
 */

import type { QuickNote } from "@/lib/focus-store";

const KEY_QNOTES = "fm.quick-notes";

function read(): QuickNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_QNOTES);
    return raw ? (JSON.parse(raw) as QuickNote[]) : [];
  } catch {
    return [];
  }
}

export type NoteFilter = {
  recent?: number;
  query?: string;
  includeArchived?: boolean;
};

export function listNotes(filter: NoteFilter = {}): QuickNote[] {
  const { recent, query, includeArchived = false } = filter;
  const q = query?.trim().toLowerCase();
  let all = read().filter((n) => includeArchived || !n.archivedAt);
  if (q) {
    all = all.filter(
      (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
    );
  }
  all = all.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return typeof recent === "number" ? all.slice(0, recent) : all;
}

export function getNote(idOrTitle: string): QuickNote | null {
  const q = idOrTitle.trim().toLowerCase();
  if (!q) return null;
  const all = read();
  return (
    all.find((n) => n.id === idOrTitle) ??
    all.find((n) => n.title.toLowerCase() === q) ??
    all.find((n) => n.title.toLowerCase().includes(q)) ??
    null
  );
}

/* ============== SIMILARIDADE (Jaccard) ============== */

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export type NoteMatch = { note: QuickNote; score: number };

/**
 * Busca notas semelhantes a um trecho de texto livre.
 * Retorna até `limit` notas com score >= `minScore`.
 */
export function findSimilarNotes(
  query: string,
  opts: { limit?: number; minScore?: number; includeArchived?: boolean } = {},
): NoteMatch[] {
  const { limit = 5, minScore = 0.08, includeArchived = false } = opts;
  const q = tokenize(query);
  if (!q.size) return [];
  const pool = read().filter((n) => includeArchived || !n.archivedAt);
  const scored: NoteMatch[] = pool.map((note) => ({
    note,
    score: jaccard(q, tokenize(`${note.title} ${note.body}`)),
  }));
  return scored
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
