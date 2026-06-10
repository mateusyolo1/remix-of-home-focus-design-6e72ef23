/* ============================================
   Hermes — Privacy/Storage Agent
   ============================================
   Controls data persistence and privacy.
   All memory is local by default.
   User can clear memory, disable learning,
   and export/delete their data.
   ============================================ */

import type { HermesNote, MemoryPattern } from "../hermes-types";
import {
  getSavedNotes,
  setSavedNotes,
  getMemoryPatterns,
  setMemoryPatterns,
  clearDraft,
} from "../hermes-store";

const LEARNING_ENABLED_KEY = "hermes.learning_enabled";

/** Check if learning is enabled */
export function isLearningEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(LEARNING_ENABLED_KEY) !== "false";
}

/** Enable or disable learning */
export function setLearningEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEARNING_ENABLED_KEY, String(enabled));
}

/**
 * Delete a saved note by ID.
 */
export function deleteNote(noteId: string): boolean {
  const notes = getSavedNotes();
  const filtered = notes.filter((n) => n.id !== noteId);
  if (filtered.length === notes.length) return false;
  setSavedNotes(filtered);
  return true;
}

/**
 * Export all user data as JSON.
 */
export function exportAllData(): string {
  const data = {
    notes: getSavedNotes(),
    memory: getMemoryPatterns(),
    exportDate: new Date().toISOString(),
    version: "1.0",
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Clear all user data (notes + memory + drafts).
 */
export function clearAllData(): void {
  setSavedNotes([]);
  setMemoryPatterns([]);
  clearDraft();
  if (typeof window !== "undefined") {
    const keysToRemove = [
      "hermes.captured",
      "hermes.draft_organized",
      "hermes.draft_checklist",
      "hermes.window_open",
      "hermes.notifications",
    ];
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  }
}

/**
 * Clear only memory patterns (keep notes).
 */
export function clearMemory(): void {
  setMemoryPatterns([]);
}

/**
 * Get storage stats.
 */
export function getStorageStats(): {
  noteCount: number;
  memoryPatternCount: number;
  estimatedKb: number;
} {
  const notes = getSavedNotes();
  const patterns = getMemoryPatterns();

  let totalSize = 0;
  try {
    totalSize = new Blob([JSON.stringify({ notes, patterns })]).size;
  } catch {
    totalSize = 0;
  }

  return {
    noteCount: notes.length,
    memoryPatternCount: patterns.length,
    estimatedKb: Math.round(totalSize / 1024),
  };
}
