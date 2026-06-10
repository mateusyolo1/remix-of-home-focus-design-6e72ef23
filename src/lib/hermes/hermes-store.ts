/* ============================================
   Hermes — State Management (localStorage)
   ============================================ */

import { useEffect, useState } from "react";
import type {
  CapturedInput,
  OrganizedSpeechResult,
  HermesNote,
  MemoryPattern,
  QualityReport,
  ChecklistItem,
} from "./hermes-types";

/* ---------- localStorage helpers ---------- */

const KEY_CAPTURED = "hermes.captured";
const KEY_DRAFT = "hermes.draft_organized";
const KEY_DRAFT_CHECKLIST = "hermes.draft_checklist";
const KEY_SAVED_NOTES = "hermes.saved_notes";
const KEY_MEMORY = "hermes.memory";
const KEY_WINDOW_OPEN = "hermes.window_open";
const EVT = "hermes:store";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(EVT, { detail: { key } }));
}

function useStoreValue<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => read(key, fallback));
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { key: string } | undefined;
      if (!detail || detail.key === key) setVal(read(key, fallback));
    };
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return [val, (v: T) => write(key, v)];
}

/* ---------- Store hooks ---------- */

/** The raw input currently being processed (draft) */
export function useCapturedInput() {
  return useStoreValue<CapturedInput | null>(KEY_CAPTURED, null);
}

/** The organized result before user review (draft) */
export function useDraftOrganized() {
  return useStoreValue<OrganizedSpeechResult | null>(KEY_DRAFT, null);
}

/** The checklist draft before user review */
export function useDraftChecklist() {
  return useStoreValue<ChecklistItem[]>(KEY_DRAFT_CHECKLIST, []);
}

/** Saved notes (after user confirms) */
export function useSavedNotes() {
  return useStoreValue<HermesNote[]>(KEY_SAVED_NOTES, []);
}

/** Learned memory patterns */
export function useMemoryPatterns() {
  return useStoreValue<MemoryPattern[]>(KEY_MEMORY, []);
}

/** Whether the organized content window is open */
export function useOrganizedWindowOpen() {
  return useStoreValue<boolean>(KEY_WINDOW_OPEN, false);
}

/* ---------- Imperative helpers for agents ---------- */

export function getCapturedInput(): CapturedInput | null {
  return read(KEY_CAPTURED, null);
}

export function setCapturedInput(input: CapturedInput | null) {
  write(KEY_CAPTURED, input);
}

export function getDraftOrganized(): OrganizedSpeechResult | null {
  return read(KEY_DRAFT, null);
}

export function setDraftOrganized(result: OrganizedSpeechResult | null) {
  write(KEY_DRAFT, result);
}

export function getDraftChecklist(): ChecklistItem[] {
  return read(KEY_DRAFT_CHECKLIST, []);
}

export function setDraftChecklist(items: ChecklistItem[]) {
  write(KEY_DRAFT_CHECKLIST, items);
}

export function getSavedNotes(): HermesNote[] {
  return read(KEY_SAVED_NOTES, []);
}

export function setSavedNotes(notes: HermesNote[]) {
  write(KEY_SAVED_NOTES, notes);
}

export function getMemoryPatterns(): MemoryPattern[] {
  return read(KEY_MEMORY, []);
}

export function setMemoryPatterns(patterns: MemoryPattern[]) {
  write(KEY_MEMORY, patterns);
}

export function getOrganizedWindowOpen(): boolean {
  return read(KEY_WINDOW_OPEN, false);
}

export function setOrganizedWindowOpen(open: boolean) {
  write(KEY_WINDOW_OPEN, open);
}

/** Clear all draft data (when user discards or saves) */
export function clearDraft() {
  write(KEY_CAPTURED, null);
  write(KEY_DRAFT, null);
  write(KEY_DRAFT_CHECKLIST, []);
  write(KEY_WINDOW_OPEN, false);
}
