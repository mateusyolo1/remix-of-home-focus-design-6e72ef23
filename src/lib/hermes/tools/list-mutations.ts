/**
 * Hermes List Mutations — escrita direta em `fm.lists`.
 * Dispara `fm:store` para re-renderizar componentes que usam `useLists`.
 * Operações destrutivas (deleteList, removeItems) devem passar por
 * `HermesConfirmation` antes de executar.
 */

import type { CheckList } from "@/lib/focus-store";
import { getList } from "./lists-tool";

const KEY_LISTS = "fm.lists";
const EVT = "fm:store";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function read(): CheckList[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_LISTS);
    return raw ? (JSON.parse(raw) as CheckList[]) : [];
  } catch {
    return [];
  }
}

function write(list: CheckList[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_LISTS, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT, { detail: { key: KEY_LISTS } }));
}

function resolveId(idOrTitle: string): string | null {
  const all = read();
  if (all.some((l) => l.id === idOrTitle)) return idOrTitle;
  return getList(idOrTitle)?.id ?? null;
}

export type ListMutationResult = { ok: boolean; listId?: string; reason?: string };

export function toggleItem(listIdOrTitle: string, itemQuery: string): ListMutationResult {
  const id = resolveId(listIdOrTitle);
  if (!id) return { ok: false, reason: "list not found" };
  const q = itemQuery.trim().toLowerCase();
  let found = false;
  write(
    read().map((l) => {
      if (l.id !== id) return l;
      return {
        ...l,
        items: l.items.map((i) => {
          if (found) return i;
          if (i.id === itemQuery || i.text.toLowerCase().includes(q)) {
            found = true;
            return { ...i, done: !i.done };
          }
          return i;
        }),
      };
    }),
  );
  return found ? { ok: true, listId: id } : { ok: false, reason: "item not found" };
}

export function addItems(listIdOrTitle: string, texts: string[]): ListMutationResult {
  const id = resolveId(listIdOrTitle);
  if (!id) return { ok: false, reason: "list not found" };
  write(
    read().map((l) =>
      l.id === id
        ? { ...l, items: [...l.items, ...texts.map((t) => ({ id: uid(), text: t, done: false }))] }
        : l,
    ),
  );
  return { ok: true, listId: id };
}

export function removeItems(listIdOrTitle: string, itemQueries: string[]): ListMutationResult {
  const id = resolveId(listIdOrTitle);
  if (!id) return { ok: false, reason: "list not found" };
  const qs = itemQueries.map((q) => q.trim().toLowerCase());
  write(
    read().map((l) =>
      l.id === id
        ? {
            ...l,
            items: l.items.filter(
              (i) => !qs.some((q) => i.id === q || i.text.toLowerCase().includes(q)),
            ),
          }
        : l,
    ),
  );
  return { ok: true, listId: id };
}

export function renameList(listIdOrTitle: string, title: string): ListMutationResult {
  const id = resolveId(listIdOrTitle);
  if (!id) return { ok: false, reason: "list not found" };
  write(read().map((l) => (l.id === id ? { ...l, title } : l)));
  return { ok: true, listId: id };
}

export function deleteList(listIdOrTitle: string): ListMutationResult {
  const id = resolveId(listIdOrTitle);
  if (!id) return { ok: false, reason: "list not found" };
  write(read().filter((l) => l.id !== id));
  return { ok: true, listId: id };
}

export function completeList(listIdOrTitle: string): ListMutationResult {
  const id = resolveId(listIdOrTitle);
  if (!id) return { ok: false, reason: "list not found" };
  write(
    read().map((l) =>
      l.id === id ? { ...l, completedAt: new Date().toISOString() } : l,
    ),
  );
  return { ok: true, listId: id };
}
