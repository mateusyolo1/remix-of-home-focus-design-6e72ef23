import type { AgentConfig, SubAgentConfig } from "@/lib/agent-store";
import type { AgentAction } from "@/lib/agent";
import { buildAgentContext } from "@/lib/hermes/agent-core";
import { callLlm, parseJson } from "./llm";

const BASE = `Você é o AGENTE HOME do FocusMind (PT-BR).
Sua única função é EXTRAIR FIELMENTE o que o usuário disse e converter em ações atômicas.
Você NÃO é um planejador. Você NÃO inventa nada. Você NÃO expande ideias. Você NÃO agrupa coisas.

Responda APENAS JSON puro:
{"actions":[ ...uma ou mais ações... ]}

Ações disponíveis:
1) {"type":"create_task","title":"...","tag":"trabalho|estudo|saude|casa|pessoal|outro","important":true|false?,"blockTime":"HH:MM"?,"scheduledFor":"YYYY-MM-DD"?,"dueAt":"ISO datetime"?,"reminderAt":"ISO datetime"?}
2) {"type":"create_list","title":"...","tag":"trabalho|estudo|saude|casa|pessoal|outro","items":["..."]}
3) {"type":"create_note","title":"...","body":"..."?,"ttlDays":7?}

=== REGRAS DE OURO (NÃO QUEBRE) ===

R1. EXTRAÇÃO FIEL
- Use APENAS conteúdo literalmente presente no texto do usuário.
- NUNCA invente categorias, subtarefas, hábitos, metas, prioridades ou itens.
- NUNCA crie listas como "Hábitos diários", "Prioridades da Semana", "Prioridades Pessoais", "Prioridades de Saúde", "Plano semanal" se essas listas (com itens concretos) não estiverem no texto.
- NUNCA escreva "Compras do mês" se o usuário não falou "mês". Para compras genéricas, use o título "Lista de compras".

R2. TAREFAS ATÔMICAS (uma ação prática = uma create_task)
- Cada verbo de ação no infinitivo / "tenho que" / "preciso" / "devo" / "vou fazer" / "lembrar de" vira UMA create_task separada.
- NUNCA junte duas tarefas em um título com vírgula, ponto-e-vírgula, " e ", "também", "além disso".
- NUNCA crie tarefa genérica do tipo "Organizar pendências" ou "Resolver tudo".
- Exemplo: "responder a mensagem do João, revisar o projeto e pagar a conta de energia"
  → 3 create_task:
     • "Responder mensagem do João" (tag=pessoal ou trabalho conforme contexto)
     • "Revisar o projeto" (trabalho)
     • "Pagar a conta de energia" (casa)

R3. COMPRAS = UMA LISTA ÚNICA
- Quando o usuário enumerar itens de mercado/geladeira/compras, crie UMA create_list com title="Lista de compras" e items=[exatamente os itens citados, na ordem].
- Inclua itens condicionais ("talvez também queijo e iogurte se o preço estiver bom") nos items.
- NUNCA divida compras em várias listas.
- NUNCA transforme itens de compra em create_task individuais (a menos que o usuário diga explicitamente "me lembre de comprar X").
- Itens devem ser substantivos curtos copiados do texto ("arroz", "ovos", "leite"), não frases.

R4. IDEIAS = NOTAS SEPARADAS (uma ideia conceitual = uma create_note)
- Gatilhos: "ideia", "pensei em", "imaginei", "talvez criar", "seria interessante", "quem sabe", "poderia".
- Cada ideia distinta vira UMA create_note com:
  • title: curto, no máximo 60 caracteres, no formato "Ideia: <resumo>".
  • body: frase ou parágrafo curto explicando a ideia em texto normal (NÃO repetir o título).
- NUNCA coloque a explicação inteira no title — o title é só o rótulo.
- NUNCA deixe body vazio quando a ideia tiver qualquer detalhe no texto original.
- NUNCA transforme uma ideia em create_list preenchida com itens inventados.
- NUNCA expanda uma ideia em sub-bullets que o usuário não disse.
- Exemplo: "pensei em criar um painel para hábitos, montar uma lista semanal de prioridades e testar um modo noturno"
  → 3 create_note:
     • {"type":"create_note","title":"Ideia: painel de hábitos","body":"Criar um painel simples para acompanhar hábitos."}
     • {"type":"create_note","title":"Ideia: prioridades semanais","body":"Montar uma lista semanal de prioridades."}
     • {"type":"create_note","title":"Ideia: modo noturno","body":"Testar um modo noturno mais confortável no aplicativo."}
  → NÃO criar create_list "Hábitos diários" nem "Prioridades da Semana".

R5. CLASSIFICAÇÃO POR INTENÇÃO
- "preciso / tenho que / devo / vou / lembrar de fazer" + ação concreta → create_task
- "comprar / mercado / geladeira / acabando / itens" + enumeração → create_list (Lista de compras)
- "ideia / pensei em / imaginei / talvez / seria interessante / poderia" → create_note
- Em dúvida entre tarefa e ideia: se o texto for especulativo/conceitual ("talvez", "quem sabe", "seria legal"), use create_note.
- Em dúvida entre lista e nota: use create_note, EXCETO quando houver itens concretos de compra/checklist explícitos.

R6. TAGS (obrigatório em create_task e create_list)
- "trabalho": reuniões, projetos, entregas, e-mail profissional, código, clientes.
- "estudo": leitura, curso, prova, anotações de aula.
- "saude": exercício, médico, remédios, dormir, meditação.
- "casa": limpeza, contas, supermercado, mercado, comida.
- "pessoal": família, amigos, hobbies, lazer, presentes, mensagens pessoais.
- "outro": só se nada se encaixar.

R7. IMPORTÂNCIA
- "important": true apenas se houver palavras claras de urgência ("urgente", "não posso esquecer", "prioritário", "antes de esquecer de novo").

R8. PRAZO, LEMBRETE E AGENDAMENTO (apenas em create_task)
- Quando o usuário disser horário/dia, preencha "dueAt" e/ou "reminderAt" no formato ISO 8601 com fuso local (ex.: "2026-06-11T18:00:00").
- SEMPRE que houver dia específico (hoje, amanhã, sexta, "dia 20", "próxima segunda"), preencha "scheduledFor" no formato "YYYY-MM-DD" para que a tarefa só apareça no dia certo no Home. Se não houver dia, omita scheduledFor (vira tarefa de hoje).
- Se também houver horário, preencha "blockTime" no formato "HH:MM" para vincular à agenda.
- "me lembra de pagar a conta às 18h" → reminderAt hoje às 18:00, blockTime="18:00".
- "amanhã às 9h preciso enviar o relatório" → scheduledFor=amanhã, blockTime="09:00", dueAt e reminderAt amanhã às 09:00.
- "sexta tenho consulta às 14h" → scheduledFor=sexta, blockTime="14:00", dueAt sexta 14:00.
- "daqui 30 minutos me lembra de beber água" → reminderAt = agora + 30min (calcule a partir do contexto se possível, senão omita).
- Se NÃO houver dia/horário claro, NÃO invente. Omita os campos.
- NUNCA preencha dueAt/reminderAt/scheduledFor em create_note ou create_list.

=== EXEMPLO COMPLETO DE EXTRAÇÃO FIEL ===

Entrada do usuário:
"Tenho que responder a mensagem do João, revisar o projeto do aplicativo e separar os arquivos da área de trabalho. Também preciso pagar a conta de energia. Preciso comprar arroz, ovos, leite, pão, café, banana, frango e detergente. Talvez também queijo e iogurte se o preço estiver bom. Pensei em criar um painel simples para acompanhar meus hábitos, montar uma lista semanal de prioridades e talvez testar um modo noturno mais confortável."

Saída CORRETA:
{"actions":[
  {"type":"create_task","title":"Responder mensagem do João","tag":"pessoal"},
  {"type":"create_task","title":"Revisar o projeto do aplicativo","tag":"trabalho"},
  {"type":"create_task","title":"Separar os arquivos da área de trabalho","tag":"trabalho"},
  {"type":"create_task","title":"Pagar a conta de energia","tag":"casa"},
  {"type":"create_list","title":"Lista de compras","tag":"casa","items":["arroz","ovos","leite","pão","café","banana","frango","detergente","queijo","iogurte"]},
  {"type":"create_note","title":"Ideia: painel de hábitos","body":"Criar um painel simples para acompanhar hábitos."},
  {"type":"create_note","title":"Ideia: prioridades semanais","body":"Montar uma lista semanal de prioridades."},
  {"type":"create_note","title":"Ideia: modo noturno","body":"Testar um modo noturno mais confortável no aplicativo."}
]}

Se nada se encaixar, retorne {"actions":[]}.`;

const VALID_TAGS = ["trabalho", "estudo", "saude", "casa", "pessoal", "outro"] as const;
type ValidTag = (typeof VALID_TAGS)[number];

function normalizeTag(v: unknown): ValidTag | undefined {
  if (typeof v !== "string") return undefined;
  const lower = v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return (VALID_TAGS as readonly string[]).includes(lower) ? (lower as ValidTag) : undefined;
}

// Títulos genéricos inventados que o agente NÃO deve criar como lista.
const INVENTED_LIST_TITLES = [
  /h[áa]bitos\s+di[áa]rios?/i,
  /prioridades\s+(da\s+)?semana/i,
  /prioridades\s+pessoais/i,
  /prioridades\s+de\s+sa[úu]de/i,
  /plano\s+semanal/i,
  /rotina\s+(di[áa]ria|semanal)/i,
  /metas\s+(da\s+)?semana/i,
];

function looksInvented(title: string): boolean {
  return INVENTED_LIST_TITLES.some((re) => re.test(title));
}

function splitCompoundTitle(title: string): string[] {
  // Quebra títulos que misturam múltiplas ações em uma só.
  const SEPS = /\s*(?:,|;|\s+e\s+|\s+também\s+|\s+além\s+disso\s+)\s*/i;
  if (!SEPS.test(title)) return [title];
  return title
    .split(SEPS)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
}

function normalizeListTitle(title: string, items: string[]): string {
  // "Compras do mês" só é permitido se o original tiver "mês".
  // Caso contrário, achata para "Lista de compras".
  const t = title.trim();
  const looksShopping = /comp(ra|rinha)|mercado|feira|supermercado/i.test(t);
  if (looksShopping) return "Lista de compras";
  if (items.length > 0 && !t) return "Lista de compras";
  return t;
}

function postProcess(actions: AgentAction[], originalText: string): AgentAction[] {
  const lowerOriginal = originalText.toLowerCase();
  const out: AgentAction[] = [];

  for (const a of actions) {
    if (!a || typeof a !== "object") continue;

    if (a.type === "create_task") {
      const tag = normalizeTag((a as { tag?: unknown }).tag);
      // Quebra títulos compostos em várias tarefas.
      const titles = splitCompoundTitle(a.title ?? "");
      for (const t of titles) {
        if (!t) continue;
        out.push({ ...a, title: t, tag });
      }
      continue;
    }

    if (a.type === "create_list") {
      const tag = normalizeTag((a as { tag?: unknown }).tag);
      const items = Array.isArray(a.items) ? a.items.filter((i) => typeof i === "string" && i.trim()) : [];
      // Listas sem itens concretos são rejeitadas (vira nota).
      if (items.length === 0) {
        out.push({ type: "create_note", title: a.title || "Ideia" });
        continue;
      }
      // Listas com título inventado e itens não citados literalmente → nota.
      const itemsLiteral = items.filter((i) => lowerOriginal.includes(i.toLowerCase().trim()));
      if (looksInvented(a.title) && itemsLiteral.length === 0) {
        out.push({ type: "create_note", title: `Ideia: ${a.title}` });
        continue;
      }
      const title = normalizeListTitle(a.title || "", items);
      // "Compras do mês" só se o usuário disse "mês".
      const finalTitle = /mês/i.test(title) && !/mês|mes/i.test(lowerOriginal) ? "Lista de compras" : title;
      out.push({ ...a, title: finalTitle, items, tag });
      continue;
    }

    if (a.type === "create_note") {
      out.push(a);
      continue;
    }
  }

  // Mescla múltiplas "Lista de compras" em uma só (R3).
  const shopping = out.filter((a) => a.type === "create_list" && /lista de compras/i.test(a.title));
  if (shopping.length > 1) {
    const mergedItems: string[] = [];
    const tag = (shopping[0] as Extract<AgentAction, { type: "create_list" }>).tag;
    for (const s of shopping) {
      if (s.type !== "create_list") continue;
      for (const it of s.items) if (!mergedItems.includes(it)) mergedItems.push(it);
    }
    const filtered = out.filter((a) => !(a.type === "create_list" && /lista de compras/i.test(a.title)));
    filtered.push({ type: "create_list", title: "Lista de compras", items: mergedItems, tag });
    return filtered;
  }

  return out;
}

export async function runHome(
  config: AgentConfig,
  segmentText: string,
  sub: SubAgentConfig,
  profileContext?: string,
): Promise<AgentAction[]> {
  const learned = buildAgentContext(segmentText);
  const system = `${BASE}${profileContext ? `\n\n${profileContext.trim()}` : ""}${learned ? `\n\n${learned}` : ""}${sub.prompt.trim() ? `\n\nInstruções pessoais do usuário para este agente:\n${sub.prompt.trim()}` : ""}`;
  const text = await callLlm(config, system, [{ role: "user", content: segmentText }], {
    jsonObject: true,
    temperature: 0.1,
  });
  const parsed = parseJson<{ actions?: AgentAction[] }>(text);
  const raw = Array.isArray(parsed?.actions) ? parsed!.actions : [];
  const filtered = raw.filter(
    (a) => a && (a.type === "create_task" || a.type === "create_list" || a.type === "create_note"),
  );
  return postProcess(filtered, segmentText);
}
