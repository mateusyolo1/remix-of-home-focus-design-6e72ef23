import { useEffect, useState } from "react";

export type WorkDay = { enabled: boolean; hours: number };
export type Schedule = Record<
  "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom",
  WorkDay
>;

export type City = {
  name: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
} | null;

export type Profile = {
  name: string;
  age: number | null;
  job: string;
  city: City;
  schedule: Schedule;
};

const KEY_PROFILE = "fm.profile";
const KEY_CHECKINS = "fm.checkins"; // string[] of YYYY-MM-DD
const EVT = "fm:profile";

const DEFAULT_SCHEDULE: Schedule = {
  seg: { enabled: true, hours: 8 },
  ter: { enabled: true, hours: 8 },
  qua: { enabled: true, hours: 8 },
  qui: { enabled: true, hours: 8 },
  sex: { enabled: true, hours: 8 },
  sab: { enabled: false, hours: 0 },
  dom: { enabled: false, hours: 0 },
};

export const DEFAULT_PROFILE: Profile = {
  name: "Tiago Almeida",
  age: null,
  job: "",
  city: { name: "São Paulo", state: "SP", country: "Brasil", latitude: -23.5505, longitude: -46.6333 },
  schedule: DEFAULT_SCHEDULE,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, v: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent(EVT, { detail: { key } }));
}

function useStore<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => read(key, fallback));
  useEffect(() => {
    const onChange = (e: Event) => {
      const d = (e as CustomEvent).detail as { key: string } | undefined;
      if (!d || d.key === key) setVal(read(key, fallback));
    };
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return [val, (v: T) => write(key, v)];
}

export function useProfile() {
  const [p, setP] = useStore<Profile>(KEY_PROFILE, DEFAULT_PROFILE);
  // Merge with defaults so newly added fields don't break old saves
  const merged: Profile = { ...DEFAULT_PROFILE, ...p, schedule: { ...DEFAULT_SCHEDULE, ...(p.schedule ?? {}) } };
  return [merged, setP] as const;
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useCheckins() {
  const [list, setList] = useStore<string[]>(KEY_CHECKINS, []);
  const set = new Set(list);
  const mark = (d = new Date()) => {
    const k = todayKey(d);
    if (set.has(k)) return;
    setList([...list, k]);
  };
  return { checkins: set, mark };
}
