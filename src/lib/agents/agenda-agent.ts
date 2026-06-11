import type { AgentConfig, SubAgentConfig } from "@/lib/agent-store";
import type { AgentAction } from "@/lib/agent";
import { callLlm, parseJson, todayIso } from "./llm";

const BASE = `Você é o AGENTE AGENDA do FocusMind (PT-BR). Sua ÚNICA ferramenta é criar BLOCOS de agenda.

Responda APENAS JSON puro:
{"actions":[{"type":"create_block","time":"HH:MM","title":"...","tag":"Foco|Reunião|Pausa|Ritual","date":"YYYY-MM-DD"?,"notes":"..."?}]}

Regras:
- Datas relativas ("amanhã", "sexta", "daqui 2 dias") → calcule a data ISO.
- Se não houver hora explícita, escolha uma plausível com base no dossiê do usuário.
- Respeite a escala de trabalho: NÃO agende em dias de folga.
- Se o pedido não couber em agenda, retorne {"actions":[]}.`;

export async function runAgenda(
  config: AgentConfig,
  segmentText: string,
  sub: SubAgentConfig,
  profileContext?: string,
): Promise<AgentAction[]> {
  const system = `${BASE}\n\nHoje é ${todayIso()}.${profileContext ? `\n\n${profileContext.trim()}` : ""}${sub.prompt.trim() ? `\n\nInstruções pessoais do usuário para este agente:\n${sub.prompt.trim()}` : ""}`;
  const text = await callLlm(config, system, [{ role: "user", content: segmentText }], {
    jsonObject: true,
  });
  const parsed = parseJson<{ actions?: AgentAction[] }>(text);
  const actions = Array.isArray(parsed?.actions) ? parsed!.actions : [];
  return actions.filter((a) => a.type === "create_block");
}
