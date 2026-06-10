import type { AgentConfig } from "./agent-store";

export type AgentAction =
  | { type: "create_task"; title: string; blockTime?: string }
  | { type: "create_block"; time: string; title: string; tag?: string; date?: string; notes?: string }
  | { type: "create_note"; title: string; body?: string; ttlDays?: number }
  | { type: "create_list"; title: string; items: string[] }
  | { type: "start_timer"; minutes: number; title?: string };

export type AgentResult = { reply: string; actions: AgentAction[] };

export type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM_PROMPT = `Você é Hermes, um agente de produtividade dentro do app FocusMind (PT-BR).
Sua missão: transformar pedidos do usuário em AÇÕES executáveis no app.

Você SEMPRE responde com JSON puro neste formato (sem markdown, sem \`\`\`):
{
  "reply": "mensagem curta e amigável ao usuário",
  "actions": [ ...lista de ações... ]
}

Ações disponíveis:
1) {"type":"create_task","title":"...","blockTime":"HH:MM"?}  — tarefa única e acionável (na aba Tarefas)
2) {"type":"create_block","time":"HH:MM","title":"...","tag":"Foco|Reunião|Pausa|Ritual","date":"YYYY-MM-DD"?,"notes":"..."?} — bloco na Agenda
3) {"type":"create_note","title":"...","body":"...","ttlDays":7}  — anotação/pensamento/ideia em texto livre (aba Notas)
4) {"type":"create_list","title":"Compras de mercado","items":["Tomate","Cebola"]}  — checklist com itens marcáveis (aba Listas). USE para listas de compras, mercado, itens, materiais, projetos com sub-itens.
5) {"type":"start_timer","minutes":25,"title":"Foco"?}  — inicia cronômetro

Como diferenciar:
- "lista de compras / mercado / preciso comprar / itens" → create_list
- "anotação / pensamento / ideia / lembrar de uma reflexão" → create_note
- "tarefa / fazer / lembrar de fazer X" → create_task
- "agendar / às HH:MM / reunião amanhã" → create_block

Regras:
- Se o pedido for vago, faça a melhor inferência e execute, depois confirme no "reply".
- Pode retornar VÁRIAS ações de uma vez.
- Se for só conversa, retorne {"reply":"...","actions":[]}.
- Datas relativas ("amanhã", "sexta") → calcule a data ISO.
- Nunca invente campos fora do esquema.
- Sempre considere o dossiê do usuário (se fornecido) para personalizar tom, horários e prioridades. Respeite a escala de trabalho — não agende durante folgas.`;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildSystem(profileContext?: string): string {
  const base = SYSTEM_PROMPT + `\n\nHoje é ${todayIso()}.`;
  if (profileContext && profileContext.trim()) {
    return base + `\n\n${profileContext.trim()}`;
  }
  return base;
}

function extractJson(text: string): AgentResult {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    return { reply: text, actions: [] };
  }
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    return {
      reply: typeof obj.reply === "string" ? obj.reply : "",
      actions: Array.isArray(obj.actions) ? (obj.actions as AgentAction[]) : [],
    };
  } catch {
    return { reply: text, actions: [] };
  }
}

async function callGemini(config: AgentConfig, messages: ChatMsg[], system: string): Promise<string> {
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${encodeURIComponent(config.geminiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callDeepseek(config: AgentConfig, messages: ChatMsg[], system: string): Promise<string> {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.deepseekKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: system },
        ...messages.filter((m) => m.role !== "system"),
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

export async function runAgent(
  config: AgentConfig,
  messages: ChatMsg[],
  profileContext?: string,
): Promise<AgentResult> {
  const system = buildSystem(profileContext);
  if (config.provider === "gemini") {
    if (!config.geminiKey) throw new Error("Configure sua API key do Gemini no Perfil.");
    return extractJson(await callGemini(config, messages, system));
  }
  if (!config.deepseekKey) throw new Error("Configure sua API key do DeepSeek no Perfil.");
  return extractJson(await callDeepseek(config, messages, system));
}
