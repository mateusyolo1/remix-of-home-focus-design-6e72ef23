import { useEffect, useState } from "react";

export type AgentProvider = "gemini" | "deepseek";

export type SubAgentConfig = {
  enabled: boolean;
  prompt: string;
  keywords: string;
};

export type AgentsConfig = {
  agenda: SubAgentConfig;
  timer: SubAgentConfig;
  home: SubAgentConfig;
};

export type AgentConfig = {
  provider: AgentProvider;
  model: string;
  geminiKey: string;
  deepseekKey: string;
  agents: AgentsConfig;
};

export const DEFAULT_AGENTS: AgentsConfig = {
  agenda: {
    enabled: true,
    prompt: "",
    keywords: "reunião, compromisso, agendar, marcar, às, horário",
  },
  timer: {
    enabled: true,
    prompt: "",
    keywords: "foco, pomodoro, cronômetro, descanso, minutos",
  },
  home: {
    enabled: true,
    prompt: "",
    keywords: "tarefa, lembrar, comprar, anotar, ideia, lista",
  },
};

export const DEFAULT_AGENT: AgentConfig = {
  provider: "gemini",
  model: "gemini-2.5-flash",
  geminiKey: "",
  deepseekKey: "",
  agents: DEFAULT_AGENTS,
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

function mergeAgents(input: Partial<AgentsConfig> | undefined): AgentsConfig {
  return {
    agenda: { ...DEFAULT_AGENTS.agenda, ...(input?.agenda ?? {}) },
    timer: { ...DEFAULT_AGENTS.timer, ...(input?.timer ?? {}) },
    home: { ...DEFAULT_AGENTS.home, ...(input?.home ?? {}) },
  };
}

function read(): AgentConfig {
  if (typeof window === "undefined") return DEFAULT_AGENT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_AGENT;
    const parsed = JSON.parse(raw) as Partial<AgentConfig>;
    return {
      ...DEFAULT_AGENT,
      ...parsed,
      agents: mergeAgents(parsed.agents),
    };
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
  const [val, setVal] = useState<AgentConfig>(DEFAULT_AGENT);
  useEffect(() => {
    setVal(read());
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
