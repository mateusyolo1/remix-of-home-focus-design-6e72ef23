/**
 * Hermes Lists Tool — leitura de checklists.
 * Puro, SSR-safe. Lê de `fm.lists`.
 */

import type { CheckList, ListItem } from "@/lib/focus-store";

const KEY_LISTS = "fm.lists";

function read(): CheckList[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_LISTS);
    return raw ? (JSON.parse(raw) as CheckList[]) : [];
  } catch {
    return [];
  }
}

export function listLists(): CheckList[] {
  return read().filter((l) => !l.completedAt);
}

export function getList(idOrTitle: string): CheckList | null {
  const q = idOrTitle.trim().toLowerCase();
  if (!q) return null;
  const all = read();
  return (
    all.find((l) => l.id === idOrTitle) ??
    all.find((l) => l.title.toLowerCase() === q) ??
    all.find((l) => l.title.toLowerCase().includes(q)) ??
    null
  );
}

export type FoundListItem = { list: CheckList; item: ListItem };

export function findListItem(query: string): FoundListItem | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  for (const list of read()) {
    const item =
      list.items.find((i) => i.text.toLowerCase() === q) ??
      list.items.find((i) => i.text.toLowerCase().includes(q));
    if (item) return { list, item };
  }
  return null;
}

export type ListStats = { total: number; open: number; lists: number };

export function getListStats(): ListStats {
  const all = read();
  let total = 0;
  let open = 0;
  for (const l of all) {
    for (const i of l.items) {
      total += 1;
      if (!i.done) open += 1;
    }
  }
  return { total, open, lists: all.length };
}
