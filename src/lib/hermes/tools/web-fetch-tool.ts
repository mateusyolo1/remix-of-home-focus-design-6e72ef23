/**
 * Hermes Web Fetch Tool — wrapper de cliente.
 *
 * Use quando o usuário pedir um link específico (documentação, página
 * oficial). Conteúdo retornado já vem sem scripts, limitado em tamanho
 * e com flag `truncated` indicando corte.
 */

import { webFetchFn, type WebFetchResult } from "./web.functions";

export type { WebFetchResult } from "./web.functions";

export async function webFetch(
  url: string,
): Promise<{ result?: WebFetchResult; error?: string }> {
  try {
    return await webFetchFn({ data: { url } });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "falha ao buscar página" };
  }
}
