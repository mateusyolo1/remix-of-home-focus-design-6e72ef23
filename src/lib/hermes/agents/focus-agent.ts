/* ============================================
   Hermes — Focus/TDAH Agent
   ============================================
   Adapts the app for focus and ADHD needs.
   Manages mental energy levels and suggests
   next actions based on cognitive load.
   ============================================ */

import type { ChecklistItem, ExecutionPlan, EnergyLevel } from "../hermes-types";

/** Suggest focus duration based on energy level */
function suggestMinutes(energy: EnergyLevel): number {
  switch (energy) {
    case "low":
      return 10;
    case "normal":
      return 25;
    case "hyperfocus":
      return 45;
  }
}

/**
 * Reduce cognitive load by simplifying task descriptions.
 * Long tasks get truncated, complex tasks get simplified.
 */
function simplifyTask(task: ChecklistItem): ChecklistItem {
  const text = task.text;
  if (text.length > 50) {
    return { ...task, text: text.slice(0, 47).trimEnd() + "..." };
  }
  return task;
}

/**
 * Separate tasks into Now / Later / Review buckets.
 * "Now" tasks are urgent or high priority.
 * "Later" tasks are medium/low priority.
 * "Review" tasks are items that need more context.
 */
function bucketTasks(
  tasks: ChecklistItem[],
  energy: EnergyLevel,
): { now: ChecklistItem[]; later: ChecklistItem[]; review: ChecklistItem[] } {
  const now: ChecklistItem[] = [];
  const later: ChecklistItem[] = [];
  const review: ChecklistItem[] = [];

  for (const task of tasks) {
    const t = task.text.toLowerCase();

    // Tasks with urgent words go to "now"
    if (
      t.includes("urgente") ||
      t.includes("hoje") ||
      t.includes("amanhã") ||
      t.includes("enviar") ||
      t.includes("entregar")
    ) {
      now.push(task);
    }
    // Tasks with review/analyze words go to review
    else if (
      t.includes("revisar") ||
      t.includes("analisar") ||
      t.includes("identificar") ||
      t.includes("entender")
    ) {
      review.push(task);
    }
    // Everything else goes to later
    else {
      later.push(task);
    }
  }

  // If low energy, move heavy tasks from now to later
  if (energy === "low") {
    const heavy = now.filter((t) => t.text.split(" ").length > 8);
    for (const h of heavy) {
      const idx = now.indexOf(h);
      if (idx >= 0) {
        now.splice(idx, 1);
        later.push(h);
      }
    }
  }

  // If hyperfocus, pull one deep task from later to now
  if (energy === "hyperfocus" && later.length > 0) {
    const longest = [...later].sort(
      (a, b) => b.text.length - a.text.length,
    )[0];
    const idx = later.indexOf(longest);
    if (idx >= 0) {
      later.splice(idx, 1);
      now.push(longest);
    }
  }

  return { now, later, review };
}

/**
 * Create an execution plan from a list of checklist items
 * and a user's current energy level.
 */
export function planExecution(
  tasks: ChecklistItem[],
  energy: EnergyLevel = "normal",
): ExecutionPlan {
  const { now, later, review } = bucketTasks(tasks, energy);

  // Simplify tasks based on energy
  const simplifiedNow = now.map(simplifyTask);
  const simplifiedLater = later.map(simplifyTask);

  // Next action is the first "now" task, or first task overall
  const completed = tasks.filter((t) => t.done);
  const undone = tasks.filter((t) => !t.done);

  const nextAction =
    simplifiedNow.length > 0
      ? simplifiedNow[0]
      : undone.length > 0
        ? simplifyTask(undone[0])
        : { id: "done", text: "Tudo concluído! 🎉", done: false };

  const plan: ExecutionPlan = {
    nextAction,
    now: simplifiedNow,
    later: simplifiedLater,
    review,
    suggestedFocusMinutes: suggestMinutes(energy),
  };

  return plan;
}

/**
 * Suggest a focus session configuration based on
 * the current task and energy level.
 */
export function suggestFocusSession(
  task: ChecklistItem,
  energy: EnergyLevel,
): { task: string; minutes: number; microSteps: string[] } {
  const minutes = suggestMinutes(energy);

  // Generate micro-steps from the task
  const microSteps = [
    `Preparar ambiente para "${task.text}"`,
    `Executar o primeiro passo de 2 minutos`,
    `Revisar progresso após ${minutes} minutos`,
  ];

  return {
    task: task.text,
    minutes,
    microSteps,
  };
}
