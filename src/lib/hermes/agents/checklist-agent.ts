/* ============================================
   Hermes — Checklist Agent
   ============================================
   Transforms organized content into actionable
   checklists. Never returns an empty checklist.
   ============================================ */

import type { ChecklistItem, OrganizedSpeechResult } from "../hermes-types";
import { hermesEvents } from "../hermes-events";
import { setDraftChecklist } from "../hermes-store";

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

/** Known design terms that indicate specific deliverables */
const DESIGN_TERMS = [
  "arte", "logo", "feed", "story", "reels", "carrossel", "banner",
  "outdoor", "mockup", "layout", "png", "pdf", "vetor", "previa",
  "arquivo final", "identidade visual", "paleta", "tipografia",
];

/** Detect if text has meaningful design/task context */
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

/** Generate explicit tasks from the original text */
function extractExplicitTasks(text: string): string[] {
  const tasks: string[] = [];
  const lines = text.split(/[,.;\n]/).map((l) => l.trim()).filter(Boolean);

  // Look for action verbs at start of sentences
  const actionVerbs = [
    "criar", "fazer", "enviar", "preparar", "revisar", "aplicar",
    "desenvolver", "produzir", "entregar", "confirmar", "verificar",
    "alterar", "corrigir", "ajustar", "formatar", "exportar",
    "salvar", "compartilhar", "apresentar", "discutir", "alinhar",
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (actionVerbs.some((v) => lower.startsWith(v))) {
      tasks.push(line);
    }
  }

  return tasks;
}

/** Infer tasks from context and design terms */
function inferContextTasks(result: OrganizedSpeechResult): string[] {
  const tasks: string[] = [];
  const t = result.cleanedText.toLowerCase();

  if (result.clientName) {
    tasks.push(`Criar arte para ${result.clientName}`);
  }

  if (t.includes("logo")) tasks.push("Desenvolver ou aplicar logo");
  if (t.includes("paleta")) tasks.push("Definir paleta de cores");
  if (t.includes("tipografia")) tasks.push("Escolher tipografia");
  if (t.includes("fundo")) tasks.push("Aplicar fundo conforme especificação");

  if (result.visualDirections.length > 0) {
    for (const dir of result.visualDirections) {
      tasks.push(`Aplicar direção visual: ${dir}`);
    }
  }

  return tasks;
}

/** Infer tasks from deadlines */
function inferDeadlineTasks(deadlines: string[]): string[] {
  const tasks: string[] = [];
  for (const d of deadlines) {
    tasks.push(`Preparar entrega para ${d}`);
    tasks.push(`Revisar arte antes de enviar em ${d}`);
  }
  return tasks;
}

/** Generate generic fallback tasks by category */
function genericFallback(category: string): string[] {
  switch (category) {
    case "briefing_design":
      return [
        "Analisar briefing recebido",
        "Listar dúvidas para esclarecer com cliente",
        "Definir cronograma de entregas",
      ];
    case "alteracao_cliente":
      return [
        "Identificar o que precisa ser alterado",
        "Aplicar correções solicitadas",
        "Enviar nova versão para aprovação",
      ];
    case "lista_tarefas":
      return ["Organizar lista de tarefas por prioridade"];
    case "reuniao_cliente":
      return [
        "Documentar decisões da reunião",
        "Listar próximos passos",
        "Enviar resumo para o cliente",
      ];
    case "conteudo_post":
      return [
        "Definir conceito do post",
        "Criar arte visual",
        "Escrever legenda",
        "Agendar publicação",
      ];
    case "orcamento_proposta":
      return [
        "Detalhar escopo do projeto",
        "Definir valor do orçamento",
        "Preparar proposta para envio",
      ];
    case "anotacao_rapida":
      return ["Revisar anotação e identificar próximos passos"];
    default:
      return ["Revisar o conteúdo e definir próximas ações"];
  }
}

/**
 * Generate a checklist from an organized speech result.
 * Uses a hierarchy: explicit tasks > context tasks > deadline tasks > fallback
 */
export function generateChecklist(result: OrganizedSpeechResult): ChecklistItem[] {
  const allTasks: string[] = [];
  const seen = new Set<string>();

  function addUnique(task: string) {
    const key = task.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      allTasks.push(task.trim());
    }
  }

  // 1. Explicit tasks from the text
  const explicit = extractExplicitTasks(result.originalText);
  for (const t of explicit) addUnique(t);

  // 2. Context-inferred tasks (if text has context)
  if (hasContext(result.cleanedText)) {
    const contextTasks = inferContextTasks(result);
    for (const t of contextTasks) addUnique(t);
  }

  // 3. Deadline-based tasks
  if (result.deadlines.length > 0) {
    const deadlineTasks = inferDeadlineTasks(result.deadlines);
    for (const t of deadlineTasks) addUnique(t);
  }

  // 4. Deliverables from the organized result
  if (result.deliverables.length > 0) {
    for (const d of result.deliverables) addUnique(d);
  }

  // 5. Visual directions
  if (result.visualDirections.length > 0) {
    for (const v of result.visualDirections) {
      addUnique(`Aplicar direção visual: ${v}`);
    }
  }

  // 6. Fallback by category (only if no tasks were found, or no context)
  if (allTasks.length === 0) {
    const fallback = genericFallback(result.category);
    for (const f of fallback) addUnique(f);
  }

  // 7. If still empty (shouldn't happen), ultimate fallback
  if (allTasks.length === 0) {
    allTasks.push("Revisar conteúdo recebido");
    allTasks.push("Identificar próximos passos");
  }

  const checklist: ChecklistItem[] = allTasks.map((text) => ({
    id: uid(),
    text,
    done: false,
  }));

  // Save to draft store
  setDraftChecklist(checklist);

  // Emit event
  hermesEvents.emit("CHECKLIST_GENERATED", { checklist });

  return checklist;
}
