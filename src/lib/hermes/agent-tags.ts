/**
 * Agent Tags — gerenciamento de tags personalizadas + motor de sugestões.
 *
 * Regras:
 *  - O Hermes JAMAIS cria uma tag automaticamente. Apenas sugere.
 *  - Sugestões aparecem só quando há padrão claro (recorrência + sem tag existente que represente).
 *  - O usuário pode aceitar / recusar / ignorar cada sugestão.
 */
import { useEffect, useState } from "react";
import { TASK_TAG_LABEL, TASK_TAGS, type TaskTag } from "@/lib/focus-store";
import { getCreations } from "./memory-store";
import { listByType, pushAgentMemory, removeAgentMemory, updateAgentMemory } from "./agent-memory";
import type { HermesMemory } from "./learning-types";

const KEY_CUSTOM_TAGS = "fm.hermes.custom-tags";
const EVT = "fm.hermes.tags";

export type CustomTag = {
  id: string;
  label: string;
  /** slug normalizado para comparação. */
  slug: string;
  /** palavras-chave que dispararam a sugestão. */
  keywords: string[];
  createdAt: string;
};

export type TagSuggestionStatus = "pending" | "accepted" | "rejected" | "ignored";

export type TagSuggestion = {
  memoryId: string;
  label: string;
  slug: string;
  keywords: string[];
  occurrences: number;
  status: TagSuggestionStatus;
  reason: string;
  createdAt: string;
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

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(EVT));
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ============ CUSTOM TAGS ============ */

export function getCustomTags(): CustomTag[] {
  return read<CustomTag[]>(KEY_CUSTOM_TAGS, []);
}

export function addCustomTag(input: { label: string; keywords?: string[] }): CustomTag {
  const slug = slugify(input.label);
  const existing = getCustomTags().find((t) => t.slug === slug);
  if (existing) return existing;
  const tag: CustomTag = {
    id: Math.random().toString(36).slice(2, 9),
    label: input.label.trim(),
    slug,
    keywords: input.keywords ?? [],
    createdAt: new Date().toISOString(),
  };
  write(KEY_CUSTOM_TAGS, [tag, ...getCustomTags()]);
  return tag;
}

export function removeCustomTag(id: string) {
  write(KEY_CUSTOM_TAGS, getCustomTags().filter((t) => t.id !== id));
}

export function useCustomTags() {
  const [items, setItems] = useState<CustomTag[]>(() => getCustomTags());
  useEffect(() => {
    const sync = () => setItems(getCustomTags());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { tags: items, add: addCustomTag, remove: removeCustomTag };
}

/* ============ SUGGESTION ENGINE ============ */

const STOPWORDS = new Set([
  "para","como","que","com","sem","das","dos","uma","uns","umas","mais","minha","meu","meus","minhas",
  "essa","esse","essas","esses","isso","aquilo","tudo","nada","muito","pouco","sobre","entre","quando",
  "fazer","preciso","tenho","quero","ideia","talvez","hoje","amanha","amanhã","semana","mes","mês",
  "ontem","ainda","tambem","também","pelo","pela","pelos","pelas","sera","será","então","entao",
  "lista","tarefa","nota","tarefas","listas","notas","item","itens","app","apk","trabalho","estudo",
  "saude","saúde","casa","pessoal","outro",
]);

function extractTopicWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

/**
 * Analisa as criações + memórias recentes e propõe novas tags quando:
 *  - Uma palavra-tema aparece em ≥ 3 criações distintas.
 *  - Nenhuma tag existente cobre bem o tema (heurística simples por nome/keyword).
 *  - Ainda não há sugestão pendente/rejeitada para o mesmo slug.
 */
export function analyzeForTagSuggestions(): TagSuggestion[] {
  const creations = getCreations();
  if (creations.length < 3) return [];
  const wordCount = new Map<string, number>();
  const wordSamples = new Map<string, Set<string>>();
  for (const c of creations) {
    const words = new Set(extractTopicWords(`${c.title} ${(c.items ?? []).join(" ")}`));
    for (const w of words) {
      wordCount.set(w, (wordCount.get(w) ?? 0) + 1);
      const set = wordSamples.get(w) ?? new Set<string>();
      set.add(c.title);
      wordSamples.set(w, set);
    }
  }

  const existingSlugs = new Set([
    ...TASK_TAGS.map((t) => t),
    ...TASK_TAGS.map((t) => slugify(TASK_TAG_LABEL[t])),
    ...getCustomTags().map((t) => t.slug),
  ]);

  const existingSuggestions = listByType("tag_suggestion") as (HermesMemory & {
    meta?: Record<string, unknown>;
  })[];
  const knownSlugs = new Set(
    existingSuggestions.map((m) => String((m.meta as { slug?: string })?.slug ?? "")),
  );

  const out: TagSuggestion[] = [];
  for (const [word, count] of wordCount) {
    if (count < 3) continue;
    const slug = slugify(word);
    if (existingSlugs.has(slug) || knownSlugs.has(slug)) continue;
    const label = `Projeto ${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    const samples = Array.from(wordSamples.get(word) ?? []).slice(0, 3);
    const memory = pushAgentMemory({
      type: "tag_suggestion",
      source: "auto",
      confidence: Math.min(0.85, 0.4 + count * 0.1),
      text: `Tema "${word}" apareceu em ${count} criações: ${samples
        .map((s) => `"${s}"`)
        .join(", ")}.`,
      rule: `Considerar a tag "${label}" para conteúdos sobre ${word}.`,
      keywords: [word],
      meta: { slug, label, occurrences: count, status: "pending" satisfies TagSuggestionStatus },
    });
    if (memory) {
      out.push({
        memoryId: memory.id,
        label,
        slug,
        keywords: [word],
        occurrences: count,
        status: "pending",
        reason: `"${word}" apareceu ${count} vezes.`,
        createdAt: memory.createdAt,
      });
    }
  }
  return out;
}

export function getTagSuggestions(status?: TagSuggestionStatus): TagSuggestion[] {
  const items = listByType("tag_suggestion") as (HermesMemory & {
    meta?: Record<string, unknown>;
  })[];
  return items
    .map((m) => {
      const meta = (m.meta ?? {}) as {
        slug?: string;
        label?: string;
        occurrences?: number;
        status?: TagSuggestionStatus;
      };
      return {
        memoryId: m.id,
        label: meta.label ?? "Nova tag",
        slug: meta.slug ?? slugify(meta.label ?? ""),
        keywords: m.keywords ?? [],
        occurrences: meta.occurrences ?? 0,
        status: meta.status ?? "pending",
        reason: m.text,
        createdAt: m.createdAt,
      } satisfies TagSuggestion;
    })
    .filter((s) => (status ? s.status === status : true))
    .sort((a, b) => b.occurrences - a.occurrences);
}

export function acceptTagSuggestion(memoryId: string) {
  const s = getTagSuggestions().find((x) => x.memoryId === memoryId);
  if (!s) return;
  addCustomTag({ label: s.label, keywords: s.keywords });
  updateAgentMemory(memoryId, { meta: { status: "accepted" as TagSuggestionStatus } });
}

export function rejectTagSuggestion(memoryId: string) {
  updateAgentMemory(memoryId, {
    meta: { status: "rejected" as TagSuggestionStatus },
    confidence: 0.95,
  });
  // grava uma rejeição explícita para o sistema parar de sugerir parecido.
  const s = getTagSuggestions().find((x) => x.memoryId === memoryId);
  if (s) {
    pushAgentMemory({
      type: "rejection",
      source: "user_feedback",
      confidence: 0.85,
      text: `Usuário recusou a tag sugerida "${s.label}".`,
      rule: `Não sugerir novamente a tag "${s.label}" para o tema ${s.keywords.join(", ")}.`,
      keywords: s.keywords,
    });
  }
}

export function ignoreTagSuggestion(memoryId: string) {
  updateAgentMemory(memoryId, { meta: { status: "ignored" as TagSuggestionStatus } });
}

export function clearTagSuggestion(memoryId: string) {
  removeAgentMemory(memoryId);
}
