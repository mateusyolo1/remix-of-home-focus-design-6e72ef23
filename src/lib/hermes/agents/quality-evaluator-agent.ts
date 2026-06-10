/* ============================================
   Hermes — Quality Evaluator Agent
   ============================================
   Validates the output of other agents before
   presenting to the user. Checks for empty
   checklists, generic content, missing info.
   ============================================ */

import type {
  ChecklistItem,
  OrganizedSpeechResult,
  QualityReport,
} from "../hermes-types";
import { hermesEvents } from "../hermes-events";

/**
 * Evaluate the quality of organized speech and checklist.
 * Returns a report with score, problems, and suggestions.
 */
export function evaluateQuality(
  organized: OrganizedSpeechResult,
  checklist: ChecklistItem[],
): QualityReport {
  const problems: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // 1. Check for empty checklist
  if (checklist.length === 0) {
    problems.push("Checklist vazio — nenhuma tarefa gerada.");
    score -= 30;
  }

  // 2. Check for generic checklist (when there's context)
  const genericPatterns = [
    "revisar conteúdo",
    "identificar próximos passos",
    "definir próximas ações",
    "analisar briefing",
  ];
  if (hasContext(organized.cleanedText)) {
    const genericCount = checklist.filter((item) =>
      genericPatterns.some((p) => item.text.toLowerCase().includes(p)),
    ).length;
    if (genericCount === checklist.length) {
      problems.push("Checklist genérico — o texto continha contexto útil não aproveitado.");
      suggestions.push("Extraia tarefas específicas das palavras-chave do texto original.");
      score -= 20;
    }
  }

  // 3. Check for empty title
  if (!organized.title || organized.title.trim().length === 0) {
    problems.push("Título vazio.");
    score -= 10;
  }

  // 4. Check category
  if (organized.category === "outro" && organized.cleanedText.length > 20) {
    problems.push("Categoria genérica — o texto poderia ser classificado melhor.");
    suggestions.push("Verificar se o texto tem contexto de design, cliente ou tarefa.");
    score -= 10;
  }

  // 5. Check for missing deadlines
  if (organized.priority === "urgent" && organized.deadlines.length === 0) {
    problems.push("Prioridade urgente sem prazo definido.");
    suggestions.push("Perguntar ao usuário qual o prazo da tarefa urgente.");
    score -= 10;
  }

  // 6. Check for misinterpreted speech (short text with no context)
  if (organized.cleanedText.split(" ").length < 5 && organized.transcriptionQuality !== "good") {
    problems.push("Texto muito curto — pode ser uma transcrição mal interpretada.");
    score -= 10;
  }

  // 7. Check confidence
  if (organized.confidence < 0.5) {
    problems.push("Confiança baixa na organização.");
    suggestions.push("Solicitar confirmação ou revisão manual do usuário.");
    score -= 10;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  const report: QualityReport = {
    score,
    needsReview: problems.length > 0 || score < 70,
    problems,
    suggestions,
  };

  hermesEvents.emit("QUALITY_CHECKED", { report });

  return report;
}

function hasContext(text: string): boolean {
  const t = text.toLowerCase();
  const contextWords = [
    "cliente", "arte", "logo", "fundo", "premium", "instagram",
    "story", "feed", "hamburgueria", "produto", "previa", "aprovacao",
    "hoje", "amanha", "amanhã", "briefing", "paleta", "projeto",
    "entrega", "prazo", "cor", "tipografia", "mockup", "layout",
  ];
  return contextWords.some((w) => t.includes(w));
}
