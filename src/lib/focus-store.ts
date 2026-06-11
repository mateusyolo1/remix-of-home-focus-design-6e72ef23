import { useEffect, useState } from "react";
import { logActivity } from "@/lib/activity-log";


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
  /** yyyy-mm-dd. Quando ausente, o bloco é considerado de hoje. */
  date?: string;
};

export type QuickNote = {
  id: string;
  title: string;
  body: string;
  /** dias até arquivamento sugerido */
  ttlDays: number;
  createdAt: string;
};

export type ListItem = { id: string; text: string; done: boolean };
export type CheckList = {
  id: string;
  title: string;
  items: ListItem[];
  createdAt: string;
};

const KEY_ACTIVE = "fm.active-task";
const KEY_NOTES = "fm.notes"; // { [time]: htmlString }
const KEY_STEPS = "fm.steps"; // { [time]: Subtask[] }
const KEY_TASKS = "fm.tasks"; // Task[]
const KEY_BLOCKS = "fm.blocks"; // Block[]
const KEY_QNOTES = "fm.quick-notes"; // QuickNote[]
const KEY_LISTS = "fm.lists"; // CheckList[]

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
  const [val, setVal] = useState<T>(fallback);
  useEffect(() => {
    setVal(read(key, fallback));
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
    logActivity({ kind: "task", title, detail: blockTime ? `bloco ${blockTime}` : undefined });
  };
  const toggle = (id: string) => {
    const target = tasks.find((t) => t.id === id);
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    if (target && !target.done) logActivity({ kind: "task_done", title: target.title });
  };
  const remove = (id: string) => setTasks(tasks.filter((t) => t.id !== id));
  const update = (id: string, patch: Partial<Task>) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  return { tasks, add, toggle, remove, update, setTasks };
}

export function useBlocks() {
  const [blocks, setBlocks] = useStoreValue<Block[]>(KEY_BLOCKS, SEED_BLOCKS);
  const add = (b: Omit<Block, "notes"> & { notes?: string }) => {
    const next = [...blocks, { notes: "", ...b }].sort((a, z) => {
      const d = (a.date ?? "").localeCompare(z.date ?? "");
      return d !== 0 ? d : a.time.localeCompare(z.time);
    });
    setBlocks(next);
    logActivity({ kind: "block", title: b.title, detail: `${b.time}${b.tag ? " · " + b.tag : ""}` });
  };


export function useBlocks() {
  const [blocks, setBlocks] = useStoreValue<Block[]>(KEY_BLOCKS, SEED_BLOCKS);
  const add = (b: Omit<Block, "notes"> & { notes?: string }) => {
    const next = [...blocks, { notes: "", ...b }].sort((a, z) => {
      const d = (a.date ?? "").localeCompare(z.date ?? "");
      return d !== 0 ? d : a.time.localeCompare(z.time);
    });
    setBlocks(next);
  };
  return { blocks, add, setBlocks };
}

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function blockDateKey(b: Block): string {
  return b.date ?? dateKey(new Date());
}

export function useQuickNotes() {
  const [notes, setNotes] = useStoreValue<QuickNote[]>(KEY_QNOTES, []);
  const add = (input: { title: string; body?: string; ttlDays?: number }) => {
    const n: QuickNote = {
      id: uid(),
      title: input.title,
      body: input.body ?? "",
      ttlDays: input.ttlDays ?? 7,
      createdAt: new Date().toISOString(),
    };
    setNotes([n, ...notes]);
    return n;
  };
  const remove = (id: string) => setNotes(notes.filter((n) => n.id !== id));
  return { notes, add, remove, setNotes };
}

export function useLists() {
  const [lists, setLists] = useStoreValue<CheckList[]>(KEY_LISTS, []);
  const add = (input: { title: string; items: string[] }) => {
    const l: CheckList = {
      id: uid(),
      title: input.title,
      items: input.items.map((t) => ({ id: uid(), text: t, done: false })),
      createdAt: new Date().toISOString(),
    };
    setLists([l, ...lists]);
    return l;
  };
  const toggleItem = (listId: string, itemId: string) =>
    setLists(
      lists.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) }
          : l
      )
    );
  const addItem = (listId: string, text: string) =>
    setLists(
      lists.map((l) =>
        l.id === listId
          ? { ...l, items: [...l.items, { id: uid(), text, done: false }] }
          : l
      )
    );
  const removeItem = (listId: string, itemId: string) =>
    setLists(
      lists.map((l) =>
        l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l
      )
    );
  const remove = (id: string) => setLists(lists.filter((l) => l.id !== id));
  return { lists, add, toggleItem, addItem, removeItem, remove, setLists };
}
