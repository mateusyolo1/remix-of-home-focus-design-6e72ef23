/**
 * Hermes Tool Router — decide quando o Planner deve chamar uma ferramenta
 * externa antes de responder.
 *
 * Regras (em ordem de prioridade):
 *   1. Frases com data/hora relativa  → time
 *   2. "pesquise"/"procure"/"verifique"/"link oficial"/"documentação"
 *      ou pedido de notícia/preço/versão/clima → web_search
 *   3. URL solta no input → web_fetch
 *   4. Caso padrão → nenhuma ferramenta
 *
 * O Planner deve respeitar a decisão: nunca afirmar que pesquisou se
 * `decideTool()` não retornou web_search, e nunca calcular data se
 * `decideTool()` não retornou time.
 */

import { parseRelativeDate } from "./time-tool";

export type ToolRequest =
  | { tool: "time"; reason: string }
  | { tool: "web_search"; query: string; reason: string }
  | { tool: "web_fetch"; url: string; reason: string }
  | { tool: "tasks_read"; reason: string }
  | { tool: "task_mutate"; reason: string }
  | { tool: "agenda_read"; reason: string }
  | { tool: "memory_recall"; reason: string }
  | { tool: "memory_save"; reason: string }
  | { tool: "lists_read"; reason: string }
  | { tool: "list_mutate"; reason: string }
  | { tool: "notes_read"; reason: string }
  | { tool: "note_mutate"; reason: string }
  | { tool: "block_mutate"; reason: string }
  | { tool: "timer_read"; reason: string }
  | { tool: "timer_control"; reason: string }
  | { tool: "weather"; query?: string; reason: string }
  | { tool: "calc"; expression: string; reason: string }
  | { tool: "units"; reason: string }
  | { tool: "notify"; reason: string }
  | { tool: "share"; reason: string };

const SEARCH_INTENT_RE =
  /(pesquis[ae]|procur[ae]|verifi(?:que|car)|confir[am]|consult[ae])\b|link\s+oficial|documenta[çc][ãa]o|not[íi]cia|pre[çc]o|cota[çc][ãa]o|vers[ãa]o|clima|tempo\s+hoje|previs[ãa]o/i;

const TIME_INTENT_RE =
  /\b(hoje|amanh[ãa]|depois de amanh[ãa]|daqui|em\s+\d+\s*(min|hora|dia)|pr[óo]xim[ao]\s+(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo|semana)|fim de semana|semana que vem|s[áa]bado|domingo|segunda|ter[çc]a|quarta|quinta|sexta)/i;

const TASKS_READ_RE =
  /\b(minhas?\s+tarefas?|o que (eu )?tenho|tarefas? de hoje|pr[óo]xima tarefa|quantas? tarefas?|atrasadas?|pendentes?|lista de tarefas?)\b/i;

const TASK_MUTATE_RE =
  /\b(marca(r)?|conclu[íi]r?|finaliza(r)?|completa(r)?|terminei|feito|risca(r)?|apaga(r)?|deleta(r)?|remove(r)?|adia(r)?|reagenda(r)?|move(r)? para)\b.*\b(tarefa|isso|essa)\b|\b(tarefa|todo)\b.*\b(feita|conclu[íi]da|pronta)\b/i;

const AGENDA_READ_RE =
  /\b(minha agenda|o que tenho agendado|pr[óo]xim[ao] (reuni[ãa]o|bloco|compromisso)|hor[áa]rio livre|janela livre|espa[çc]o (livre|na agenda))\b/i;

const MEMORY_RECALL_RE =
  /\b(voc[êe] lembra|o que voc[êe] sabe|lembra de|do que eu (gosto|prefiro)|minhas prefer[êe]ncias?)\b/i;

const MEMORY_SAVE_RE =
  /\b(lembre[\s-]?se|guarde isso|memoriza(r)?|anote (que|para voc[êe])|n[ãa]o esque[çc]a)\b/i;

const LISTS_READ_RE =
  /\b(minhas? listas?|lista de compras|o que tem na lista|itens? da lista|quantos? itens?)\b/i;

const LIST_MUTATE_RE =
  /\b(marca(r)?|risca(r)?|adiciona(r)?|inclui|p[õo]e|remove(r)?|tira(r)?|renomeia(r)?|apaga(r)? (a )?lista|deleta(r)? (a )?lista)\b.*\b(lista|item|itens|compras)\b|\b(item|itens)\b.*\b(feito|comprado|riscad[ao])\b/i;

const NOTES_READ_RE =
  /\b(minhas? notas?|notas? recentes?|o que (eu )?anotei|nota sobre|busca(r)? (na )?nota)\b/i;

const NOTE_MUTATE_RE =
  /\b(edita(r)?|atualiza(r)?|apaga(r)?|deleta(r)?|arquiva(r)?|estende(r)?|prolonga(r)?)\b.*\bnota\b/i;

const BLOCK_MUTATE_RE =
  /\b(reagenda(r)?|move(r)?|adia(r)?|cancela(r)?|remove(r)?)\b.*\b(bloco|compromisso|reuni[ãa]o|agenda)\b/i;

const TIMER_READ_RE =
  /\b(timer (ativo|atual|rodando)|quanto (falta|tempo) (no|do) timer|cron[ôo]metro)\b/i;

const TIMER_CONTROL_RE =
  /\b(pausa(r)?|retoma(r)?|continua(r)?|para(r)?|encerra(r)?|reseta(r)?|estende(r)?|adiciona(r)?\s+\d+\s*min)\b.*\b(timer|cron[ôo]metro|foco)\b|\b(timer|cron[ôo]metro)\b.*\b(pausa(r)?|para(r)?|reseta(r)?)\b/i;

const WEATHER_RE =
  /\b(clima|tempo|previs[ãa]o|temperatura|vai chover|chuva hoje)\b/i;

const CALC_RE =
  /\b(quanto (é|eh|da|d[áa])|calcula(r)?|some|soma|subtrai|multiplica|divide)\b|^[\d\s().,+\-*/x÷]+$/i;

const UNITS_RE =
  /\b(\d+\s*(ms|seg|segundos?|min|minutos?|h|horas?|dias?)\s+(em|para|→|->)\s*(ms|seg|segundos?|min|minutos?|h|horas?|dias?)|quantos? dias? at[ée]|converte(r)?)\b/i;

const NOTIFY_RE =
  /\b(me (avisa|lembra|notifica)|notifica(r)? em|alerta(r)? em|toque (um )?alarme)\b/i;

const SHARE_RE =
  /\b(compartilha(r)?|copia(r)?|copy|exporta(r)? (essa|esta|a))\b/i;

const URL_RE = /\bhttps?:\/\/[^\s)]+/i;

export function decideTool(userInput: string): ToolRequest | null {
  const text = userInput.trim();
  if (!text) return null;

  // App-state intents têm prioridade sobre web (são mais específicas).
  if (TASK_MUTATE_RE.test(text)) {
    return { tool: "task_mutate", reason: "Intenção de alterar tarefa detectada" };
  }
  if (LIST_MUTATE_RE.test(text)) {
    return { tool: "list_mutate", reason: "Intenção de alterar lista detectada" };
  }
  if (NOTE_MUTATE_RE.test(text)) {
    return { tool: "note_mutate", reason: "Intenção de alterar nota detectada" };
  }
  if (BLOCK_MUTATE_RE.test(text)) {
    return { tool: "block_mutate", reason: "Intenção de alterar bloco detectada" };
  }
  if (TIMER_CONTROL_RE.test(text)) {
    return { tool: "timer_control", reason: "Intenção de controlar timer detectada" };
  }
  if (TASKS_READ_RE.test(text)) {
    return { tool: "tasks_read", reason: "Consulta sobre tarefas detectada" };
  }
  if (LISTS_READ_RE.test(text)) {
    return { tool: "lists_read", reason: "Consulta sobre listas detectada" };
  }
  if (NOTES_READ_RE.test(text)) {
    return { tool: "notes_read", reason: "Consulta sobre notas detectada" };
  }
  if (AGENDA_READ_RE.test(text)) {
    return { tool: "agenda_read", reason: "Consulta sobre agenda detectada" };
  }
  if (TIMER_READ_RE.test(text)) {
    return { tool: "timer_read", reason: "Consulta sobre timer detectada" };
  }
  if (MEMORY_SAVE_RE.test(text)) {
    return { tool: "memory_save", reason: "Pedido para memorizar detectado" };
  }
  if (MEMORY_RECALL_RE.test(text)) {
    return { tool: "memory_recall", reason: "Pedido para lembrar detectado" };
  }

  if (NOTIFY_RE.test(text)) {
    return { tool: "notify", reason: "Pedido de notificação detectado" };
  }
  if (SHARE_RE.test(text)) {
    return { tool: "share", reason: "Intenção de compartilhar detectada" };
  }
  if (WEATHER_RE.test(text)) {
    return { tool: "weather", query: text, reason: "Pergunta sobre clima detectada" };
  }
  if (UNITS_RE.test(text)) {
    return { tool: "units", reason: "Conversão de unidades detectada" };
  }
  if (CALC_RE.test(text)) {
    return { tool: "calc", expression: text, reason: "Expressão aritmética detectada" };
  }

  // URL no input → fetch direto
  const urlMatch = text.match(URL_RE);
  if (urlMatch && SEARCH_INTENT_RE.test(text.replace(URL_RE, ""))) {
    return { tool: "web_fetch", url: urlMatch[0], reason: "Usuário pediu para abrir a URL" };
  }

  // Data/hora — exige que parser reconheça algo
  if (TIME_INTENT_RE.test(text) && parseRelativeDate(text)) {
    return { tool: "time", reason: "Expressão temporal detectada" };
  }

  // Intenção de pesquisa
  if (SEARCH_INTENT_RE.test(text)) {
    return { tool: "web_search", query: text, reason: "Intenção de pesquisa detectada" };
  }

  // URL solta sem intenção: ainda assim ofereça fetch
  if (urlMatch) {
    return { tool: "web_fetch", url: urlMatch[0], reason: "URL no input" };
  }

  return null;
}

/**
 * Decide uma cadeia de até 3 ferramentas. A primária vem de `decideTool`;
 * extras são anexadas quando o input combina contexto temporal/clima/busca
 * com leituras do app. Mutações nunca encadeiam (precisam de confirmação).
 */
export function decideToolChain(userInput: string): ToolRequest[] {
  const primary = decideTool(userInput);
  if (!primary) return [];

  const chain: ToolRequest[] = [primary];
  const text = userInput.trim();

  const isMutation =
    primary.tool === "task_mutate" ||
    primary.tool === "list_mutate" ||
    primary.tool === "note_mutate" ||
    primary.tool === "block_mutate" ||
    primary.tool === "timer_control" ||
    primary.tool === "memory_save" ||
    primary.tool === "notify" ||
    primary.tool === "share";
  if (isMutation) return chain;

  const hasTime = TIME_INTENT_RE.test(text) && parseRelativeDate(text) !== null;
  const readSupportsTime =
    primary.tool === "tasks_read" ||
    primary.tool === "agenda_read" ||
    primary.tool === "lists_read" ||
    primary.tool === "notes_read" ||
    primary.tool === "weather" ||
    primary.tool === "web_search";
  if (hasTime && readSupportsTime && primary.tool !== "time") {
    chain.push({ tool: "time", reason: "Contexto temporal complementar" });
  }

  // Tarefas + agenda no mesmo turno ("o que tenho amanhã?")
  if (
    primary.tool === "tasks_read" &&
    /\b(agenda|reuni[ãa]o|bloco|compromisso)\b/i.test(text)
  ) {
    chain.push({ tool: "agenda_read", reason: "Agenda também solicitada" });
  } else if (
    primary.tool === "agenda_read" &&
    /\b(tarefas?|to[\s-]?do|pendentes?)\b/i.test(text)
  ) {
    chain.push({ tool: "tasks_read", reason: "Tarefas também solicitadas" });
  }

  // Clima + agenda ("vai chover amanhã na minha reunião?")
  if (
    primary.tool === "weather" &&
    /\b(agenda|reuni[ãa]o|bloco|compromisso|tarefa)\b/i.test(text)
  ) {
    chain.push({ tool: "agenda_read", reason: "Agenda complementar ao clima" });
  }

  return chain.slice(0, 3);
}
