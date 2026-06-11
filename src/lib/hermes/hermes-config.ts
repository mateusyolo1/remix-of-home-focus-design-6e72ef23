import { useEffect, useState } from "react";

// Modo de conexão simplificado: token e URL da VPS vivem no servidor (secrets).
// O cliente só guarda preferências de UI e, opcionalmente, a URL da bridge local.
export type HermesConnectionMode = "remote_api" | "local_bridge" | "local_fallback";

export const CONNECTION_MODE_LABEL: Record<HermesConnectionMode, string> = {
  remote_api: "API remota (recomendado)",
  local_bridge: "Bridge local (avançado)",
  local_fallback: "Apenas fallback local",
};

export type HermesAgentConfig = {
  enabled: boolean;
  connectionMode: HermesConnectionMode;
  bridgeUrl?: string; // só usado quando connectionMode === "local_bridge"
  useLocalFallback: boolean;
  lastConnectionTest?: string;
  lastError?: string;
  updatedAt: string;
};

const KEY = "hermes.agent_config";
const EVT = "hermes:config";

export const DEFAULT_HERMES_CONFIG: HermesAgentConfig = {
  enabled: false,
  connectionMode: "remote_api",
  useLocalFallback: true,
  updatedAt: new Date(0).toISOString(),
};

export function getHermesConfig(): HermesAgentConfig {
  if (typeof window === "undefined") return DEFAULT_HERMES_CONFIG;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_HERMES_CONFIG;
    const parsed = JSON.parse(raw) as Partial<HermesAgentConfig>;
    // Migração: modos antigos viram remote_api / local_fallback
    const legacy = parsed.connectionMode as string | undefined;
    const mode: HermesConnectionMode =
      legacy === "local_bridge" || legacy === "remote_api" || legacy === "local_fallback"
        ? legacy
        : "remote_api";
    return { ...DEFAULT_HERMES_CONFIG, ...parsed, connectionMode: mode };
  } catch {
    return DEFAULT_HERMES_CONFIG;
  }
}

export function setHermesConfig(config: HermesAgentConfig) {
  if (typeof window === "undefined") return;
  const next = { ...config, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function resetHermesConfig() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useHermesConfig(): [HermesAgentConfig, (patch: Partial<HermesAgentConfig>) => void, () => void] {
  const [val, setVal] = useState<HermesAgentConfig>(DEFAULT_HERMES_CONFIG);
  useEffect(() => {
    setVal(getHermesConfig());
    const on = () => setVal(getHermesConfig());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(EVT, on);
      window.removeEventListener("storage", on);
    };
  }, []);
  const update = (patch: Partial<HermesAgentConfig>) => setHermesConfig({ ...getHermesConfig(), ...patch });
  return [val, update, resetHermesConfig];
}
