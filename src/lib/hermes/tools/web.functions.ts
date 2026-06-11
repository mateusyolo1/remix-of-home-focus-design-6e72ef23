/**
 * Hermes Web Tools — server functions.
 *
 * Internet real para o agente:
 *   - webSearchFn   → DuckDuckGo HTML scrape (sem chave, gratuito)
 *   - webFetchFn    → fetch de URL específica, com timeout, strip de scripts
 *                     e limite de tamanho
 *
 * Server-only por design: o cliente chama via `useServerFn` ou os wrappers
 * em `web-search-tool.ts` / `web-fetch-tool.ts`. Nenhum token é exposto.
 */

import { createServerFn } from "@tanstack/react-start";

/* ---------------- Search ---------------- */

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
  source?: string;
};

const SEARCH_TIMEOUT_MS = 8000;
const SEARCH_MAX_RESULTS = 8;

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeDdgRedirect(href: string): string {
  // DDG envolve resultados em /l/?kh=-1&uddg=<encoded>
  try {
    const u = new URL(href, "https://duckduckgo.com");
    const target = u.searchParams.get("uddg");
    if (target) return decodeURIComponent(target);
    return u.toString();
  } catch {
    return href;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export const webSearchFn = createServerFn({ method: "POST" })
  .inputValidator((data: { query: string; limit?: number }) => {
    if (!data || typeof data.query !== "string") throw new Error("query inválida");
    const q = data.query.trim();
    if (!q) throw new Error("query vazia");
    if (q.length > 500) throw new Error("query muito longa");
    return { query: q, limit: Math.min(Math.max(data.limit ?? 5, 1), SEARCH_MAX_RESULTS) };
  })
  .handler(async ({ data }): Promise<{ results: WebSearchResult[]; error?: string }> => {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(data.query)}`;
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `q=${encodeURIComponent(data.query)}`,
        },
        SEARCH_TIMEOUT_MS,
      );
      if (!res.ok) return { results: [], error: `HTTP ${res.status}` };
      const html = await res.text();

      const results: WebSearchResult[] = [];
      const resultRe =
        /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
      let m: RegExpExecArray | null;
      while ((m = resultRe.exec(html)) && results.length < data.limit) {
        const href = decodeDdgRedirect(m[1]);
        const title = stripTags(m[2]);
        const snippet = stripTags(m[3]);
        if (!title || !href) continue;
        let source: string | undefined;
        try {
          source = new URL(href).hostname.replace(/^www\./, "");
        } catch {
          source = undefined;
        }
        results.push({ title, url: href, snippet, source });
      }
      return { results };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro desconhecido";
      return {
        results: [],
        error: msg.includes("abort") ? "Timeout ao consultar a web" : msg,
      };
    }
  });

/* ---------------- Fetch ---------------- */

export type WebFetchResult = {
  url: string;
  title?: string;
  text: string;
  /** true se o conteúdo foi truncado para caber no limite. */
  truncated: boolean;
};

const FETCH_TIMEOUT_MS = 10_000;
const FETCH_MAX_BYTES = 200_000; // ~200KB
const FETCH_MAX_TEXT = 20_000;

const BLOCKED_EXT = /\.(exe|dmg|apk|msi|bat|sh|zip|rar|7z|iso|pdf)(\?|$)/i;

function isAllowedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    // bloqueia hosts locais / metadata
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host === "169.254.169.254" ||
      /^(10\.|127\.|192\.168\.|0\.|::1$)/.test(host)
    ) {
      return false;
    }
    if (BLOCKED_EXT.test(u.pathname + u.search)) return false;
    return true;
  } catch {
    return false;
  }
}

export const webFetchFn = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => {
    if (!data || typeof data.url !== "string") throw new Error("url inválida");
    if (data.url.length > 2000) throw new Error("url muito longa");
    if (!isAllowedUrl(data.url)) throw new Error("url não permitida");
    return { url: data.url };
  })
  .handler(async ({ data }): Promise<{ result?: WebFetchResult; error?: string }> => {
    try {
      const res = await fetchWithTimeout(
        data.url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          },
        },
        FETCH_TIMEOUT_MS,
      );
      if (!res.ok) return { error: `HTTP ${res.status}` };
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!ct.includes("text/") && !ct.includes("json") && !ct.includes("xml")) {
        return { error: "Tipo de conteúdo não suportado" };
      }

      // Leitura limitada por bytes
      const reader = res.body?.getReader();
      let received = 0;
      const chunks: Uint8Array[] = [];
      let truncated = false;
      if (reader) {
        while (received < FETCH_MAX_BYTES) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;
          received += value.byteLength;
          chunks.push(value);
        }
        try {
          // Verifica se ainda havia mais (best-effort)
          const next = await reader.read();
          if (!next.done) truncated = true;
          await reader.cancel().catch(() => {});
        } catch {
          /* noop */
        }
      } else {
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.byteLength > FETCH_MAX_BYTES) {
          chunks.push(buf.slice(0, FETCH_MAX_BYTES));
          truncated = true;
        } else {
          chunks.push(buf);
        }
      }

      const blob = new Blob(chunks as BlobPart[]);
      const raw = await blob.text();
      const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? stripTags(titleMatch[1]).slice(0, 200) : undefined;
      const text = stripTags(raw).slice(0, FETCH_MAX_TEXT);
      if (raw.length > FETCH_MAX_TEXT) truncated = true;

      return { result: { url: data.url, title, text, truncated } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro desconhecido";
      return { error: msg.includes("abort") ? "Timeout ao buscar página" : msg };
    }
  });
