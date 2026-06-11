/**
 * Agent Memory — fachada tipada sobre o memory-store.
 * Estende o storage existente para guardar também sugestões de tag e decisões,
 * sem duplicar storage.
 */
import { useEffect, useState } from "react";
import {
  getMemories,
  setMemories,
  uid,
} from "./memory-store";
import { isSensitive, type HermesMemory as RawMemory } from "./learning-types";
import type { MemorySource, MemoryType } from "./learning-types";

const EVT = "fm.hermes.agent";

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVT));
  }
}

function now() {
  return new Date().toISOString();
}

export type AgentMemoryInput = {
  type: MemoryType;
  source: MemorySource;
  text: string;
  rule?: string;
  confidence?: number;
  tag?: RawMemory["tag"];
  keywords?: string[];
  /** dados auxiliares para sugestões/decisões. */
  meta?: Record<string, unknown>;
};

/** Insere uma memória, evitando duplicatas exatas de regra. */
export function pushAgentMemory(input: AgentMemoryInput): RawMemory | null {
  if (isSensitive(input.text) || (input.rule && isSensitive(input.rule))) return null;
  const list = getMemories();
  const dup = list.find(
    (m) =>
      m.type === input.type &&
      ((m.rule && input.rule && m.rule === input.rule) ||
        (!m.rule && !input.rule && m.text === input.text)),
  );
  if (dup) {
    const merged = list.map((m) =>
      m.id === dup.id
        ? {
            ...m,
            confidence: Math.min(1, m.confidence + 0.1),
            updatedAt: now(),
            // mantém meta antiga, mescla nova
            ...(input.meta ? { meta: { ...((m as RawMemory & { meta?: Record<string, unknown> }).meta ?? {}), ...input.meta } } : {}),
          }
        : m,
    );
    setMemories(merged);
    emit();
    return merged.find((m) => m.id === dup.id) ?? null;
  }
  const mem: RawMemory & { meta?: Record<string, unknown> } = {
    id: uid(),
    type: input.type,
    source: input.source,
    text: input.text,
    rule: input.rule,
    confidence: input.confidence ?? 0.5,
    tag: input.tag,
    keywords: input.keywords,
    createdAt: now(),
    updatedAt: now(),
    ...(input.meta ? { meta: input.meta } : {}),
  };
  setMemories([mem, ...list].slice(0, 300));
  emit();
  return mem;
}

export function updateAgentMemory(
  id: string,
  patch: Partial<RawMemory> & { meta?: Record<string, unknown> },
) {
  const list = getMemories();
  const next = list.map((m) =>
    m.id === id
      ? {
          ...m,
          ...patch,
          ...(patch.meta
            ? { meta: { ...((m as RawMemory & { meta?: Record<string, unknown> }).meta ?? {}), ...patch.meta } }
            : {}),
          updatedAt: now(),
        }
      : m,
  );
  setMemories(next);
  emit();
}

export function removeAgentMemory(id: string) {
  setMemories(getMemories().filter((m) => m.id !== id));
  emit();
}

export function listByType(type: MemoryType): (RawMemory & { meta?: Record<string, unknown> })[] {
  return getMemories().filter((m) => m.type === type) as (RawMemory & {
    meta?: Record<string, unknown>;
  })[];
}

export function useAgentMemoryStream() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const sync = () => setTick((t) => t + 1);
    window.addEventListener(EVT, sync);
    window.addEventListener("fm.hermes.memory", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("fm.hermes.memory", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return tick;
}
