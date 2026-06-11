import { useEffect, useState } from "react";

export type Shift = { start: string; end: string }; // "HH:MM"

export type WorkDay = {
  enabled: boolean;
  shifts: Shift[];
  /** legacy field kept for backward compatibility with older saves */
  hours?: number;
};

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
  /** true when filled in by the browser geolocation API */
  fromGps?: boolean;
} | null;

export type Personal = {
  bio: string;
  hobbies: string;
  likes: string;
  dislikes: string;
  goals: string;
  routine: string;
  personality: string;
  health: string;
  diet: string;
  sleep: string;
  notes: string;
};

export type Work = {
  role: string;
  company: string;
  mode: "presencial" | "remoto" | "híbrido" | "";
  location: string;
  description: string;
};

export type Profile = {
  name: string;
  age: number | null;
  pronouns: string;
  job: string; // legacy short label
  city: City;
  schedule: Schedule;
  personal: Personal;
  work: Work;
};

const KEY_PROFILE = "fm.profile";
const KEY_CHECKINS = "fm.checkins";
const EVT = "fm:profile";

const DEFAULT_SHIFT_MORNING: Shift = { start: "08:00", end: "12:00" };
const DEFAULT_SHIFT_AFTERNOON: Shift = { start: "13:00", end: "17:00" };

const DEFAULT_SCHEDULE: Schedule = {
  seg: { enabled: true, shifts: [DEFAULT_SHIFT_MORNING, DEFAULT_SHIFT_AFTERNOON] },
  ter: { enabled: true, shifts: [DEFAULT_SHIFT_MORNING, DEFAULT_SHIFT_AFTERNOON] },
  qua: { enabled: true, shifts: [DEFAULT_SHIFT_MORNING, DEFAULT_SHIFT_AFTERNOON] },
  qui: { enabled: true, shifts: [DEFAULT_SHIFT_MORNING, DEFAULT_SHIFT_AFTERNOON] },
  sex: { enabled: true, shifts: [DEFAULT_SHIFT_MORNING, DEFAULT_SHIFT_AFTERNOON] },
  sab: { enabled: false, shifts: [] },
  dom: { enabled: false, shifts: [] },
};

const DEFAULT_PERSONAL: Personal = {
  bio: "",
  hobbies: "",
  likes: "",
  dislikes: "",
  goals: "",
  routine: "",
  personality: "",
  health: "",
  diet: "",
  sleep: "",
  notes: "",
};

const DEFAULT_WORK: Work = {
  role: "",
  company: "",
  mode: "",
  location: "",
  description: "",
};

export const DEFAULT_PROFILE: Profile = {
  name: "Tiago Almeida",
  age: null,
  pronouns: "",
  job: "",
  city: { name: "São Paulo", state: "SP", country: "Brasil", latitude: -23.5505, longitude: -46.6333 },
  schedule: DEFAULT_SCHEDULE,
  personal: DEFAULT_PERSONAL,
  work: DEFAULT_WORK,
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
  const [val, setVal] = useState<T>(fallback);
  useEffect(() => {
    setVal(read(key, fallback));
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

function migrateDay(d: Partial<WorkDay> | undefined, fallback: WorkDay): WorkDay {
  if (!d) return fallback;
  const enabled = d.enabled ?? fallback.enabled;
  let shifts = Array.isArray(d.shifts) ? d.shifts : [];
  if (!shifts.length && typeof d.hours === "number" && d.hours > 0 && enabled) {
    const h = Math.min(24, Math.max(0, d.hours));
    const endH = Math.min(23, 9 + Math.floor(h));
    const endM = Math.round((h - Math.floor(h)) * 60);
    shifts = [
      { start: "09:00", end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}` },
    ];
  }
  return { enabled, shifts };
}

function mergeSchedule(s: Partial<Schedule> | undefined): Schedule {
  const out = { ...DEFAULT_SCHEDULE };
  (Object.keys(DEFAULT_SCHEDULE) as (keyof Schedule)[]).forEach((k) => {
    out[k] = migrateDay(s?.[k], DEFAULT_SCHEDULE[k]);
  });
  return out;
}

export function useProfile() {
  const [p, setP] = useStore<Profile>(KEY_PROFILE, DEFAULT_PROFILE);
  const merged: Profile = {
    ...DEFAULT_PROFILE,
    ...p,
    schedule: mergeSchedule(p?.schedule),
    personal: { ...DEFAULT_PERSONAL, ...(p?.personal ?? {}) },
    work: { ...DEFAULT_WORK, ...(p?.work ?? {}) },
    city: p?.city ?? DEFAULT_PROFILE.city,
  };
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

/* ============================================================
 * Profile dossier — rendered as plain text and injected into the
 * agent's system prompt so the IA can reason about the user.
 * ============================================================ */

const DAY_LABEL: Record<keyof Schedule, string> = {
  seg: "Segunda",
  ter: "Terça",
  qua: "Quarta",
  qui: "Quinta",
  sex: "Sexta",
  sab: "Sábado",
  dom: "Domingo",
};

function shiftHours(s: Shift): number {
  const [sh, sm] = s.start.split(":").map(Number);
  const [eh, em] = s.end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

export function dayTotalHours(d: WorkDay): number {
  if (!d.enabled) return 0;
  return d.shifts.reduce((acc, s) => acc + shiftHours(s), 0);
}

export function weekTotalHours(s: Schedule): number {
  return (Object.keys(s) as (keyof Schedule)[]).reduce((acc, k) => acc + dayTotalHours(s[k]), 0);
}

function describeSchedule(s: Schedule): string {
  const lines: string[] = [];
  (Object.keys(s) as (keyof Schedule)[]).forEach((k) => {
    const d = s[k];
    if (!d.enabled || d.shifts.length === 0) {
      lines.push(`- ${DAY_LABEL[k]}: folga`);
    } else {
      const ranges = d.shifts.map((sh) => `${sh.start}–${sh.end}`).join(", ");
      lines.push(`- ${DAY_LABEL[k]}: ${ranges} (${dayTotalHours(d).toFixed(1)}h)`);
    }
  });
  return lines.join("\n");
}

export function buildProfileContext(p: Profile): string {
  const parts: string[] = [];
  parts.push("# Dossiê do usuário");
  parts.push(`Nome: ${p.name || "—"}`);
  if (p.age) parts.push(`Idade: ${p.age}`);
  if (p.pronouns) parts.push(`Pronomes: ${p.pronouns}`);
  if (p.city) {
    parts.push(
      `Localização: ${p.city.name}${p.city.state ? ", " + p.city.state : ""}${p.city.country ? " — " + p.city.country : ""} (lat ${p.city.latitude.toFixed(2)}, lon ${p.city.longitude.toFixed(2)})${p.city.fromGps ? " [GPS]" : ""}`,
    );
  }
  if (p.work.role || p.work.company || p.work.mode || p.work.location || p.work.description || p.job) {
    parts.push("\n## Trabalho");
    if (p.work.role || p.job) parts.push(`Função: ${p.work.role || p.job}`);
    if (p.work.company) parts.push(`Empresa/contexto: ${p.work.company}`);
    if (p.work.mode) parts.push(`Modalidade: ${p.work.mode}`);
    if (p.work.location) parts.push(`Local de trabalho: ${p.work.location}`);
    if (p.work.description) parts.push(`Descrição: ${p.work.description}`);
  }

  parts.push("\n## Escala de trabalho");
  parts.push(describeSchedule(p.schedule));
  parts.push(`Total semanal: ${weekTotalHours(p.schedule).toFixed(1)}h`);

  const pe = p.personal;
  const hasPersonal = Object.values(pe).some((v) => v && v.trim());
  if (hasPersonal) {
    parts.push("\n## Sobre o usuário");
    if (pe.bio) parts.push(`Bio: ${pe.bio}`);
    if (pe.personality) parts.push(`Personalidade: ${pe.personality}`);
    if (pe.hobbies) parts.push(`Hobbies: ${pe.hobbies}`);
    if (pe.likes) parts.push(`Gosta de: ${pe.likes}`);
    if (pe.dislikes) parts.push(`Não gosta de: ${pe.dislikes}`);
    if (pe.goals) parts.push(`Objetivos: ${pe.goals}`);
    if (pe.routine) parts.push(`Rotina: ${pe.routine}`);
    if (pe.sleep) parts.push(`Sono: ${pe.sleep}`);
    if (pe.diet) parts.push(`Alimentação: ${pe.diet}`);
    if (pe.health) parts.push(`Saúde: ${pe.health}`);
    if (pe.notes) parts.push(`Outras notas: ${pe.notes}`);
  }

  parts.push(
    "\nUse este dossiê para personalizar tom, sugestões, horários e prioridades. Respeite a escala (não agende durante folgas) e o fuso da cidade indicada.",
  );
  return parts.join("\n");
}
