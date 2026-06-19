import type { AgentConfig, AgentsConfig } from "@/lib/agent-store";
import type { AgentAction, AgentResult, ChatMsg } from "@/lib/agent";
import { routeSegments, type RouteTarget, type Segment } from "./router";
import { runAgenda } from "./agenda-agent";
import { runTimer } from "./timer-agent";
import { runHome } from "./home-agent";
import { callLlm } from "./llm";
import { executeToolChain, type PendingMutation } from "@/lib/hermes/tools/tool-executor";
import type { ToolRequest } from "@/lib/hermes/tools/tool-router";

export type RoutedAction = AgentAction & { _target: RouteTarget };

export type OrchestratorResult = AgentResult & {
  segments: Segment[];
  routed: RoutedAction[];
  toolUsed?: ToolRequest["tool"];
  toolsUsed?: ToolRequest["tool"][];
  pending?: PendingMutation;
};

/**
 * Monta uma resposta agrupada (Tarefas / Lista / Ideias / Agenda / Timer)
 * a partir das ações roteadas, mantendo os chips/badges atuais intactos.
 */
function formatGroupedReply(actions: RoutedAction[]): string {
  if (actions.length === 0) return "Pronto.";
  const tasks: string[] = [];
  const lists: { title: string; items: string[] }[] = [];
  const notes: string[] = [];
  const blocks: string[] = [];
  const timers: string[] = [];

  for (const a of actions) {
    if (a.type === "create_task") tasks.push(a.title);
    else if (a.type === "create_list") lists.push({ title: a.title, items: a.items });
    else if (a.type === "create_note") notes.push(a.title);
    else if (a.type === "create_block") blocks.push(`${a.time} · ${a.title}`);
    else if (a.type === "start_timer") timers.push(`${a.minutes}min${a.title ? ` · ${a.title}` : ""}`);
  }

  const sections: string[] = [];
  if (tasks.length) sections.push(`Tarefas:\n${tasks.map((t) => `• ${t}`).join("\n")}`);
  for (const l of lists) {
    sections.push(`${l.title}:\n${l.items.map((i) => `• ${i}`).join("\n")}`);
  }
  if (notes.length) sections.push(`Ideias:\n${notes.map((n) => `• ${n}`).join("\n")}`);
  if (blocks.length) sections.push(`Agenda:\n${blocks.map((b) => `• ${b}`).join("\n")}`);
  if (timers.length) sections.push(`Timer:\n${timers.map((t) => `• ${t}`).join("\n")}`);

  return sections.join("\n\n");
}

async function chatReply(
  config: AgentConfig,
  history: ChatMsg[],
  profileContext?: string,
): Promise<{
  reply: string;
  toolUsed?: ToolRequest["tool"];
  toolsUsed?: ToolRequest["tool"][];
  pending?: PendingMutation;
}> {
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content?.trim() ?? "";
  let toolContext = "";
  let toolUsed: ToolRequest["tool"] | undefined;
  let toolsUsed: ToolRequest["tool"][] | undefined;
  let pending: PendingMutation | undefined;
  if (lastUser) {
    try {
      const chain = await executeToolChain(lastUser);
      if (chain.length) {
        toolUsed = chain[0].request.tool;
        toolsUsed = chain.map((c) => c.request.tool);
        pending = chain[0].pending;
        const blocks = chain
          .map((c) => `--- ${c.request.tool} ---\n${c.context}`)
          .join("\n");
        toolContext = `\n\n=== CONTEXTO DE FERRAMENTAS ===\n${blocks}\nUse esses dados reais na resposta. Não invente números. Se alguma ferramenta falhou, diga isso ao usuário.`;
      }
    } catch {
      // tool falhou — segue só com chat normal
    }
  }
  const system = `Você é Hermes, assistente de produtividade do FocusMind (PT-BR). Responda de forma curta, amigável e útil. Não invente ações.${profileContext ? `\n\n${profileContext.trim()}` : ""}${toolContext}`;
  const reply = await callLlm(config, system, history, { temperature: 0.6 });
  return { reply, toolUsed, toolsUsed, pending };
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
  let toolUsed: ToolRequest["tool"] | undefined;
  let toolsUsed: ToolRequest["tool"][] | undefined;
  let pending: PendingMutation | undefined;
  if (hasChat || onlyChat) {
    try {
      const r = await chatReply(config, history, profileContext);
      reply = r.reply;
      toolUsed = r.toolUsed;
      toolsUsed = r.toolsUsed;
      pending = r.pending;
    } catch {
      reply = onlyChat ? "Não consegui detectar uma ação." : "";
    }
  } else {
    reply = formatGroupedReply(grouped);
  }

  return {
    reply,
    actions: grouped.map(({ _target: _t, ...a }) => a as AgentAction),
    segments,
    routed: grouped,
    toolUsed,
    toolsUsed,
    pending,
  };
}
