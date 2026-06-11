import type { AgentConfig, SubAgentConfig } from "@/lib/agent-store";
import type { AgentAction } from "@/lib/agent";
import { callLlm, parseJson } from "./llm";

const BASE = `Você é o AGENTE HOME do FocusMind (PT-BR). Suas ferramentas: tarefas, listas e notas livres.

Responda APENAS JSON puro:
{"actions":[ ...uma ou mais ações... ]}

Ações:
1) {"type":"create_task","title":"...","blockTime":"HH:MM"?}  — tarefa única acionável.
2) {"type":"create_list","title":"...","items":["..."]}  — checklist (compras, mercado, itens).
3) {"type":"create_note","title":"...","body":"...","ttlDays":7}  — anotação, pensamento, ideia.

Diferenciação:
- "lista / compras / mercado / itens" → create_list
- "anotar / ideia / pensamento / lembrar de uma reflexão" → create_note
- "fazer / lembrar de fazer X" → create_task

Se o pedido não couber em nenhuma dessas, retorne {"actions":[]}.`;

export async function runHome(
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
  return actions.filter(
    (a) => a.type === "create_task" || a.type === "create_list" || a.type === "create_note",
  );
}
