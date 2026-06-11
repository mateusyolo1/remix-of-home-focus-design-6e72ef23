/**
 * Hermes Learning Loop — Memory.
 *
 * Memórias de longo prazo (preferências, correções, padrões, erros).
 * São o que o Planner/Improve usarão antes de responder.
 *
 * APIs principais:
 *   addMemory()          — cria nova memória (no-op se flag OFF)
 *   updateMemory()       — atualiza confidence/active/text
 *   deactivateMemory()   — soft-disable (mantém histórico)
 *   removeMemory()       — apaga definitivamente
 *   clearMemories()      — limpa tudo
 *   listMemories()       — leitura síncrona
 *   useHermesMemories()  — hook reativo
 *   topMemoriesByType()  — usado pelo Improve
 */

import { useEffect, useState } from "react";
import type { HermesMemory, HermesMemoryType, HermesMemorySource } from "./types";
import { hid, isLearningLoopEnabled } from "./flag";

const KEY = "fm.hermes.memories";
const EVT = "fm:hermes:memories";
const MAX = 200;

function read(): HermesMemory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HermesMemory[]) : [];
  } catch {
    return [];
  }
}

function write(items: HermesMemory[]) {
  if (typeof window === "undefined") return;
  try {
    // Mantém as MAX mais recentes por updatedAt
    const trimmed = [...items].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* quota — drop */
  }
}

export type AddMemoryInput = {
  type: HermesMemoryType;
  text: string;
  rule?: string;
  confidence?: number;
  source: HermesMemorySource;
  entityId?: string;
  active?: boolean;
  meta?: Record<string, unknown>;
};

/**
 * Adiciona memória. Se já existe uma memória com o mesmo `text` e `type`,
 * reforça (incrementa confidence) ao invés de duplicar.
 */
export function addMemory(input: AddMemoryInput): HermesMemory | null {
  if (!isLearningLoopEnabled()) return null;
  const items = read();
  const dup = items.find((m) => m.type === input.type && m.text === input.text);
  const now = Date.now();
  if (dup) {
    dup.confidence = Math.min(1, dup.confidence + 0.1);
    dup.active = input.active ?? dup.active;
    dup.updatedAt = now;
    if (input.meta) dup.meta = { ...dup.meta, ...input.meta };
    write(items);
    return dup;
  }
  const m: HermesMemory = {
    id: hid("mem"),
    type: input.type,
    text: input.text,
    rule: input.rule,
    confidence: Math.max(0, Math.min(1, input.confidence ?? 0.5)),
    source: input.source,
    entityId: input.entityId,
    active: input.active ?? true,
    meta: input.meta,
    createdAt: now,
    updatedAt: now,
  };
  items.push(m);
  write(items);
  return m;
}

export function updateMemory(id: string, patch: Partial<HermesMemory>) {
  const items = read();
  const idx = items.findIndex((m) => m.id === id);
  if (idx < 0) return;
  items[idx] = { ...items[idx], ...patch, updatedAt: Date.now() };
  write(items);
}

export function deactivateMemory(id: string) {
  updateMemory(id, { active: false });
}

export function activateMemory(id: string) {
  updateMemory(id, { active: true });
}

export function removeMemory(id: string) {
  write(read().filter((m) => m.id !== id));
}

export function clearMemories() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVT));
}

export function listMemories(): HermesMemory[] {
  return read();
}

/**
 * Retorna até `limit` memórias ativas, ordenadas por confidence desc.
 * Usado pelo passo Improve (carregar contexto antes de planejar).
 */
export function topMemoriesByType(
  type: HermesMemoryType | HermesMemoryType[],
  limit = 5,
): HermesMemory[] {
  const types = Array.isArray(type) ? type : [type];
  return read()
    .filter((m) => m.active && types.includes(m.type))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

export function useHermesMemories() {
  const [memories, setMemories] = useState<HermesMemory[]>([]);
  useEffect(() => {
    setMemories(read());
    const refresh = () => setMemories(read());
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return {
    memories,
    add: addMemory,
    update: updateMemory,
    deactivate: deactivateMemory,
    activate: activateMemory,
    remove: removeMemory,
    clear: clearMemories,
  };
}
