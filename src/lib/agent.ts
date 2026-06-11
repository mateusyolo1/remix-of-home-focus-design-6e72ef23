import type { AgentConfig } from "./agent-store";
import { runOrchestrator, type OrchestratorResult, type RoutedAction } from "./agents/orchestrator";

export type AgentAction =
  | { type: "create_task"; title: string; blockTime?: string }
  | { type: "create_block"; time: string; title: string; tag?: string; date?: string; notes?: string }
  | { type: "create_note"; title: string; body?: string; ttlDays?: number }
  | { type: "create_list"; title: string; items: string[] }
  | { type: "start_timer"; minutes: number; title?: string };

export type AgentResult = { reply: string; actions: AgentAction[] };

export type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

export type { RoutedAction };

export async function runAgent(
  config: AgentConfig,
  messages: ChatMsg[],
  profileContext?: string,
): Promise<OrchestratorResult> {
  return runOrchestrator(config, config.agents, messages, profileContext);
}
