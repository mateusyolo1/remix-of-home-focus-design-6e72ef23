import { useEffect, useState } from "react";

export type ActiveTask = {
  time: string;
  title: string;
  tag: string;
  goal: string;
  minutes: number;
} | null;

export type Subtask = { id: string; text: string; done: boolean };

export type Task = {
  id: string;
  title: string;
  done: boolean;
  blockTime?: string; // links to Block.time
};

export type Block = {
  time: string;
  title: string;
  tag: string;
  notes: string;
  priority?: "important";
};

const KEY_ACTIVE = "fm.active-task";
const KEY_NOTES = "fm.notes"; // { [time]: htmlString }
const KEY_STEPS = "fm.steps"; // { [time]: Subtask[] }
const KEY_TASKS = "fm.tasks"; // Task[]
const KEY_BLOCKS = "fm.blocks"; // Block[]

const EVT = "fm:store";

const SEED_BLOCKS: Block[] = [
  { time: "08:30", title: "Planejamento do dia", tag: "Ritual", notes: "Revisar prioridades, definir 3 tarefas-chave e checar a agenda da semana." },
  { time: "09:00", title: "Daily Standup", tag: "Reunião", notes: "Time de produto. Trazer status do onboarding e bloqueios atuais." },
  { time: "10:00", title: "Deep Work — Design", tag: "Foco", notes: "Fechar wireframes do fluxo de notas. Sem notificações.", priority: "important" },
  { time: "12:30", title: "Almoço sem tela", tag: "Pausa", notes: "Deixar o celular longe. Caminhada curta depois, se possível." },
  { time: "14:00", title: "Sincronização Mensal", tag: "Reunião", notes: "Métricas do mês, OKRs e roadmap do próximo ciclo.", priority: "important" },
  { time: "16:00", title: "Revisões finais", tag: "Foco", notes: "Code review pendente + responder e-mails marcados como importantes." },
];

const SEED_TASKS: Task[] = [
  { id: "t1", title: "Revisar feedback do cliente", done: false },
  { id: "t2", title: "Enviar relatório semanal", done: false },
];

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

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function useTasks() {
  const [tasks, setTasks] = useStoreValue<Task[]>(KEY_TASKS, SEED_TASKS);
  const add = (title: string, blockTime?: string) => {
    const t: Task = { id: uid(), title, done: false, blockTime };
    setTasks([...tasks, t]);
  };
  const toggle = (id: string) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id: string) => setTasks(tasks.filter((t) => t.id !== id));
  const update = (id: string, patch: Partial<Task>) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  return { tasks, add, toggle, remove, update, setTasks };
}

export function useBlocks() {
  const [blocks, setBlocks] = useStoreValue<Block[]>(KEY_BLOCKS, SEED_BLOCKS);
  const add = (b: Omit<Block, "notes"> & { notes?: string }) => {
    const next = [...blocks, { notes: "", ...b }].sort((a, z) =>
      a.time.localeCompare(z.time)
    );
    setBlocks(next);
  };
  return { blocks, add, setBlocks };
}
