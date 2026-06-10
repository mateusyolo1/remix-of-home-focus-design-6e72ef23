/* ============================================
   Hermes — Core Type Definitions
   ============================================ */

/** Source of a raw input */
export type InputSource = "audio" | "text" | "image" | "agenda" | "mixed";

/** Captured raw input from the user */
export type CapturedInput = {
  id: string;
  rawText: string;
  sourceType: InputSource;
  createdAt: string;
  audioFilePath?: string;
  imageFilePath?: string;
};

/** Status of audio transcription */
export type TranscriptionStatus =
  | "idle"
  | "recording"
  | "processing"
  | "success"
  | "used_preview_fallback"
  | "failed_but_audio_saved"
  | "audio_file_error";

/** Result of audio transcription */
export type TranscriptionResult = {
  text: string;
  status: TranscriptionStatus;
  audioFilePath?: string;
  confidence: number;
};

/** Priority levels */
export type Priority = "low" | "medium" | "high" | "urgent";

/** A single checklist item */
export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

/** Transcription quality assessment */
export type TranscriptionQuality = "good" | "partial" | "poor" | "unknown";

/** Fully organized speech/note result */
export type OrganizedSpeechResult = {
  title: string;
  summary: string;
  category: string;
  intent: string;
  actionType: string;
  priority: Priority;
  clientName?: string;
  projectName?: string;
  context: string;
  visualDirections: string[];
  deliverables: string[];
  references: string[];
  checklist: ChecklistItem[];
  deadlines: string[];
  questions: string[];
  warnings: string[];
  tags: string[];
  originalText: string;
  cleanedText: string;
  sourceType: string;
  audioFilePath?: string;
  transcriptionQuality: TranscriptionQuality;
  confidence: number;
  needsReview: boolean;
};

/** Quality evaluation report */
export type QualityReport = {
  score: number;
  needsReview: boolean;
  problems: string[];
  suggestions: string[];
};

/** Execution plan with next action and task buckets */
export type ExecutionPlan = {
  nextAction: ChecklistItem;
  now: ChecklistItem[];
  later: ChecklistItem[];
  review: ChecklistItem[];
  suggestedFocusMinutes: number;
};

/** Mental energy level for TDAH adaptation */
export type EnergyLevel = "low" | "normal" | "hyperfocus";

/** A saved note */
export type HermesNote = {
  id: string;
  title: string;
  summary: string;
  category: string;
  checklist: ChecklistItem[];
  priority: Priority;
  tags: string[];
  originalText: string;
  organizedResult: OrganizedSpeechResult;
  createdAt: string;
  updatedAt: string;
  saved: boolean;
};

/** A memory pattern learned from user behavior */
export type MemoryPattern = {
  id: string;
  trigger: string;       // e.g. "prévia + prazo"
  replacement: string;   // e.g. "Enviar prévia [prazo] para aprovação"
  category: string;
  frequency: number;
  lastUsed: string;
};

/** Hermes event names */
export type HermesEvent =
  | "RAW_INPUT_CREATED"
  | "AUDIO_RECORDED"
  | "AUDIO_TRANSCRIBED"
  | "ORGANIZE_REQUESTED"
  | "NOTE_ORGANIZED"
  | "CHECKLIST_GENERATED"
  | "QUALITY_CHECKED"
  | "ORGANIZED_WINDOW_OPENED"
  | "NOTE_SAVED"
  | "TASK_COMPLETED"
  | "FOCUS_STARTED"
  | "FOCUS_FINISHED"
  | "USER_CORRECTED_RESULT"
  | "MEMORY_LEARNED";

/** Payload for a Hermes event */
export type HermesEventPayload = {
  type: HermesEvent;
  data?: Record<string, unknown>;
  timestamp: string;
};

/** Category classification for speech/text */
export type SpeechCategory =
  | "alteracao_cliente"
  | "briefing_design"
  | "ideia_criativa"
  | "lista_tarefas"
  | "conteudo_post"
  | "referencia_visual"
  | "orcamento_proposta"
  | "reuniao_cliente"
  | "anotacao_rapida"
  | "outro";

/** Design-related terms the Design Context Agent recognizes */
export type DesignTerm =
  | "logo"
  | "identidade_visual"
  | "paleta"
  | "tipografia"
  | "feed"
  | "story"
  | "reels"
  | "carrossel"
  | "banner"
  | "outdoor"
  | "mockup"
  | "briefing"
  | "aprovacao"
  | "previa"
  | "layout"
  | "arquivo_final"
  | "png"
  | "pdf"
  | "vetor"
  | "illustrator"
  | "photoshop"
  | "canva"
  | "figma";

/** Listener type for event system */
export type HermesListener = (event: HermesEventPayload) => void;
