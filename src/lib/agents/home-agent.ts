import type { AgentConfig, SubAgentConfig } from "@/lib/agent-store";
import type { AgentAction } from "@/lib/agent";
import { callLlm, parseJson } from "./llm";

const BASE = `Você é o AGENTE HOME do FocusMind (PT-BR). Suas ferramentas: tarefas, listas e notas livres.

Responda APENAS JSON puro:
{"actions":[ ...uma ou mais ações... ]}

Ações:
1) {"type":"create_task","title":"...","tag":"trabalho|estudo|saude|casa|pessoal|outro","important":true|false?,"blockTime":"HH:MM"?}  — tarefa única acionável.
2) {"type":"create_list","title":"...","tag":"trabalho|estudo|saude|casa|pessoal|outro","items":["..."]}  — checklist (compras, mercado, itens).
3) {"type":"create_note","title":"...","body":"...","ttlDays":7}  — anotação, pensamento, ideia.

REGRAS DE TAG (obrigatório para create_task e create_list, escolha 1):
- "trabalho": reuniões, projetos, entregas, e-mail profissional, código, design, clientes.
- "estudo": leitura, curso, prova, anotações de aula, prática de skill.
- "saude": exercício, consulta médica, remédios, hidratar, dormir, meditação.
- "casa": limpeza, conserto, contas, supermercado, feira, mercado, comida.
- "pessoal": família, amigos, hobbies, lazer, presentes, viagens.
- "outro": só quando realmente não couber em nenhuma das anteriores.

REGRAS DE LISTAS DISTINTAS (CRÍTICO):
- Se o usuário misturar itens de contextos diferentes (ex.: "comprar leite e pão; revisar PR do João; ler capítulo 3"),
  DIVIDA em múltiplas listas/tarefas separadas — uma create_list por contexto.
- Exemplo: "preciso comprar arroz, feijão, tomate e também revisar o relatório e ligar pro dentista"
  → 3 ações: create_list (Compras do mês, tag=casa, items=[arroz,feijão,tomate]),
              create_task (Revisar relatório, tag=trabalho),
              create_task (Ligar pro dentista, tag=saude).
- NUNCA junte itens de trabalho com compras na mesma lista.

Importância:
- Marque "important": true quando o usuário sinalizar urgência ("urgente", "importante", "prioritário", "não posso esquecer").

Diferenciação:
- "lista / compras / mercado / itens / feira" → create_list
- "anotar / ideia / pensamento / lembrar de uma reflexão" → create_note
- "fazer / lembrar de fazer X" → create_task

Se o pedido não couber em nenhuma dessas, retorne {"actions":[]}.`;

const VALID_TAGS = ["trabalho", "estudo", "saude", "casa", "pessoal", "outro"] as const;
type ValidTag = (typeof VALID_TAGS)[number];

function normalizeTag(v: unknown): ValidTag | undefined {
  if (typeof v !== "string") return undefined;
  const lower = v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return (VALID_TAGS as readonly string[]).includes(lower) ? (lower as ValidTag) : undefined;
}

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
  return actions
    .filter((a) => a.type === "create_task" || a.type === "create_list" || a.type === "create_note")
    .map((a) => {
      if (a.type === "create_task" || a.type === "create_list") {
        const tag = normalizeTag((a as { tag?: unknown }).tag);
        return { ...a, tag } as AgentAction;
      }
      return a;
    });
}
