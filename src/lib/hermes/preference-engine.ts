import { getMemories } from "./memory-store";
import { analyzeHermesBehavior, sortByRelevance } from "./behavior-analyzer";
import type { HermesMemory } from "./learning-types";

export function getRelevantMemories(input: string, limit = 6): HermesMemory[] {
  const all = getMemories().filter((m) => !m.disabled && m.rule);
  return sortByRelevance(input, all).slice(0, limit);
}

/**
 * Constrói um contexto curto em PT-BR para injetar no prompt do home-agent.
 * Ordem de prioridade:
 *   1) correções explícitas com alta confiança
 *   2) regras por categoria aprendidas
 *   3) padrões fracos / preferências
 */
export function getHermesLearningContext(input?: string): string {
  const all = getMemories().filter((m) => !m.disabled && m.rule);
  if (all.length === 0) return "";

  const relevant = input ? sortByRelevance(input, all) : all;
  const strong = relevant.filter((m) => m.confidence >= 0.55).slice(0, 6);
  const weak = relevant
    .filter((m) => m.confidence < 0.55 && m.confidence >= 0.25)
    .slice(0, 4);

  const summary = analyzeHermesBehavior();

  const lines: string[] = [];
  lines.push("=== PREFERÊNCIAS APRENDIDAS DO USUÁRIO (aplique antes de gerar) ===");

  if (strong.length) {
    lines.push("Regras fortes:");
    for (const m of strong) lines.push(`- ${m.rule}`);
  }
  if (weak.length) {
    lines.push("Padrões fracos (use com cautela):");
    for (const m of weak) lines.push(`- ${m.rule}`);
  }
  if (summary.rejectedTitles.length) {
    lines.push(
      `Títulos que o usuário já apagou antes — NÃO recriar: ${summary.rejectedTitles
        .slice(0, 8)
        .map((t) => `"${t}"`)
        .join(", ")}.`,
    );
  }
  if (Object.keys(summary.preferredTagByKeyword).length) {
    const entries = Object.entries(summary.preferredTagByKeyword).slice(0, 8);
    lines.push(
      `Quando o texto contiver: ${entries
        .map(([k, t]) => `"${k}" → tag=${t}`)
        .join("; ")}.`,
    );
  }

  if (lines.length === 1) return "";
  return lines.join("\n");
}
