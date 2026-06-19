/**
 * Hermes Memory Tool — acesso ao banco de memórias aprendidas.
 *
 * Wrapper fino sobre `memory-store` que expõe operações seguras pro
 * Planner: lembrar de preferências do usuário, salvar correções e
 * esquecer regras.
 */

import { getMemories, setMemories, uid } from "@/lib/hermes/memory-store";
import type { HermesMemory, MemoryType } from "@/lib/hermes/learning-types";
import { isSensitive } from "@/lib/hermes/learning-types";

export type RecallFilter = {
  query?: string;
  type?: MemoryType;
  limit?: number;
  includeDisabled?: boolean;
};

function score(mem: HermesMemory, q: string): number {
  const text = `${mem.text} ${mem.rule ?? ""} ${(mem.keywords ?? []).join(" ")}`.toLowerCase();
  if (!q) return mem.confidence;
  const hits = q
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3 && text.includes(w)).length;
  return hits + mem.confidence;
}

export function recallMemories(filter: RecallFilter = {}): HermesMemory[] {
  const { query = "", type, limit = 5, includeDisabled = false } = filter;
  return getMemories()
    .filter((m) => (includeDisabled ? true : !m.disabled))
    .filter((m) => (type ? m.type === type : true))
    .map((m) => ({ m, s: score(m, query) }))
    .filter(({ s }) => (query ? s > 0 : true))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ m }) => m);
}

export function saveMemory(input: {
  text: string;
  type?: MemoryType;
  rule?: string;
  confidence?: number;
}): HermesMemory | null {
  if (isSensitive(input.text) || (input.rule && isSensitive(input.rule))) return null;
  const now = new Date().toISOString();
  const mem: HermesMemory = {
    id: uid(),
    type: input.type ?? "preference",
    source: "chat",
    confidence: Math.min(1, Math.max(0, input.confidence ?? 0.7)),
    text: input.text,
    rule: input.rule,
    createdAt: now,
    updatedAt: now,
  };
  setMemories([mem, ...getMemories()].slice(0, 200));
  return mem;
}

export function forgetMemory(id: string): boolean {
  const before = getMemories();
  const after = before.filter((m) => m.id !== id);
  if (after.length === before.length) return false;
  setMemories(after);
  return true;
}
