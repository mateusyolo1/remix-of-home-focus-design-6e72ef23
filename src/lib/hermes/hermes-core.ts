/* ============================================
   Hermes — Core Orchestrator
   ============================================
   Coordinates all agents. Receives events from
   the app, decides which agents to call, in
   which order, and controls the full pipeline.
   ============================================ */

import type {
  CapturedInput,
  ChecklistItem,
  OrganizedSpeechResult,
  QualityReport,
  HermesNote,
  HermesEvent,
  ExecutionPlan,
} from "./hermes-types";
import { hermesEvents } from "./hermes-events";
import {
  getCapturedInput,
  getDraftOrganized,
  getDraftChecklist,
  getSavedNotes,
  setDraftOrganized,
  setDraftChecklist,
  setSavedNotes,
  clearDraft,
  setOrganizedWindowOpen,
} from "./hermes-store";
import { organizeSpeech } from "./agents/speech-organizer-agent";
import { generateChecklist } from "./agents/checklist-agent";
import { evaluateQuality } from "./agents/quality-evaluator-agent";
import { planExecution } from "./agents/focus-agent";
import { createExecutionPlan } from "./agents/task-planner-agent";
import {
  applyLearnedPatterns,
  learnFromCorrection,
  registerTaskCompletion,
} from "./agents/memory-agent";

/**
 * Run the full pipeline: capture → organize → checklist → quality check.
 * This is the main entry point for processing user input.
 */
export function processUserInput(rawText: string): {
  organized: OrganizedSpeechResult;
  checklist: ChecklistItem[];
  quality: QualityReport;
} {
  // 1. Organize the speech/text
  const organized = organizeSpeech(rawText);

  // 2. Generate checklist
  let checklist = generateChecklist(organized);

  // 3. Apply learned patterns from memory
  checklist = applyLearnedPatterns(checklist, organized.category);

  // 4. Update the draft with checklist
  const updatedOrganized = { ...organized, checklist };
  setDraftOrganized(updatedOrganized);
  setDraftChecklist(checklist);

  // 5. Quality check
  const quality = evaluateQuality(updatedOrganized, checklist);

  return { organized: updatedOrganized, checklist, quality };
}

/**
 * User saves the reviewed content.
 * Converts draft to a saved note and triggers memory learning.
 */
export function saveReviewedContent(editedChecklist?: ChecklistItem[]): HermesNote | null {
  const organized = getDraftOrganized();
  if (!organized) return null;

  const originalChecklist = organized.checklist;
  const finalChecklist = editedChecklist ?? originalChecklist;

  // Learn from user corrections
  if (editedChecklist) {
    learnFromCorrection(organized, editedChecklist, originalChecklist);
  }

  // Create the saved note
  const note: HermesNote = {
    id: `note-${Date.now()}`,
    title: organized.title,
    summary: organized.summary,
    category: organized.category,
    checklist: finalChecklist,
    priority: organized.priority,
    tags: organized.tags,
    originalText: organized.originalText,
    organizedResult: organized,
    createdAt: (organized as any).createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    saved: true,
  };

  // Add to saved notes
  const notes = getSavedNotes();
  setSavedNotes([note, ...notes]);

  // Clear draft
  clearDraft();

  // Emit event
  hermesEvents.emit("NOTE_SAVED", { note });

  return note;
}

/**
 * Discard the current draft without saving.
 */
export function discardDraft(): void {
  const organized = getDraftOrganized();
  clearDraft();

  // We don't learn from discarded drafts
  hermesEvents.emit("USER_CORRECTED_RESULT", { action: "discarded" });
}

/**
 * Complete tasks and register the completion for learning.
 */
export function completeTask(noteId: string, completedItems: ChecklistItem[]): void {
  const notes = getSavedNotes();
  const note = notes.find((n) => n.id === noteId);
  if (!note) return;

  // Mark items as done
  const updatedNote: HermesNote = {
    ...note,
    checklist: note.checklist.map(
      (item) =>
        completedItems.find((c) => c.id === item.id)
          ? { ...item, done: true }
          : item,
    ),
    updatedAt: new Date().toISOString(),
  };

  const updatedNotes = notes.map((n) => (n.id === noteId ? updatedNote : n));
  setSavedNotes(updatedNotes);

  // Register completion for learning
  registerTaskCompletion(updatedNote, completedItems);

  hermesEvents.emit("TASK_COMPLETED", { noteId, completedItems });
}

/**
 * Generate next action plan for the home screen.
 */
export function getNextActionPlan(): ExecutionPlan | null {
  const notes = getSavedNotes();
  if (notes.length === 0) return null;

  // Collect all undoned items from all saved notes
  const allItems: ChecklistItem[] = [];
  for (const note of notes) {
    for (const item of note.checklist) {
      if (!item.done) {
        allItems.push(item);
      }
    }
  }

  if (allItems.length === 0) return null;

  return createExecutionPlan(allItems);
}

/**
 * Start a focus session on a specific task.
 */
export function startFocusOnTask(task: ChecklistItem, minutes: number): void {
  setOrganizedWindowOpen(false);
  hermesEvents.emit("FOCUS_STARTED", { task, minutes });
}

/**
 * Finish a focus session.
 */
export function finishFocus(): void {
  hermesEvents.emit("FOCUS_FINISHED", {});
}

/**
 * Initialize the Hermes system.
 * Sets up event listeners and returns cleanup function.
 */
export function initHermes(): () => void {
  const unsubscribers: (() => void)[] = [];

  // Example: log all events by default
  unsubscribers.push(
    hermesEvents.on("RAW_INPUT_CREATED", (e) => {
      console.log(`[Hermes] Input captured:`, e.data?.input);
    }),
    hermesEvents.on("NOTE_ORGANIZED", (e) => {
      console.log(`[Hermes] Note organized:`, e.data?.result);
    }),
    hermesEvents.on("CHECKLIST_GENERATED", (e) => {
      console.log(`[Hermes] Checklist generated:`, e.data?.checklist);
    }),
    hermesEvents.on("NOTE_SAVED", (e) => {
      console.log(`[Hermes] Note saved:`, e.data?.note);
    }),
  );

  return () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
  };
}
