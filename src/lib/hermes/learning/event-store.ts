/**
 * Hermes Learning Loop — Observe (event store).
 *
 * Armazena eventos do app em localStorage. Limite circular de MAX eventos
 * para não inflar storage. Quando a feature flag está OFF, recordEvent()
 * vira no-op silencioso (não grava, não dispara listeners).
 */

import { useEffect, useState } from "react";
import type { HermesEvent, HermesEventType, HermesEntityType } from "./types";
import { hid, isLearningLoopEnabled, sanitize } from "./flag";

const KEY = "fm.hermes.events";
const EVT = "fm:hermes:events";
const MAX = 500;

function read(): HermesEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HermesEvent[]) : [];
  } catch {
    return [];
  }
}

function write(events: HermesEvent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX)));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* quota — drop silently */
  }
}

export type RecordEventInput = {
  type: HermesEventType;
  entityId?: string;
  entityType?: HermesEntityType;
  before?: unknown;
  after?: unknown;
  note?: string;
};

export function recordEvent(input: RecordEventInput): HermesEvent | null {
  if (!isLearningLoopEnabled()) return null;
  const e: HermesEvent = {
    id: hid("evt"),
    type: input.type,
    entityId: input.entityId,
    entityType: input.entityType,
    before: sanitize(input.before),
    after: sanitize(input.after),
    note: input.note,
    createdAt: Date.now(),
  };
  const events = read();
  events.push(e);
  write(events);
  return e;
}

export function listEvents(): HermesEvent[] {
  return read();
}

export function clearEvents() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useHermesEvents() {
  const [events, setEvents] = useState<HermesEvent[]>([]);
  useEffect(() => {
    setEvents(read());
    const refresh = () => setEvents(read());
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return { events, clear: clearEvents };
}
