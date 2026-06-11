import type { AgentConfig, SubAgentConfig } from "@/lib/agent-store";
import { callLlm, parseJson, todayIso } from "./llm";

export type RouteTarget = "agenda" | "timer" | "home" | "chat";

export type Segment = { target: RouteTarget; text: string };

function buildRouterPrompt(agents: Record<"agenda" | "timer" | "home", SubAgentConfig>, profileContext?: string) {
  const enabled = (Object.entries(agents) as [RouteTarget, SubAgentConfig][])
    .filter(([, c]) => c.enabled)
    .map(([k]) => k);
  const kw = (Object.entries(agents) as [RouteTarget, SubAgentConfig][])
    .filter(([, c]) => c.enabled && c.keywords.trim())
    .map(([k, c]) => `- ${k}: ${c.keywords.trim()}`)
    .join("\n");

  return `Você é o ROTEADOR de um app de produtividade (PT-BR). Sua única tarefa é dividir o que o usuário disse em SEGMENTOS INDEPENDENTES e atribuir cada um a um destino.

Destinos disponíveis: ${enabled.join(", ")}, chat.

Regras de roteamento:
- "agenda" → coisas com horário/data, reuniões, compromissos, blocos de tempo. Ex.: "amanhã às 14h reunião", "sexta tenho médico".
- "timer" → focar por X min, pomodoro, descanso curto, "começar foco". Ex.: "25 min de foco", "pomodoro agora".
- "home" → tarefas avulsas, listas (compras/itens), notas/ideias/pensamentos. Ex.: "comprar pão", "lista de mercado: arroz, café", "anotar ideia X".
- "chat" → conversa, perguntas, dúvidas, sem ação. Ex.: "como você está?", "me ajuda a pensar em…".

Palavras-chave personalizadas do usuário (priorize-as):
${kw || "(nenhuma)"}

Hoje é ${todayIso()}.
${profileContext ? `\n${profileContext.trim()}\n` : ""}

Responda APENAS JSON puro neste formato:
{"segments":[{"target":"agenda|timer|home|chat","text":"trecho exato ou parafraseado curto"}]}

Se a fala for atômica, retorne 1 segmento. Se misturar coisas, retorne vários.`;
}

export async function routeSegments(
  config: AgentConfig,
  input: string,
  agents: Record<"agenda" | "timer" | "home", SubAgentConfig>,
  profileContext?: string,
): Promise<Segment[]> {
  const system = buildRouterPrompt(agents, profileContext);
  const text = await callLlm(config, system, [{ role: "user", content: input }], {
    jsonObject: true,
    temperature: 0.2,
  });
  const parsed = parseJson<{ segments?: Segment[] }>(text);
  const segs = parsed?.segments ?? [];
  if (!Array.isArray(segs) || segs.length === 0) {
    return [{ target: "chat", text: input }];
  }
  return segs
    .filter((s): s is Segment => !!s && typeof s.text === "string" && typeof s.target === "string")
    .map((s) => ({
      target: (["agenda", "timer", "home", "chat"].includes(s.target) ? s.target : "chat") as RouteTarget,
      text: s.text,
    }));
}
