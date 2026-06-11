/**
 * Hermes Web Search Tool — wrapper de cliente.
 *
 * Use no Planner/Chat. Toda chamada tem timeout, fallback seguro e
 * transparência. Nunca invente que pesquisou: se `error` vier preenchido,
 * informe o usuário com a mensagem `WEB_FAIL_NOTE`.
 */

import { webSearchFn, type WebSearchResult } from "./web.functions";

export type { WebSearchResult } from "./web.functions";

export const WEB_SEARCH_NOTE = "Consultei a web para verificar informações atuais.";
export const WEB_FAIL_NOTE =
  "Não consegui acessar a internet agora. Posso responder apenas com base no conhecimento local.";

export async function webSearch(
  query: string,
  limit = 5,
): Promise<{ results: WebSearchResult[]; error?: string }> {
  try {
    return await webSearchFn({ data: { query, limit } });
  } catch (err) {
    return { results: [], error: err instanceof Error ? err.message : "falha na pesquisa" };
  }
}
