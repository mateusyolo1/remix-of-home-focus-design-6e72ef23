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
  | { tool: "memory_save"; reason: string };

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

const URL_RE = /\bhttps?:\/\/[^\s)]+/i;

export function decideTool(userInput: string): ToolRequest | null {
  const text = userInput.trim();
  if (!text) return null;

  // 3. URL no input → fetch direto
  const urlMatch = text.match(URL_RE);
  if (urlMatch && SEARCH_INTENT_RE.test(text.replace(URL_RE, ""))) {
    return { tool: "web_fetch", url: urlMatch[0], reason: "Usuário pediu para abrir a URL" };
  }

  // 1. Data/hora — exige que parser reconheça algo
  if (TIME_INTENT_RE.test(text) && parseRelativeDate(text)) {
    return { tool: "time", reason: "Expressão temporal detectada" };
  }

  // 2. Intenção de pesquisa
  if (SEARCH_INTENT_RE.test(text)) {
    return { tool: "web_search", query: text, reason: "Intenção de pesquisa detectada" };
  }

  // URL solta sem intenção: ainda assim ofereça fetch
  if (urlMatch) {
    return { tool: "web_fetch", url: urlMatch[0], reason: "URL no input" };
  }

  return null;
}
