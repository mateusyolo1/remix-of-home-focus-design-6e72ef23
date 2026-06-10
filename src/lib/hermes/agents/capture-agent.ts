/* ============================================
   Hermes — Capture Agent
   ============================================
   Receives raw input (text, audio, image, agenda)
   cleans it, detects type, and stores it.
   ============================================ */

import type { CapturedInput, InputSource } from "../hermes-types";
import { setCapturedInput } from "../hermes-store";
import { hermesEvents } from "../hermes-events";

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

/** Normalize text: trim, collapse whitespace, remove leading/trailing noise */
function cleanText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[,.\s]+|[,.\s]+$/g, "")
    .trim();
}

/** Detect the source type based on metadata */
function detectSourceType(
  fromAudio: boolean,
  fromImage: boolean,
  fromAgenda: boolean,
): InputSource {
  if (fromAudio && fromImage) return "mixed";
  if (fromAudio) return "audio";
  if (fromImage) return "image";
  if (fromAgenda) return "agenda";
  return "text";
}

/**
 * Capture raw input from any source.
 * Cleans the text, preserves original, classifies source,
 * and emits a RAW_INPUT_CREATED event.
 */
export function captureInput(input: {
  rawText: string;
  sourceType?: InputSource;
  audioFilePath?: string;
  imageFilePath?: string;
}): CapturedInput {
  const captured: CapturedInput = {
    id: uid(),
    rawText: input.rawText,
    sourceType:
      input.sourceType ??
      detectSourceType(!!input.audioFilePath, !!input.imageFilePath, false),
    createdAt: new Date().toISOString(),
    audioFilePath: input.audioFilePath,
    imageFilePath: input.imageFilePath,
  };

  setCapturedInput(captured);

  hermesEvents.emit("RAW_INPUT_CREATED", { input: captured });

  return captured;
}
