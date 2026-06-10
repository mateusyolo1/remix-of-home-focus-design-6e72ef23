/* ============================================
   Hermes — Memory/Learning Agent
   ============================================
   Learns from user behavior by comparing
   original suggestions vs. user corrections.
   Only learns from confirmed/saved content.
   ============================================ */

import type {
  ChecklistItem,
  MemoryPattern,
  OrganizedSpeechResult,
  HermesNote,
} from "../hermes-types";
import { hermesEvents } from "../hermes-events";
import { getMemoryPatterns, setMemoryPatterns } from "../hermes-store";

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Compare original checklist with user-edited checklist
 * and extract learning patterns.
 */
export function learnFromCorrection(
  original: OrganizedSpeechResult,
  editedChecklist: ChecklistItem[],
  originalChecklist: ChecklistItem[],
): MemoryPattern[] {
  const patterns: MemoryPattern[] = [];
  const existing = getMemoryPatterns();

  for (let i = 0; i < Math.min(originalChecklist.length, editedChecklist.length); i++) {
    const orig = originalChecklist[i].text.toLowerCase().trim();
    const edited = editedChecklist[i].text.toLowerCase().trim();

    // If user significantly changed the text, learn the pattern
    if (orig !== edited && orig.length > 3 && edited.length > 3) {
      // Extract a trigger phrase from the original
      const triggerWords = orig.split(" ").filter((w) => w.length > 3).slice(0, 3);

      if (triggerWords.length > 0) {
        const trigger = triggerWords.join(" ");
        const existingPattern = existing.find(
          (p) => p.trigger === trigger && p.category === original.category,
        );

        if (existingPattern) {
          // Update existing pattern
          existingPattern.replacement = edited;
          existingPattern.frequency += 1;
          existingPattern.lastUsed = new Date().toISOString();
          patterns.push(existingPattern);
        } else {
          // Create new pattern
          const pattern: MemoryPattern = {
            id: uid(),
            trigger,
            replacement: edited,
            category: original.category,
            frequency: 1,
            lastUsed: new Date().toISOString(),
          };
          existing.push(pattern);
          patterns.push(pattern);
        }
      }
    }
  }

  if (patterns.length > 0) {
    setMemoryPatterns(existing);
    hermesEvents.emit("MEMORY_LEARNED", { patterns });
  }

  return patterns;
}

/**
 * Try to apply learned patterns to new content.
 * Returns modified checklist with learned replacements.
 */
export function applyLearnedPatterns(
  checklist: ChecklistItem[],
  category: string,
): ChecklistItem[] {
  const patterns = getMemoryPatterns().filter(
    (p) => p.category === category,
  );

  if (patterns.length === 0) return checklist;

  return checklist.map((item) => {
    const matchingPattern = patterns.find((p) =>
      item.text.toLowerCase().includes(p.trigger.toLowerCase()),
    );

    if (matchingPattern) {
      return {
        ...item,
        text: item.text.replace(
          new RegExp(matchingPattern.trigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
          matchingPattern.replacement,
        ),
      };
    }

    return item;
  });
}

/**
 * Register a completed task for learning.
 * Tracks what kind of tasks the user finishes.
 */
export function registerTaskCompletion(
  note: HermesNote,
  completedItems: ChecklistItem[],
): void {
  const existing = getMemoryPatterns();

  // Record the task completion pattern
  const category = note.category;
  const existingCat = existing.find(
    (p) => p.category === `${category}_completado`,
  );

  if (existingCat) {
    existingCat.frequency += 1;
    existingCat.lastUsed = new Date().toISOString();
  } else {
    existing.push({
      id: uid(),
      trigger: `${category}_completado`,
      replacement: `${completedItems.length} itens concluídos em ${category}`,
      category: `${category}_completado`,
      frequency: 1,
      lastUsed: new Date().toISOString(),
    });
  }

  setMemoryPatterns(existing);
  hermesEvents.emit("MEMORY_LEARNED", { type: "task_completion", note: note.id });
}

/** Get statistics about learned patterns */
export function getMemoryStats(): {
  totalPatterns: number;
  topCategories: { category: string; count: number }[];
} {
  const patterns = getMemoryPatterns();

  const categoryMap = new Map<string, number>();
  for (const p of patterns) {
    const cat = p.category.replace("_completado", "");
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  }

  const topCategories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalPatterns: patterns.length,
    topCategories,
  };
}

/** Clear all memory patterns */
export function clearMemory(): void {
  setMemoryPatterns([]);
  hermesEvents.emit("MEMORY_LEARNED", { action: "cleared" });
}
