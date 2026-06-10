/* ============================================
   Hermes — Task Planner Agent
   ============================================
   Organizes tasks in time: chooses next action,
   separates into Now / Later / Review, connects
   tasks to timer, suggests session duration.
   ============================================ */

import type { ChecklistItem, ExecutionPlan } from "../hermes-types";

/**
 * Choose the next action from a list of checklist items.
 * Prioritizes undoned, urgent items first.
 */
export function chooseNextAction(items: ChecklistItem[]): ChecklistItem {
  const undone = items.filter((i) => !i.done);

  if (undone.length === 0) {
    return { id: "all-done", text: "Tudo concluído!", done: false };
  }

  // Prioritize by position (first = most important)
  return undone[0];
}

/**
 * Separate items into Now, Later, and Review buckets.
 */
function bucketItems(items: ChecklistItem[]): {
  now: ChecklistItem[];
  later: ChecklistItem[];
  review: ChecklistItem[];
} {
  const now: ChecklistItem[] = [];
  const later: ChecklistItem[] = [];
  const review: ChecklistItem[] = [];

  const urgentKeywords = [
    "urgente", "hoje", "amanhã", "enviar", "entregar",
    "prazo", "corrigir", "ajustar", "aprovação",
  ];

  const reviewKeywords = [
    "revisar", "verificar", "analisar", "confirmar",
    "checar", "validar", "testar",
  ];

  for (const item of items) {
    if (item.done) continue;

    const text = item.text.toLowerCase();

    if (urgentKeywords.some((k) => text.includes(k))) {
      now.push(item);
    } else if (reviewKeywords.some((k) => text.includes(k))) {
      review.push(item);
    } else {
      later.push(item);
    }
  }

  // If now is empty, pull the first from later
  if (now.length === 0 && later.length > 0) {
    now.push(later.shift()!);
  }

  return { now, later, review };
}

/**
 * Suggest focus duration based on the complexity of the task.
 */
function suggestDuration(items: ChecklistItem[]): number {
  if (items.length === 0) return 25;

  const totalWords = items.reduce((sum, item) => sum + item.text.split(" ").length, 0);
  const avgWords = totalWords / items.length;

  if (avgWords > 10) return 45;
  if (avgWords > 5) return 25;
  return 15;
}

/**
 * Create a full execution plan from a set of checklist items.
 */
export function createExecutionPlan(items: ChecklistItem[]): ExecutionPlan {
  const { now, later, review } = bucketItems(items);

  const nextAction = chooseNextAction(items);
  const suggestedFocusMinutes = suggestDuration(items);

  return {
    nextAction,
    now,
    later,
    review,
    suggestedFocusMinutes,
  };
}

/**
 * Divide a large task into smaller micro-steps.
 */
export function divideTask(task: ChecklistItem): ChecklistItem[] {
  const text = task.text;

  // Generic micro-steps based on task type
  const steps: string[] = [
    `Preparar: ${text}`,
    `Executar primeiro bloco de ${text}`,
    `Revisar progresso`,
    `Finalizar ${text}`,
  ];

  return steps.map((stepText) => ({
    id: `${task.id}-${Math.random().toString(36).slice(2, 5)}`,
    text: stepText,
    done: false,
  }));
}
