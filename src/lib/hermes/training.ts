/**
 * Hermes Training — loop de auto-aprendizado focado em 4 eixos:
 *   1. Tools (router): aprende quais ferramentas adicionar a frases parecidas.
 *   2. Tom/formato: aprende se o usuário prefere respostas curtas, bullets, etc.
 *   3. Tags: já tratado pelo agent-tags + preference-engine (aqui só reforça).
 *   4. Confirmações: aprende quando pular o "Sim/Não" para mutações repetitivas.
 *
 * 100% local (localStorage). Sem dependência da feature flag do learning-loop
 * antigo — esse módulo é o sucessor unificado e roda assim que o painel está
 * habilitado.
 */

import { useEffect, useState } from "react";
import type { PendingMutation } from "./tools/tool-executor";
import type { ToolRequest } from "./tools/tool-router";

const KEY_EVENTS = "fm.hermes.training.events";
const KEY_RULES = "fm.hermes.training.rules";
const KEY_FLAG = "fm.hermes.training.enabled";
const EVT = "fm:hermes:training";
const MAX_EVENTS = 400;
const EVENT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type ToolName = ToolRequest["tool"];
export type MutationKind = PendingMutation["kind"];
export type Rating = "up" | "down";
export type DownReason =
  | "wrong_tool"
  | "too_long"
  | "too_formal"
  | "missed_info"
  | "wrong_action"
  | "other";

export type TrainEvent =
  | {
      id: string;
      ts: number;
      kind: "response";
      input: string;
      tools: ToolName[];
      replyLen: number;
      hasBullets: boolean;
    }
  | { id: string; ts: number; kind: "rating"; input: string; tools: ToolName[]; rating: Rating; reason?: DownReason }
  | { id: string; ts: number; kind: "confirmation"; mutation: MutationKind; decision: "yes" | "no" }
  | { id: string; ts: number; kind: "auto_exec"; mutation: MutationKind };

export type LearnedRules = {
  /** Token → tools sugeridas (sinal positivo acumulado). */
  toolHints: Record<string, Partial<Record<ToolName, number>>>;
  /** Instruções de tom derivadas (concatenadas no system prompt). */
  toneInstructions: string[];
  /** Mutações que podem ser auto-executadas (usuário confirma sempre). */
  autoConfirmKinds: MutationKind[];
  /** Estatística para o painel. */
  stats: {
    responses: number;
    ratingsUp: number;
    ratingsDown: number;
    confirmYes: Partial<Record<MutationKind, number>>;
    confirmNo: Partial<Record<MutationKind, number>>;
    autoExec: Partial<Record<MutationKind, number>>;
    lastCycleAt?: number;
  };
};

const EMPTY_RULES: LearnedRules = {
  toolHints: {},
  toneInstructions: [],
  autoConfirmKinds: [],
  stats: { responses: 0, ratingsUp: 0, ratingsDown: 0, confirmYes: {}, confirmNo: {}, autoExec: {} },
};

/* ============ storage ============ */

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function safeWrite(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* quota */
  }
}

function readEvents(): TrainEvent[] {
  return safeRead<TrainEvent[]>(KEY_EVENTS, []);
}
function writeEvents(events: TrainEvent[]) {
  const cutoff = Date.now() - EVENT_TTL_MS;
  const trimmed = events.filter((e) => e.ts >= cutoff).slice(-MAX_EVENTS);
  safeWrite(KEY_EVENTS, trimmed);
}

function readRules(): LearnedRules {
  return safeRead<LearnedRules>(KEY_RULES, EMPTY_RULES);
}
function writeRules(rules: LearnedRules) {
  safeWrite(KEY_RULES, rules);
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ============ flag ============ */

export function isTrainingEnabled(): boolean {
  if (typeof window === "undefined") return true; // default ON
  const raw = window.localStorage.getItem(KEY_FLAG);
  return raw === null ? true : raw === "1";
}
export function setTrainingEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_FLAG, on ? "1" : "0");
  window.dispatchEvent(new CustomEvent(EVT));
}

/* ============ tokenização leve ============ */

const STOP = new Set([
  "a","o","as","os","de","do","da","dos","das","e","ou","um","uma","uns","umas",
  "no","na","nos","nas","em","com","para","por","que","se","eu","tu","ele","ela",
  "voce","você","meu","minha","meus","minhas","esse","essa","isso","aquilo",
  "aqui","ali","la","lá","mais","muito","só","ja","já","ser","ter","fazer",
  "sim","não","nao","ok","quem","como","quando","onde","porque","pode","podem",
  "vai","vou","vamos","te","tu","tudo","nada","mas","entao","então",
]);
function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .slice(0, 24);
}

/* ============ API pública ============ */

export function recordResponse(input: {
  userInput: string;
  tools: ToolName[];
  reply: string;
}) {
  if (!isTrainingEnabled()) return;
  const ev: TrainEvent = {
    id: uid("resp"),
    ts: Date.now(),
    kind: "response",
    input: input.userInput.slice(0, 280),
    tools: input.tools,
    replyLen: input.reply.length,
    hasBullets: /\n\s*[•\-*]/.test(input.reply),
  };
  const events = readEvents();
  events.push(ev);
  writeEvents(events);
}

export function recordRating(input: {
  userInput: string;
  tools: ToolName[];
  rating: Rating;
  reason?: DownReason;
}) {
  if (!isTrainingEnabled()) return;
  const ev: TrainEvent = {
    id: uid("rate"),
    ts: Date.now(),
    kind: "rating",
    input: input.userInput.slice(0, 280),
    tools: input.tools,
    rating: input.rating,
    reason: input.reason,
  };
  const events = readEvents();
  events.push(ev);
  writeEvents(events);
  // re-derive imediatamente para refletir no próximo turno
  runTrainingCycle();
}

export function recordConfirmation(mutation: MutationKind, decision: "yes" | "no") {
  if (!isTrainingEnabled()) return;
  const events = readEvents();
  events.push({ id: uid("conf"), ts: Date.now(), kind: "confirmation", mutation, decision });
  writeEvents(events);
  runTrainingCycle();
}

export function recordAutoExec(mutation: MutationKind) {
  if (!isTrainingEnabled()) return;
  const events = readEvents();
  events.push({ id: uid("auto"), ts: Date.now(), kind: "auto_exec", mutation });
  writeEvents(events);
}

/* ============ derivação ============ */

/** Recalcula `LearnedRules` a partir do log de eventos. Roda no background. */
export function runTrainingCycle(): LearnedRules {
  const events = readEvents();
  const rules: LearnedRules = {
    toolHints: {},
    toneInstructions: [],
    autoConfirmKinds: [],
    stats: { responses: 0, ratingsUp: 0, ratingsDown: 0, confirmYes: {}, confirmNo: {}, autoExec: {} },
  };

  // 1) tool hints — qualquer rating "up" reforça mapping token→tool;
  //    "down" com motivo wrong_tool penaliza.
  const tokenTool: Record<string, Partial<Record<ToolName, number>>> = {};
  // 2) tom
  let longDowns = 0;
  let formalDowns = 0;
  let bulletUps = 0;
  // 3) confirmações
  const confYes: Partial<Record<MutationKind, number>> = {};
  const confNo: Partial<Record<MutationKind, number>> = {};
  const autoExec: Partial<Record<MutationKind, number>> = {};

  for (const ev of events) {
    if (ev.kind === "response") rules.stats.responses++;
    if (ev.kind === "rating") {
      if (ev.rating === "up") rules.stats.ratingsUp++;
      else rules.stats.ratingsDown++;
      const weight = ev.rating === "up" ? 1 : -1;
      for (const tk of tokens(ev.input)) {
        const bag = (tokenTool[tk] ??= {});
        for (const t of ev.tools) {
          if (ev.rating === "down" && ev.reason !== "wrong_tool") continue;
          bag[t] = (bag[t] ?? 0) + weight;
        }
      }
      if (ev.rating === "down") {
        if (ev.reason === "too_long") longDowns++;
        else if (ev.reason === "too_formal") formalDowns++;
      }
      if (ev.rating === "up") {
        // se input recente tinha bullets, conta
        const lastResp = [...events].reverse().find((e) => e.kind === "response" && e.input === ev.input);
        if (lastResp && lastResp.kind === "response" && lastResp.hasBullets) bulletUps++;
      }
    }
    if (ev.kind === "confirmation") {
      const bag = ev.decision === "yes" ? confYes : confNo;
      bag[ev.mutation] = (bag[ev.mutation] ?? 0) + 1;
    }
    if (ev.kind === "auto_exec") {
      autoExec[ev.mutation] = (autoExec[ev.mutation] ?? 0) + 1;
    }
  }

  // tool hints: mantém só os com peso positivo >=2
  for (const [tk, bag] of Object.entries(tokenTool)) {
    const filtered = Object.fromEntries(
      Object.entries(bag).filter(([, w]) => (w ?? 0) >= 2),
    ) as Partial<Record<ToolName, number>>;
    if (Object.keys(filtered).length) rules.toolHints[tk] = filtered;
  }

  // tom
  if (longDowns >= 2) rules.toneInstructions.push("Responda de forma BEM curta (1-2 linhas). Usuário rejeita respostas longas.");
  if (formalDowns >= 2) rules.toneInstructions.push("Use tom informal e direto, sem formalidades.");
  if (bulletUps >= 3) rules.toneInstructions.push("Quando listar várias coisas, prefira bullets curtos.");

  // auto-confirm: yes >=5 e ratio yes/(yes+no) >= 0.9
  const allKinds = new Set<MutationKind>([...Object.keys(confYes), ...Object.keys(confNo)] as MutationKind[]);
  for (const k of allKinds) {
    const y = confYes[k] ?? 0;
    const n = confNo[k] ?? 0;
    if (y >= 5 && y / (y + n) >= 0.9) rules.autoConfirmKinds.push(k);
  }

  rules.stats.confirmYes = confYes;
  rules.stats.confirmNo = confNo;
  rules.stats.autoExec = autoExec;
  rules.stats.lastCycleAt = Date.now();

  writeRules(rules);
  return rules;
}

/* ============ consumo (orchestrator / chat) ============ */

export function getLearnedRules(): LearnedRules {
  return readRules();
}

/** Sugere tools extras baseado em tokens do input. */
export function getToolHintsFor(userInput: string): ToolName[] {
  const rules = readRules();
  const counts: Partial<Record<ToolName, number>> = {};
  for (const tk of tokens(userInput)) {
    const bag = rules.toolHints[tk];
    if (!bag) continue;
    for (const [tool, w] of Object.entries(bag)) {
      counts[tool as ToolName] = (counts[tool as ToolName] ?? 0) + (w ?? 0);
    }
  }
  return Object.entries(counts)
    .filter(([, w]) => (w ?? 0) >= 2)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 2)
    .map(([t]) => t as ToolName);
}

export function getToneContext(): string {
  const rules = readRules();
  if (!rules.toneInstructions.length) return "";
  return `=== TOM APRENDIDO ===\n${rules.toneInstructions.map((s) => `- ${s}`).join("\n")}`;
}

export function shouldAutoConfirm(kind: MutationKind): boolean {
  return readRules().autoConfirmKinds.includes(kind);
}

/* ============ admin ============ */

export function clearTraining() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY_EVENTS);
  window.localStorage.removeItem(KEY_RULES);
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useTrainingRules() {
  const [rules, setRules] = useState<LearnedRules>(EMPTY_RULES);
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    const refresh = () => {
      setRules(readRules());
      setEnabled(isTrainingEnabled());
    };
    refresh();
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return { rules, enabled };
}

/** Hook montado no AppShell: roda cycle a cada 90s. */
export function useHermesTraining() {
  useEffect(() => {
    if (!isTrainingEnabled()) return;
    runTrainingCycle();
    const id = window.setInterval(() => {
      if (isTrainingEnabled()) runTrainingCycle();
    }, 90_000);
    return () => window.clearInterval(id);
  }, []);
}
