import type { AgentConfig, SubAgentConfig } from "@/lib/agent-store";
import type { AgentAction } from "@/lib/agent";
import { callLlm, parseJson } from "./llm";

const BASE = `Você é o AGENTE TIMER do FocusMind (PT-BR). Sua ÚNICA ferramenta é iniciar cronômetros de foco.

Responda APENAS JSON puro:
{"actions":[{"type":"start_timer","minutes":25,"title":"Foco"?}]}

Regras:
- "pomodoro" padrão = 25 min.
- "descanso curto" = 5 min, "descanso longo" = 15 min.
- Se o usuário não disser duração, infira do contexto/dossiê (padrão 25 min).
- Sempre 1 timer por segmento. Se o pedido não envolver foco/tempo, retorne {"actions":[]}.`;

export async function runTimer(
  config: AgentConfig,
  segmentText: string,
  sub: SubAgentConfig,
  profileContext?: string,
): Promise<AgentAction[]> {
  const system = `${BASE}${profileContext ? `\n\n${profileContext.trim()}` : ""}${sub.prompt.trim() ? `\n\nInstruções pessoais do usuário para este agente:\n${sub.prompt.trim()}` : ""}`;
  const text = await callLlm(config, system, [{ role: "user", content: segmentText }], {
    jsonObject: true,
  });
  const parsed = parseJson<{ actions?: AgentAction[] }>(text);
  const actions = Array.isArray(parsed?.actions) ? parsed!.actions : [];
  return actions.filter((a) => a.type === "start_timer");
}
