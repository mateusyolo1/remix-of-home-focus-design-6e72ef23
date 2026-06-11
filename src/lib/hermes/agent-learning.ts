/**
 * Agent Learning — facade que reúne aprendizado por correção/exclusão/feedback
 * e dispara análises de padrão (sugestão de tag, recorrência).
 */
import { getCreations, getMemories } from "./memory-store";
import {
  recordAcceptance,
  recordCorrection,
  recordCreation,
  recordFeedback,
  recordRejection,
  reconcileCreations,
  resolveCreation,
} from "./learning-core";
import { analyzeForTagSuggestions } from "./agent-tags";
import { logDecision } from "./agent-decisions";
import type { MemoryType } from "./learning-types";

export {
  recordCreation,
  recordCorrection,
  recordRejection,
  recordAcceptance,
  recordFeedback,
  reconcileCreations,
  resolveCreation,
};

/** Dispara análise completa: reconciliação + detecção de padrões + sugestões de tag. */
export function runLearningCycle(current: {
  tasks: { id: string; title: string; tag?: string }[];
  lists: { id: string; title: string; tag?: string }[];
  notes: { id: string; title: string }[];
}) {
  reconcileCreations({
    tasks: current.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      tag: t.tag as never,
    })),
    lists: current.lists.map((l) => ({
      id: l.id,
      title: l.title,
      tag: l.tag as never,
    })),
    notes: current.notes,
  });
  const suggestions = analyzeForTagSuggestions();
  for (const s of suggestions) {
    logDecision({
      kind: "suggest_tag",
      summary: `Sugerida nova tag "${s.label}" (${s.occurrences}×).`,
      keywords: s.keywords,
    });
  }
}

/** Estatísticas leves para o painel. */
export function getLearningStats() {
  const mems = getMemories();
  const counts: Record<MemoryType, number> = {
    preference: 0,
    correction: 0,
    pattern: 0,
    rejection: 0,
    category_rule: 0,
    creation: 0,
    acceptance: 0,
    feedback: 0,
    tag_suggestion: 0,
    decision: 0,
  };
  for (const m of mems) counts[m.type] = (counts[m.type] ?? 0) + 1;
  return {
    totalMemories: mems.length,
    counts,
    totalCreations: getCreations().length,
  };
}
