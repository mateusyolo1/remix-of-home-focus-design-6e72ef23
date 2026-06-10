/* ============================================
   Hermes — Speech Organizer Agent
   ============================================
   Takes raw text and organizes it into structured
   content: title, summary, category, priority,
   context, visual directions, etc.
   ============================================ */

import type {
  OrganizedSpeechResult,
  SpeechCategory,
  Priority,
  ChecklistItem,
} from "../hermes-types";
import { hermesEvents } from "../hermes-events";
import { setDraftOrganized } from "../hermes-store";

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function detectCategory(text: string): {
  category: SpeechCategory;
  intent: string;
  actionType: string;
} {
  const t = text.toLowerCase();

  if (
    t.includes("altera") ||
    t.includes("corrigir") ||
    t.includes("mudar") ||
    t.includes("ajustar")
  ) {
    return { category: "alteracao_cliente", intent: "correcao", actionType: "revisar_arte" };
  }
  if (t.includes("briefing") || (t.includes("cliente") && (t.includes("arte") || t.includes("logo") || t.includes("feed")))) {
    return { category: "briefing_design", intent: "criar_arte", actionType: "desenvolver_briefing" };
  }
  if (t.includes("ideia") || t.includes("inspira") || t.includes("criativo")) {
    return { category: "ideia_criativa", intent: "registrar_ideia", actionType: "anotar_referencia" };
  }
  if (t.includes("lista") || t.includes("tarefa") || t.includes("fazer") || t.includes("comprar")) {
    return { category: "lista_tarefas", intent: "organizar_tarefas", actionType: "criar_checklist" };
  }
  if (t.includes("post") || t.includes("conteudo") || t.includes("legenda") || t.includes("publicar")) {
    return { category: "conteudo_post", intent: "criar_conteudo", actionType: "produzir_post" };
  }
  if (t.includes("referencia") || t.includes("referencia") || t.includes("inspiração") || t.includes("exemplo")) {
    return { category: "referencia_visual", intent: "coletar_referencia", actionType: "arquivar_referencia" };
  }
  if (t.includes("orcamento") || t.includes("proposta") || t.includes("cobrar") || t.includes("preco") || t.includes("valor")) {
    return { category: "orcamento_proposta", intent: "elaborar_proposta", actionType: "preparar_orcamento" };
  }
  if (t.includes("reuniao") || t.includes("conversa") || t.includes("ligação") || t.includes("discutir") || t.includes("alinhar")) {
    return { category: "reuniao_cliente", intent: "registrar_reuniao", actionType: "documentar_decisoes" };
  }
  if (t.includes("nota") || text.length < 50) {
    return { category: "anotacao_rapida", intent: "registrar_nota", actionType: "salvar_anotacao" };
  }

  return { category: "outro", intent: "entender_input", actionType: "analisar" };
}

function detectPriority(text: string): Priority {
  const t = text.toLowerCase();
  if (t.includes("urgente") || t.includes("hoje") || t.includes("agora") || t.includes("corre")) {
    return "urgent";
  }
  if (t.includes("importante") || t.includes("amanhã") || t.includes("prioridade") || t.includes("entrega")) {
    return "high";
  }
  if (t.includes("semana") || t.includes("depois") || t.includes("quando der")) {
    return "low";
  }
  return "medium";
}

function extractTags(text: string): string[] {
  const tags: string[] = [];
  const t = text.toLowerCase();

  const tagKeywords: Record<string, string[]> = {
    design: ["arte", "logo", "feed", "story", "post", "banner", "layout", "design", "figma", "photoshop"],
    cliente: ["cliente", "briefing", "aprovacao", "orcamento", "proposta", "reuniao"],
    producao: ["entrega", "prazo", "arquivo", "pdf", "png", "vetor", "mockup"],
    criacao: ["ideia", "criativo", "inspira", "conteudo", "post", "legenda"],
    tarefa: ["tarefa", "fazer", "pendente", "checklist", "lista"],
  };

  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some((kw) => t.includes(kw))) {
      tags.push(tag);
    }
  }

  return tags.length > 0 ? tags : ["geral"];
}

function extractDeadlines(text: string): string[] {
  const deadlines: string[] = [];
  const t = text.toLowerCase();

  const patterns: [RegExp, string][] = [
    [/(hoje|amanhã|depois de amanhã)/g, "$1"],
    [/(segunda|terça|quarta|quinta|sexta|sábado|domingo)/g, "$1"],
    [/(\d{2}\/\d{2}(\/\d{2,4})?)/g, "$1"],
    [/(para|até|ate)\s+(\w+)/g, "$2"],
  ];

  for (const [regex] of patterns) {
    const match = t.match(regex);
    if (match) {
      deadlines.push(match[0].trim());
    }
  }

  return deadlines;
}

function extractClientName(text: string): string | undefined {
  // Look for "cliente {nome}" or "cliente {nome} {nome}"
  const match = text.match(/cliente\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)/);
  return match?.[1]?.trim();
}

function extractProjectName(text: string): string | undefined {
  const match = text.match(/(?:projeto|trabalho|job)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)/i);
  return match?.[1]?.trim();
}

function generateQuestions(category: SpeechCategory, text: string): string[] {
  const questions: string[] = [];

  switch (category) {
    case "briefing_design":
      if (!text.toLowerCase().includes("feed") && !text.toLowerCase().includes("story")) {
        questions.push("A arte será para feed ou story?");
      }
      if (!text.toLowerCase().includes("logo")) {
        questions.push("Precisa incluir o logo do cliente?");
      }
      if (!text.toLowerCase().includes("paleta")) {
        questions.push("Qual a paleta de cores do cliente?");
      }
      break;
    case "alteracao_cliente":
      questions.push("Qual o prazo para essa alteração?");
      questions.push("O cliente já aprovou o briefing anterior?");
      break;
    case "orcamento_proposta":
      questions.push("Qual o escopo exato do trabalho?");
      questions.push("Quantas revisões estão inclusas?");
      break;
    default:
      break;
  }

  return questions;
}

function generateWarnings(text: string): string[] {
  const warnings: string[] = [];
  const t = text.toLowerCase();

  if (!t.includes("prazo") && !t.includes("data") && !t.includes("ate") && !t.includes("até")) {
    warnings.push("Nenhum prazo mencionado — pode ser importante definir.");
  }
  if (t.includes("urgente") || t.includes("corre")) {
    warnings.push("Tom urgente detectado. Priorize esta tarefa.");
  }
  if (t.split(" ").length < 5) {
    warnings.push("Entrada muito curta — pode faltar contexto.");
  }

  return warnings;
}

function cleanInputText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(\r\n|\n|\r)/g, " ")
    .trim();
}

/**
 * Organize raw text into structured content.
 * This is the main function called by the Hermes Orchestrator.
 */
export function organizeSpeech(rawText: string): OrganizedSpeechResult {
  const cleanedText = cleanInputText(rawText);
  const { category, intent, actionType } = detectCategory(cleanedText);
  const priority = detectPriority(cleanedText);
  const tags = extractTags(cleanedText);
  const deadlines = extractDeadlines(cleanedText);
  const clientName = extractClientName(cleanedText);
  const projectName = extractProjectName(cleanedText);

  // Generate title from first meaningful sentence
  const title =
    cleanedText.length > 60
      ? cleanedText.slice(0, 57).trimEnd() + "..."
      : cleanedText;

  // Generate summary
  const summary = cleanedText.length > 120
    ? cleanedText.slice(0, 117).trimEnd() + "..."
    : cleanedText;

  const questions = generateQuestions(category, cleanedText);
  const warnings = generateWarnings(cleanedText);

  const result: OrganizedSpeechResult = {
    title,
    summary,
    category,
    intent,
    actionType,
    priority,
    clientName,
    projectName,
    context: cleanedText,
    visualDirections: [],
    deliverables: [],
    references: [],
    checklist: [],
    deadlines,
    questions,
    warnings,
    tags,
    originalText: rawText,
    cleanedText,
    sourceType: "text",
    transcriptionQuality: "unknown",
    confidence: cleanedText.length > 10 ? 0.8 : 0.5,
    needsReview: warnings.length > 0 || questions.length > 0,
  };

  // Save to draft store
  setDraftOrganized(result);

  // Emit event
  hermesEvents.emit("NOTE_ORGANIZED", { result });

  return result;
}
