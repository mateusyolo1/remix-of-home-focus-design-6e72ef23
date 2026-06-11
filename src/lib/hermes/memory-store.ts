import { useEffect, useState } from "react";
import type { HermesCreation, HermesMemory } from "./learning-types";

const KEY_MEM = "fm.hermes.memories";
const KEY_CREATIONS = "fm.hermes.creations";
const EVT = "fm.hermes.memory";

function read<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* noop */
  }
}

export function getMemories(): HermesMemory[] {
  return read<HermesMemory[]>(KEY_MEM, []);
}

export function setMemories(list: HermesMemory[]) {
  write(KEY_MEM, list);
}

export function getCreations(): HermesCreation[] {
  return read<HermesCreation[]>(KEY_CREATIONS, []);
}

export function setCreations(list: HermesCreation[]) {
  write(KEY_CREATIONS, list);
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function useHermesMemories() {
  const [items, setItems] = useState<HermesMemory[]>(() => getMemories());
  useEffect(() => {
    const sync = () => setItems(getMemories());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const remove = (id: string) => setMemories(getMemories().filter((m) => m.id !== id));
  const toggleDisabled = (id: string) =>
    setMemories(
      getMemories().map((m) =>
        m.id === id ? { ...m, disabled: !m.disabled, updatedAt: new Date().toISOString() } : m,
      ),
    );
  const clear = () => setMemories([]);
  return { memories: items, remove, toggleDisabled, clear };
}
