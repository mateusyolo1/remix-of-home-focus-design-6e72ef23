import { useEffect, useState } from "react";

export type ActiveTask = {
  time: string;
  title: string;
  tag: string;
  goal: string;
  minutes: number;
} | null;

export type Subtask = { id: string; text: string; done: boolean };

const KEY_ACTIVE = "fm.active-task";
const KEY_NOTES = "fm.notes"; // { [time]: htmlString }
const KEY_STEPS = "fm.steps"; // { [time]: Subtask[] }

const EVT = "fm:store";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(EVT, { detail: { key } }));
}

function useStoreValue<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => read(key, fallback));
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { key: string } | undefined;
      if (!detail || detail.key === key) setVal(read(key, fallback));
    };
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = (v: T) => write(key, v);
  return [val, update];
}

export function useActiveTask() {
  return useStoreValue<ActiveTask>(KEY_ACTIVE, null);
}

export function useNotes() {
  const [map, setMap] = useStoreValue<Record<string, string>>(KEY_NOTES, {});
  const set = (time: string, html: string) => setMap({ ...map, [time]: html });
  return { notes: map, setNote: set };
}

export function useSteps(time: string | null) {
  const [map, setMap] = useStoreValue<Record<string, Subtask[]>>(KEY_STEPS, {});
  const steps = time ? map[time] ?? [] : [];
  const setSteps = (next: Subtask[]) => {
    if (!time) return;
    setMap({ ...map, [time]: next });
  };
  return [steps, setSteps] as const;
}
