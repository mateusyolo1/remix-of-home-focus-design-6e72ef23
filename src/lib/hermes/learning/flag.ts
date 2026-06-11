/**
 * Hermes Learning Loop — feature flag helpers.
 *
 * Tudo que pertence ao loop deve passar por isEnabled() antes de gravar
 * em localStorage ou disparar efeitos. Quando OFF, os módulos viram no-op.
 */

import { useEffect, useState } from "react";

const KEY = "fm.app-settings";
const EVT = "fm:app-settings";

type StoredSettings = { hermesLearningLoopEnabled?: boolean };

function readFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as StoredSettings;
    return Boolean(parsed.hermesLearningLoopEnabled);
  } catch {
    return false;
  }
}

export function isLearningLoopEnabled(): boolean {
  return readFlag();
}

export function useLearningLoopEnabled(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(readFlag());
    const refresh = () => setOn(readFlag());
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return on;
}

/** Identificador curto pra eventos/memórias/logs. */
export function hid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Sanitiza payloads antes de gravar em localStorage:
 * remove chaves que parecem sensíveis (token/apiKey/password/secret/auth).
 */
const SENSITIVE_RE = /(token|api[_-]?key|password|secret|authorization|bearer)/i;

export function sanitize<T>(value: T, depth = 0): T {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => sanitize(v, depth + 1)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_RE.test(k)) continue;
    out[k] = sanitize(v, depth + 1);
  }
  return out as T;
}
