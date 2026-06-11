/**
 * Agent Decisions — log curto das decisões/ações recentes do Hermes,
 * para mostrar no painel e alimentar análise de padrão.
 */
import { listByType, pushAgentMemory, removeAgentMemory } from "./agent-memory";
import type { HermesMemory } from "./learning-types";

export type AgentDecisionKind =
  | "create_task"
  | "create_list"
  | "create_note"
  | "suggest_tag"
  | "feedback"
  | "auto_adjust";

export type AgentDecision = {
  id: string;
  kind: AgentDecisionKind;
  summary: string;
  accepted?: boolean;
  createdAt: string;
};

export function logDecision(input: {
  kind: AgentDecisionKind;
  summary: string;
  accepted?: boolean;
  keywords?: string[];
}) {
  pushAgentMemory({
    type: "decision",
    source: "auto",
    confidence: 0.3,
    text: input.summary,
    keywords: input.keywords,
    meta: { kind: input.kind, accepted: input.accepted ?? null },
  });
}

export function listDecisions(limit = 20): AgentDecision[] {
  const items = listByType("decision") as (HermesMemory & {
    meta?: Record<string, unknown>;
  })[];
  return items
    .slice(0, limit)
    .map((m) => {
      const meta = (m.meta ?? {}) as { kind?: AgentDecisionKind; accepted?: boolean | null };
      return {
        id: m.id,
        kind: meta.kind ?? "auto_adjust",
        summary: m.text,
        accepted: meta.accepted ?? undefined,
        createdAt: m.createdAt,
      } satisfies AgentDecision;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function clearDecision(id: string) {
  removeAgentMemory(id);
}
