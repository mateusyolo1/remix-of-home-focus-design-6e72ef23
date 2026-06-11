import { useEffect, useState } from "react";
import type { HermesConnectionMode, HermesInstallStatus } from "./hermes-status";

export type HermesAgentConfig = {
  enabled: boolean;
  installStatus: HermesInstallStatus;
  connectionMode: HermesConnectionMode;
  bridgeUrl?: string;
  remoteApiUrl?: string;
  modelName?: string;
  useLocalFallback: boolean;
  lastDoctorOutput?: string;
  lastConnectionTest?: string;
  lastError?: string;
  updatedAt: string;
};

const KEY = "hermes.agent_config";
const EVT = "hermes:config";

export const DEFAULT_HERMES_CONFIG: HermesAgentConfig = {
  enabled: false,
  installStatus: "not_installed",
  connectionMode: "local_fallback",
  useLocalFallback: true,
  updatedAt: new Date(0).toISOString(),
};

export function getHermesConfig(): HermesAgentConfig {
  if (typeof window === "undefined") return DEFAULT_HERMES_CONFIG;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_HERMES_CONFIG;
    return { ...DEFAULT_HERMES_CONFIG, ...JSON.parse(raw) };
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
