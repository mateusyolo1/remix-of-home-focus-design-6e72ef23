import type { AgentConfig, AgentsConfig } from "@/lib/agent-store";
import type { AgentAction, AgentResult, ChatMsg } from "@/lib/agent";
import { routeSegments, type RouteTarget, type Segment } from "./router";
import { runAgenda } from "./agenda-agent";
import { runTimer } from "./timer-agent";
import { runHome } from "./home-agent";
import { callLlm } from "./llm";

export type RoutedAction = AgentAction & { _target: RouteTarget };

export type OrchestratorResult = AgentResult & {
  segments: Segment[];
  routed: RoutedAction[];
};

async function chatReply(
  config: AgentConfig,
  history: ChatMsg[],
  profileContext?: string,
): Promise<string> {
  const system = `Você é Hermes, assistente de produtividade do FocusMind (PT-BR). Responda de forma curta, amigável e útil. Não invente ações.${profileContext ? `\n\n${profileContext.trim()}` : ""}`;
  return await callLlm(config, system, history, { temperature: 0.6 });
}

export async function runOrchestrator(
  config: AgentConfig,
  agents: AgentsConfig,
  history: ChatMsg[],
  profileContext?: string,
): Promise<OrchestratorResult> {
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content?.trim() ?? "";
  if (!lastUser) return { reply: "", actions: [], segments: [], routed: [] };

  const segments = await routeSegments(
    config,
    lastUser,
    { agenda: agents.agenda, timer: agents.timer, home: agents.home },
    profileContext,
  );

  const tasks = segments.map(async (seg): Promise<RoutedAction[]> => {
    if (seg.target === "agenda" && agents.agenda.enabled) {
      const list = await runAgenda(config, seg.text, agents.agenda, profileContext);
      return list.map((a) => ({ ...a, _target: "agenda" as const }));
    }
    if (seg.target === "timer" && agents.timer.enabled) {
      const list = await runTimer(config, seg.text, agents.timer, profileContext);
      return list.map((a) => ({ ...a, _target: "timer" as const }));
    }
    if (seg.target === "home" && agents.home.enabled) {
      const list = await runHome(config, seg.text, agents.home, profileContext);
      return list.map((a) => ({ ...a, _target: "home" as const }));
    }
    return [];
  });

  const grouped = (await Promise.all(tasks)).flat();
  const hasChat = segments.some((s) => s.target === "chat");
  const onlyChat = grouped.length === 0;

  let reply = "";
  if (hasChat || onlyChat) {
    try {
      reply = await chatReply(config, history, profileContext);
    } catch {
      reply = onlyChat ? "Não consegui detectar uma ação." : "";
    }
  } else {
    const counts = grouped.reduce<Record<string, number>>((acc, a) => {
      const k = a._target;
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    const parts: string[] = [];
    if (counts.agenda) parts.push(`Agenda · ${counts.agenda}`);
    if (counts.timer) parts.push(`Timer · ${counts.timer}`);
    if (counts.home) parts.push(`Home · ${counts.home}`);
    reply = `Pronto · ${parts.join("  ·  ")}`;
  }

  return {
    reply,
    actions: grouped.map(({ _target: _t, ...a }) => a as AgentAction),
    segments,
    routed: grouped,
  };
}
