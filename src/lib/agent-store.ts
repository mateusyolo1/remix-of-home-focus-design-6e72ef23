import { useEffect, useState } from "react";

export type AgentProvider = "gemini" | "deepseek";

export type AgentConfig = {
  provider: AgentProvider;
  model: string;
  geminiKey: string;
  deepseekKey: string;
};

export const DEFAULT_AGENT: AgentConfig = {
  provider: "gemini",
  model: "gemini-2.5-flash",
  geminiKey: "",
  deepseekKey: "",
};

export const MODEL_OPTIONS: Record<AgentProvider, { value: string; label: string }[]> = {
  gemini: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat (V3/V4)" },
    { value: "deepseek-reasoner", label: "DeepSeek Reasoner (Pro)" },
  ],
};

const KEY = "fm.agent";
const EVT = "fm:agent";

function read(): AgentConfig {
  if (typeof window === "undefined") return DEFAULT_AGENT;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_AGENT, ...JSON.parse(raw) } : DEFAULT_AGENT;
  } catch {
    return DEFAULT_AGENT;
  }
}

function write(v: AgentConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useAgentConfig(): [AgentConfig, (v: AgentConfig) => void] {
  const [val, setVal] = useState<AgentConfig>(() => read());
  useEffect(() => {
    const on = () => setVal(read());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(EVT, on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return [val, (v) => write(v)];
}

export function getAgentConfig(): AgentConfig {
  return read();
}
