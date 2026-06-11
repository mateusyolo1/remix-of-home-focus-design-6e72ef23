/**
 * Hermes Learning Loop — Log (action log).
 *
 * Registra todas as ações que o agente executa (ou tenta executar) para
 * que o usuário consiga auditar. Independente do event-store: eventos são
 * mudanças observadas no app, logs são tentativas do agente.
 */

import { useEffect, useState } from "react";
import type { HermesActionLog, HermesActionStatus } from "./types";
import { hid, isLearningLoopEnabled } from "./flag";

const KEY = "fm.hermes.action-log";
const EVT = "fm:hermes:action-log";
const MAX = 300;

function read(): HermesActionLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HermesActionLog[]) : [];
  } catch {
    return [];
  }
}

function write(logs: HermesActionLog[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(logs.slice(-MAX)));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* drop on quota */
  }
}

export type LogActionInput = {
  planId?: string;
  actionType: string;
  status: HermesActionStatus;
  entityId?: string;
  error?: string;
  summary?: string;
};

export function logAction(input: LogActionInput): HermesActionLog | null {
  if (!isLearningLoopEnabled()) return null;
  const entry: HermesActionLog = {
    id: hid("log"),
    planId: input.planId,
    actionType: input.actionType,
    status: input.status,
    entityId: input.entityId,
    error: input.error,
    summary: input.summary,
    createdAt: Date.now(),
  };
  const logs = read();
  logs.push(entry);
  write(logs);
  return entry;
}

export function listActionLogs(): HermesActionLog[] {
  return read();
}

export function clearActionLogs() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useActionLogs() {
  const [logs, setLogs] = useState<HermesActionLog[]>([]);
  useEffect(() => {
    setLogs(read());
    const refresh = () => setLogs(read());
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return { logs, clear: clearActionLogs };
}
