/* ============================================
   Hermes — UI State Agent
   ============================================
   Controls which screen/panel to show.
   Manages the organized content window,
   focus mode, brain dump panel, and
   enables/disables buttons based on state.
   ============================================ */

import { getCapturedInput, getDraftOrganized, setOrganizedWindowOpen } from "../hermes-store";
import { hermesEvents } from "../hermes-events";

export type UIState = {
  canOrganize: boolean;
  organizedWindowOpen: boolean;
  hasDraft: boolean;
  hasCapturedInput: boolean;
  canSave: boolean;
  canFocus: boolean;
};

/**
 * Get the current UI state for rendering decisions.
 */
export function getUIState(): UIState {
  const captured = getCapturedInput();
  const draft = getDraftOrganized();

  return {
    canOrganize: captured !== null && captured.rawText.trim().length > 0,
    organizedWindowOpen: draft !== null,
    hasDraft: draft !== null,
    hasCapturedInput: captured !== null,
    canSave: draft !== null,
    canFocus: draft !== null && draft.checklist.length > 0,
  };
}

/**
 * Open the organized content window for user review.
 * Rules: show only if draft exists, never mix raw with organized.
 */
export function openOrganizedWindow(): boolean {
  const draft = getDraftOrganized();
  if (!draft) {
    console.warn("[Hermes] Cannot open organized window: no draft available.");
    return false;
  }

  setOrganizedWindowOpen(true);
  hermesEvents.emit("ORGANIZED_WINDOW_OPENED", {});
  return true;
}

/**
 * Close the organized content window without saving.
 */
export function closeOrganizedWindow(): void {
  setOrganizedWindowOpen(false);
}

/**
 * Check if the organize button should be enabled.
 * Botão Organizar só habilita com texto.
 */
export function canOrganize(): boolean {
  const captured = getCapturedInput();
  return captured !== null && captured.rawText.trim().length > 0;
}

/**
 * Check if the save button should be enabled.
 */
export function canSave(): boolean {
  const draft = getDraftOrganized();
  return draft !== null;
}
