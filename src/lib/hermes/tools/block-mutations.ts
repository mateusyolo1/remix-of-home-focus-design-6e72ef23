/**
 * Hermes Block Mutations — escrita em `fm.blocks` (agenda).
 * `cancelBlock` é destrutiva — exigir `HermesConfirmation` antes.
 */

import type { Block } from "@/lib/focus-store";

const KEY_BLOCKS = "fm.blocks";
const EVT = "fm:store";

function read(): Block[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_BLOCKS);
    return raw ? (JSON.parse(raw) as Block[]) : [];
  } catch {
    return [];
  }
}

function write(list: Block[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_BLOCKS, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT, { detail: { key: KEY_BLOCKS } }));
}

function matches(b: Block, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return (
    b.title.toLowerCase().includes(q) ||
    b.time === q ||
    (b.date ?? "").includes(q)
  );
}

export type BlockMutationResult = { ok: boolean; reason?: string };

export function rescheduleBlock(
  query: string,
  patch: { time?: string; date?: string },
): BlockMutationResult {
  const list = read();
  const idx = list.findIndex((b) => matches(b, query));
  if (idx === -1) return { ok: false, reason: "block not found" };
  const next = [...list];
  next[idx] = { ...next[idx], ...patch };
  next.sort((a, z) => {
    const d = (a.date ?? "").localeCompare(z.date ?? "");
    return d !== 0 ? d : a.time.localeCompare(z.time);
  });
  write(next);
  return { ok: true };
}

export function cancelBlock(query: string): BlockMutationResult {
  const list = read();
  const next = list.filter((b) => !matches(b, query));
  if (next.length === list.length) return { ok: false, reason: "block not found" };
  write(next);
  return { ok: true };
}
