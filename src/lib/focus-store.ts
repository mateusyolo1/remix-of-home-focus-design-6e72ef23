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

export type TaskTag =
  | "trabalho"
  | "estudo"
  | "saude"
  | "casa"
  | "pessoal"
  | "outro";

export const TASK_TAGS: TaskTag[] = [
  "trabalho",
  "estudo",
  "saude",
  "casa",
  "pessoal",
  "outro",
];

export const TASK_TAG_LABEL: Record<TaskTag, string> = {
  trabalho: "Trabalho",
  estudo: "Estudo",
  saude: "Saúde",
  casa: "Casa",
  pessoal: "Pessoal",
  outro: "Outro",
};

/** Tags consideradas "produtivas" para gerar estatísticas de desempenho. */
export const PRODUCTIVE_TAGS: TaskTag[] = ["trabalho", "estudo"];

export type Task = {
  id: string;
  title: string;
  done: boolean;
  blockTime?: string; // links to Block.time
  tag?: TaskTag;
  important?: boolean;
  createdAt?: string;
  /** Prazo da tarefa (ms epoch). */
  dueAt?: number;
  /** Lembrete avulso (ms epoch). */
  reminderAt?: number;
  /** Minutos antes do prazo para alertar. */
  notifyBeforeMinutes?: number[];
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
  /** ISO; quando definido, a nota está arquivada e sujeita à retenção. */
  archivedAt?: string;
};

export type ListItem = { id: string; text: string; done: boolean };
export type CheckList = {
  id: string;
  title: string;
  items: ListItem[];
  createdAt: string;
  tag?: TaskTag;
  /** ISO; quando definido, a lista foi concluída/arquivada. */
  completedAt?: string;
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

type StoreSetter<T> = (value: T | ((prev: T) => T)) => void;

function useStoreValue<T>(key: string, fallback: T): [T, StoreSetter<T>] {
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
  const update: StoreSetter<T> = (next) => {
    const prev = read(key, fallback);
    const value =
      typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
    write(key, value);
    setVal(value);
  };
  return [val, update];
}

export function useActiveTask() {
  return useStoreValue<ActiveTask>(KEY_ACTIVE, null);
}

export function useNotes() {
  const [map, setMap] = useStoreValue<Record<string, string>>(KEY_NOTES, {});
  const set = (time: string, html: string) =>
    setMap((prev) => ({ ...prev, [time]: html }));
  return { notes: map, setNote: set };
}

export function useSteps(time: string | null) {
  const [map, setMap] = useStoreValue<Record<string, Subtask[]>>(KEY_STEPS, {});
  const steps = time ? map[time] ?? [] : [];
  const setSteps = (next: Subtask[]) => {
    if (!time) return;
    setMap((prev) => ({ ...prev, [time]: next }));
  };
  return [steps, setSteps] as const;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function useTasks() {
  const [tasks, setTasks] = useStoreValue<Task[]>(KEY_TASKS, SEED_TASKS);
  const add = (title: string, blockTime?: string, tag?: TaskTag): Task => {
    const t: Task = { id: uid(), title, done: false, blockTime, tag, createdAt: new Date().toISOString() };
    setTasks((prev) => [...prev, t]);
    const detail = [blockTime ? `bloco ${blockTime}` : null, tag ? TASK_TAG_LABEL[tag] : null]
      .filter(Boolean)
      .join(" · ");
    logActivity({ kind: "task", title, detail: detail || undefined, tag });
    return t;
  };
  const toggle = (id: string) => {
    const target = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    if (target && !target.done)
      logActivity({ kind: "task_done", title: target.title, tag: target.tag });
  };
  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const update = (id: string, patch: Partial<Task>) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const toggleImportant = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, important: !t.important } : t)));
  /** Cria várias tarefas em uma única atualização — evita race em batch. */
  const addMany = (
    inputs: { title: string; blockTime?: string; tag?: TaskTag }[],
  ): Task[] => {
    const created: Task[] = inputs.map((i) => ({
      id: uid(),
      title: i.title,
      done: false,
      blockTime: i.blockTime,
      tag: i.tag,
      createdAt: new Date().toISOString(),
    }));
    setTasks((prev) => [...prev, ...created]);
    for (const t of created) {
      const detail = [t.blockTime ? `bloco ${t.blockTime}` : null, t.tag ? TASK_TAG_LABEL[t.tag] : null]
        .filter(Boolean)
        .join(" · ");
      logActivity({ kind: "task", title: t.title, detail: detail || undefined, tag: t.tag });
    }
    return created;
  };
  return { tasks, add, addMany, toggle, remove, update, toggleImportant, setTasks };
}

/** Remove tarefas que excederam o tempo de expiração (sem vínculo nem importância). */
export function pruneExpiredTasks(tasks: Task[], expiryHours: number): Task[] {
  const cutoff = Date.now() - expiryHours * 3600 * 1000;
  return tasks.filter((t) => {
    if (t.important || t.blockTime || t.done) return true;
    if (!t.createdAt) return true; // tarefas antigas sem timestamp permanecem
    return new Date(t.createdAt).getTime() >= cutoff;
  });
}


export function useBlocks() {
  const [blocks, setBlocks] = useStoreValue<Block[]>(KEY_BLOCKS, SEED_BLOCKS);
  const add = (b: Omit<Block, "notes"> & { notes?: string }) => {
    setBlocks((prev) =>
      [...prev, { notes: "", ...b }].sort((a, z) => {
        const d = (a.date ?? "").localeCompare(z.date ?? "");
        return d !== 0 ? d : a.time.localeCompare(z.time);
      }),
    );
    logActivity({ kind: "block", title: b.title, detail: `${b.time}${b.tag ? " · " + b.tag : ""}` });
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
    setNotes((prev) => [n, ...prev]);
    logActivity({ kind: "note", title: n.title, detail: n.body?.slice(0, 80) });
    return n;
  };

  const remove = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id));
  const update = (id: string, patch: Partial<QuickNote>) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  const archive = (id: string) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, archivedAt: new Date().toISOString() } : n)));
  const unarchive = (id: string) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, archivedAt: undefined } : n)));
  return { notes, add, remove, update, archive, unarchive, setNotes };
}

/** Remove notas arquivadas há mais que a retenção configurada. */
export function pruneArchivedNotes(notes: QuickNote[], retentionDays: number): QuickNote[] {
  const cutoff = Date.now() - retentionDays * 86400 * 1000;
  return notes.filter((n) => !n.archivedAt || new Date(n.archivedAt).getTime() >= cutoff);
}

export function useLists() {
  const [lists, setLists] = useStoreValue<CheckList[]>(KEY_LISTS, []);
  const add = (input: { title: string; items: string[]; tag?: TaskTag }) => {
    const l: CheckList = {
      id: uid(),
      title: input.title,
      items: input.items.map((t) => ({ id: uid(), text: t, done: false })),
      createdAt: new Date().toISOString(),
      tag: input.tag,
    };
    setLists((prev) => [l, ...prev]);
    const detail = [`${l.items.length} itens`, l.tag ? TASK_TAG_LABEL[l.tag] : null]
      .filter(Boolean)
      .join(" · ");
    logActivity({ kind: "list", title: l.title, detail, tag: l.tag });
    return l;
  };
  const toggleItem = (listId: string, itemId: string) => {
    const list = lists.find((l) => l.id === listId);
    const item = list?.items.find((i) => i.id === itemId);
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) }
          : l,
      ),
    );
    if (item && !item.done)
      logActivity({ kind: "list_item_done", title: item.text, detail: list?.title, tag: list?.tag });
  };

  const addItem = (listId: string, text: string) =>
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, items: [...l.items, { id: uid(), text, done: false }] }
          : l,
      ),
    );
  const removeItem = (listId: string, itemId: string) =>
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l,
      ),
    );
  const remove = (id: string) => setLists((prev) => prev.filter((l) => l.id !== id));
  const complete = (id: string) =>
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, completedAt: new Date().toISOString() } : l)));
  return { lists, add, toggleItem, addItem, removeItem, remove, complete, setLists };
}
