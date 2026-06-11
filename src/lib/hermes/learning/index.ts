/**
 * Hermes Learning Loop — entrypoint público.
 *
 * Use estes re-exports nas próximas etapas (Analyzer, Planner, Executor)
 * para manter um único ponto de import:
 *
 *   import { recordEvent, addMemory, logAction } from "@/lib/hermes/learning";
 *
 * Etapa atual implementada: Observe + Log + Memory.
 * Etapas pendentes (Analyzer, Planner, Executor, Tag Suggestions, Painel,
 * Feedback rápido) virão por cima sem alterar essa API.
 */

export * from "./types";
export { isLearningLoopEnabled, useLearningLoopEnabled } from "./flag";
export {
  recordEvent,
  listEvents,
  clearEvents,
  useHermesEvents,
  type RecordEventInput,
} from "./event-store";
export {
  logAction,
  listActionLogs,
  clearActionLogs,
  useActionLogs,
  type LogActionInput,
} from "./action-log";
export {
  addMemory,
  updateMemory,
  deactivateMemory,
  activateMemory,
  removeMemory,
  clearMemories,
  listMemories,
  topMemoriesByType,
  useHermesMemories,
  type AddMemoryInput,
} from "./memory";
