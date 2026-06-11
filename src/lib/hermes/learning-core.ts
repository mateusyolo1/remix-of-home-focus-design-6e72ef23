import type { TaskTag } from "@/lib/focus-store";
import { getCreations, getMemories, setCreations, setMemories, uid } from "./memory-store";
import type { HermesCreation, HermesMemory, MemorySource, MemoryType } from "./learning-types";
import { isSensitive } from "./learning-types";

function now() {
  return new Date().toISOString();
}

function pushMemory(input: Omit<HermesMemory, "id" | "createdAt" | "updatedAt">) {
  if (isSensitive(input.text) || (input.rule && isSensitive(input.rule))) return;
  const mem: HermesMemory = {
    id: uid(),
    createdAt: now(),
    updatedAt: now(),
    ...input,
  };
  const current = getMemories();
  // Mescla regras duplicadas elevando a confiança.
  const existing = current.find(
    (m) => m.type === mem.type && m.rule && mem.rule && m.rule === mem.rule,
  );
  if (existing) {
    const merged = current.map((m) =>
      m.id === existing.id
        ? { ...m, confidence: Math.min(1, m.confidence + 0.15), updatedAt: now() }
        : m,
    );
    setMemories(merged);
    return;
  }
  setMemories([mem, ...current].slice(0, 200));
}

function extractKeywords(text: string): string[] {
  const norm = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
  return Array.from(
    new Set(norm.split(/\s+/).filter((w) => w.length >= 4)),
  ).slice(0, 8);
}

/* ============== CREATION TRACKING ============== */

export function recordCreation(input: {
  entityId: string;
  entityKind: "task" | "list" | "note";
  title: string;
  tag?: TaskTag;
  items?: string[];
  sourceText?: string;
}) {
  if (isSensitive(input.title)) return;
  const c: HermesCreation = {
    id: uid(),
    createdAt: now(),
    ...input,
  };
  const all = getCreations();
  setCreations([c, ...all].slice(0, 300));
}

export function resolveCreation(creationId: string) {
  setCreations(
    getCreations().map((c) => (c.id === creationId ? { ...c, resolved: true } : c)),
  );
}

/* ============== LEARNING SIGNALS ============== */

export function recordRejection(input: {
  creation?: HermesCreation;
  title: string;
  entityKind: "task" | "list" | "note";
  reason?: string;
}) {
  const { title, entityKind, reason } = input;
  const text = `Usuário apagou ${entityKind} criado pelo Hermes: "${title}"`;
  let rule: string | undefined;
  if (entityKind === "list") {
    rule = `Evitar criar listas como "${title}" automaticamente; se for ideia conceitual, usar create_note.`;
  } else if (entityKind === "task") {
    rule = `Evitar criar tarefa "${title}" automaticamente sem sinal claro de ação prática.`;
  } else {
    rule = `Evitar criar nota "${title}" sem conteúdo concreto.`;
  }
  pushMemory({
    type: "rejection",
    source: "user_delete",
    confidence: 0.6,
    text: reason ? `${text} — ${reason}` : text,
    rule,
    keywords: extractKeywords(title),
  });
}

export function recordCorrection(input: {
  before: { title: string; tag?: TaskTag; kind: "task" | "list" | "note" };
  after: { title?: string; tag?: TaskTag; kind?: "task" | "list" | "note" };
}) {
  const { before, after } = input;
  // Mudança de tag
  if (after.tag && after.tag !== before.tag) {
    pushMemory({
      type: "category_rule",
      source: "user_edit",
      confidence: 0.55,
      text: `Categoria corrigida de "${before.tag ?? "?"}" para "${after.tag}" em "${before.title}".`,
      rule: `Quando o texto mencionar "${before.title}", preferir categoria "${after.tag}".`,
      tag: after.tag,
      keywords: extractKeywords(before.title),
    });
  }
  // Mudança de título (renomeação)
  if (after.title && after.title !== before.title) {
    pushMemory({
      type: "correction",
      source: "user_edit",
      confidence: 0.4,
      text: `Título corrigido: "${before.title}" → "${after.title}".`,
      rule: `Evitar gerar título "${before.title}"; o usuário prefere algo como "${after.title}".`,
      keywords: extractKeywords(`${before.title} ${after.title}`),
    });
  }
}

export function recordAcceptance(input: {
  title: string;
  kind: "task" | "list" | "note";
  tag?: TaskTag;
}) {
  pushMemory({
    type: "acceptance",
    source: "auto",
    confidence: 0.25,
    text: `Item mantido por 24h+: "${input.title}" (${input.kind}).`,
    rule: undefined,
    tag: input.tag,
    keywords: extractKeywords(input.title),
  });
}

export function recordFeedback(input: {
  kind: MemoryType;
  text: string;
  rule?: string;
  source?: MemorySource;
  tag?: TaskTag;
  confidence?: number;
}) {
  pushMemory({
    type: input.kind,
    source: input.source ?? "user_feedback",
    confidence: input.confidence ?? 0.7,
    text: input.text,
    rule: input.rule,
    tag: input.tag,
    keywords: extractKeywords(input.text),
  });
}

/** Detecta deleção/edição comparando snapshots vs estado atual e cria memórias. */
export function reconcileCreations(current: {
  tasks: { id: string; title: string; tag?: TaskTag }[];
  lists: { id: string; title: string; tag?: TaskTag }[];
  notes: { id: string; title: string }[];
}) {
  const creations = getCreations();
  const now = Date.now();
  let changed = false;
  const updated = creations.map((c) => {
    if (c.resolved) return c;
    const ageHours = (now - new Date(c.createdAt).getTime()) / 3_600_000;
    const pool =
      c.entityKind === "task"
        ? current.tasks
        : c.entityKind === "list"
          ? current.lists
          : current.notes;
    const live = pool.find((p) => p.id === c.entityId);
    if (!live) {
      // Apagado.
      recordRejection({ creation: c, title: c.title, entityKind: c.entityKind });
      changed = true;
      return { ...c, resolved: true };
    }
    // Mudou título ou tag?
    const liveTag = "tag" in live ? (live as { tag?: TaskTag }).tag : undefined;
    if (live.title !== c.title || liveTag !== c.tag) {
      recordCorrection({
        before: { title: c.title, tag: c.tag, kind: c.entityKind },
        after: { title: live.title, tag: liveTag, kind: c.entityKind },
      });
      changed = true;
      return { ...c, resolved: true };
    }
    // Aceitação fraca após 24h sem mudanças.
    if (ageHours >= 24) {
      recordAcceptance({ title: c.title, kind: c.entityKind, tag: c.tag });
      changed = true;
      return { ...c, resolved: true };
    }
    return c;
  });
  if (changed) setCreations(updated);
}
