/**
 * Hermes Learning Loop — tipos base.
 *
 * Etapa 1 da implementação: apenas Observe / Log / Memory.
 * Tipos de Plan / Action / TagSuggestion ficam declarados aqui também para
 * que etapas futuras possam encaixar sem refator.
 */

export type HermesEventType =
  | "task_created"
  | "task_updated"
  | "task_completed"
  | "task_deleted"
  | "list_created"
  | "list_updated"
  | "list_item_toggled"
  | "note_created"
  | "note_updated"
  | "note_deleted"
  | "tag_used"
  | "tag_changed"
  | "timer_started"
  | "timer_completed"
  | "reminder_ignored"
  | "hermes_feedback"
  | "suggestion_accepted"
  | "suggestion_rejected";

export type HermesEntityType = "task" | "note" | "list" | "timer" | "tag" | "chat";

export type HermesEvent = {
  id: string;
  type: HermesEventType;
  entityId?: string;
  entityType?: HermesEntityType;
  /** Snapshot do estado antes da mudança (omitido em create). */
  before?: unknown;
  /** Snapshot do estado depois da mudança (omitido em delete). */
  after?: unknown;
  /** Texto livre opcional — ex: motivo de feedback. */
  note?: string;
  createdAt: number;
};

export type HermesMemoryType =
  | "preference"
  | "correction"
  | "pattern"
  | "rejection"
  | "acceptance"
  | "tag_suggestion"
  | "decision"
  | "error";

export type HermesMemorySource =
  | "event"
  | "chat"
  | "edit"
  | "delete"
  | "feedback"
  | "timer"
  | "tag"
  | "manual";

export type HermesMemory = {
  id: string;
  type: HermesMemoryType;
  /** Descrição em linguagem natural exibível ao usuário. */
  text: string;
  /** Regra estruturada opcional ("if X then Y"). */
  rule?: string;
  /** 0..1 — quanto o sistema confia nesse aprendizado. */
  confidence: number;
  source: HermesMemorySource;
  entityId?: string;
  /** Se false, a memória existe mas não influencia decisões. */
  active: boolean;
  meta?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
};

export type HermesActionStatus = "success" | "failed" | "skipped" | "pending_confirmation";

export type HermesActionLog = {
  id: string;
  planId?: string;
  actionType: string;
  status: HermesActionStatus;
  entityId?: string;
  error?: string;
  /** Resumo legível pra mostrar no painel. */
  summary?: string;
  createdAt: number;
};

/** ----- Tipos de Plan/Action — usados em etapas futuras ----- */

export type HermesAction =
  | { type: "create_task"; title: string; description?: string; tagId?: string; dueAt?: number }
  | { type: "create_note"; title: string; body: string; tagId?: string }
  | { type: "create_list"; title: string; items: string[]; tagId?: string }
  | { type: "create_timer"; title: string; durationMs: number }
  | { type: "suggest_tag"; label: string; reason: string; confidence: number }
  | { type: "schedule_reminder"; title: string; targetId?: string; reminderAt: number };

export type HermesConfirmation = {
  id: string;
  question: string;
  /** Ação que será aplicada se o usuário aceitar. */
  action: HermesAction;
};

export type HermesPlan = {
  id: string;
  userInput: string;
  summary: string;
  actions: HermesAction[];
  confirmations: HermesConfirmation[];
  /** 0..1 — confiança do plano como um todo. */
  confidence: number;
  createdAt: number;
};

export type TagSuggestion = {
  id: string;
  label: string;
  reason: string;
  confidence: number;
  status: "pending" | "accepted" | "rejected" | "ignored";
  createdAt: number;
};
