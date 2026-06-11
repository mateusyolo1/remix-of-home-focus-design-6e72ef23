import type { TaskTag } from "@/lib/focus-store";

export type MemoryType =
  | "preference"
  | "correction"
  | "pattern"
  | "rejection"
  | "category_rule"
  | "creation"
  | "acceptance"
  | "feedback"
  | "tag_suggestion"
  | "decision";

export type MemorySource =
  | "task"
  | "list"
  | "note"
  | "chat"
  | "user_edit"
  | "user_delete"
  | "user_feedback"
  | "auto";

export type HermesMemory = {
  id: string;
  type: MemoryType;
  source: MemorySource;
  confidence: number; // 0..1
  text: string;
  rule?: string;
  /** Tag relacionada (quando aplicável). */
  tag?: TaskTag;
  /** Palavras-chave para busca por relevância. */
  keywords?: string[];
  /** Desativado pelo usuário. */
  disabled?: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Snapshot de um item criado pelo Hermes (para detectar edição/exclusão depois). */
export type HermesCreation = {
  id: string;
  /** id local da entidade no focus-store. */
  entityId: string;
  entityKind: "task" | "list" | "note";
  title: string;
  tag?: TaskTag;
  items?: string[];
  /** Origem do texto do usuário que produziu esta criação. */
  sourceText?: string;
  createdAt: string;
  /** Já foi avaliada (edit/delete/aceitação registrada)? */
  resolved?: boolean;
};

/** Bloqueios de aprendizado perigoso. */
export const SENSITIVE_PATTERNS: RegExp[] = [
  /api[\s_-]?key/i,
  /token/i,
  /senha|password/i,
  /cart[ãa]o\s+de\s+cr[ée]dito|credit\s+card/i,
  /cvv|cvc/i,
  /banc[áa]rio/i,
  /sk-[a-z0-9_-]{10,}/i,
];

export function isSensitive(text: string): boolean {
  return SENSITIVE_PATTERNS.some((re) => re.test(text));
}
