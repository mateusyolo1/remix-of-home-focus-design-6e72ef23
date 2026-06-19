/**
 * Hermes Agenda Tool — leitura dos blocos de agenda.
 *
 * Permite ao Planner responder "o que tenho agendado?", "qual minha
 * próxima reunião?", "tenho espaço livre amanhã às 15h?".
 */

import type { Block } from "@/lib/focus-store";

const KEY_BLOCKS = "fm.blocks";

function readBlocks(): Block[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_BLOCKS);
    return raw ? (JSON.parse(raw) as Block[]) : [];
  } catch {
    return [];
  }
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type BlockFilter = {
  date?: string;
  /** ISO range, inclusivo. */
  from?: string;
  to?: string;
};

export function listBlocks(filter: BlockFilter = {}): Block[] {
  const blocks = readBlocks();
  const today = dateKey(new Date());
  return blocks
    .filter((b) => {
      const k = b.date ?? today;
      if (filter.date && k !== filter.date) return false;
      if (filter.from && k < filter.from) return false;
      if (filter.to && k > filter.to) return false;
      return true;
    })
    .sort((a, z) => {
      const d = (a.date ?? today).localeCompare(z.date ?? today);
      return d !== 0 ? d : a.time.localeCompare(z.time);
    });
}

export function getNextBlock(): Block | null {
  const now = new Date();
  const today = dateKey(now);
  const cur = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const upcoming = readBlocks()
    .filter((b) => {
      const k = b.date ?? today;
      if (k > today) return true;
      if (k < today) return false;
      return b.time >= cur;
    })
    .sort((a, z) => {
      const d = (a.date ?? today).localeCompare(z.date ?? today);
      return d !== 0 ? d : a.time.localeCompare(z.time);
    });
  return upcoming[0] ?? null;
}

/** Retorna janelas livres entre 08:00 e 20:00, em minutos. */
export function findFreeSlots(date: string, minMinutes = 30): { start: string; end: string }[] {
  const blocks = listBlocks({ date }).map((b) => {
    const [h, m] = b.time.split(":").map(Number);
    return { start: h * 60 + m, end: h * 60 + m + 60 }; // assume 60 min default
  });
  blocks.sort((a, z) => a.start - z.start);
  const dayStart = 8 * 60;
  const dayEnd = 20 * 60;
  const free: { start: string; end: string }[] = [];
  let cursor = dayStart;
  const fmt = (n: number) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  for (const b of blocks) {
    if (b.start - cursor >= minMinutes) free.push({ start: fmt(cursor), end: fmt(b.start) });
    cursor = Math.max(cursor, b.end);
  }
  if (dayEnd - cursor >= minMinutes) free.push({ start: fmt(cursor), end: fmt(dayEnd) });
  return free;
}
