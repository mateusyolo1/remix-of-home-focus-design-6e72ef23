import { getHermesConfig } from "./hermes-config";
import { localFallback, type HermesFallbackResult } from "./hermes-local-fallback";

export type HermesResponse =
  | HermesFallbackResult
  | { source: "local_bridge" | "remote_api"; text: string; raw?: unknown };

async function callLocalBridge(url: string, input: string): Promise<HermesResponse> {
  const res = await fetch(`${url.replace(/\/$/, "")}/organize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) throw new Error(`Bridge ${res.status}`);
  const data = await res.json();
  return { source: "local_bridge", text: typeof data?.text === "string" ? data.text : JSON.stringify(data), raw: data };
}

async function callRemoteApi(url: string, input: string): Promise<HermesResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return { source: "remote_api", text: typeof data?.text === "string" ? data.text : JSON.stringify(data), raw: data };
}

export async function sendToHermes(input: string): Promise<HermesResponse> {
  const config = getHermesConfig();
  if (!config.enabled) return localFallback(input);

  if (config.connectionMode === "local_bridge" && config.bridgeUrl) {
    try {
      return await callLocalBridge(config.bridgeUrl, input);
    } catch (err) {
      if (config.useLocalFallback) return localFallback(input);
      throw err;
    }
  }

  if (config.connectionMode === "remote_api" && config.remoteApiUrl) {
    try {
      return await callRemoteApi(config.remoteApiUrl, input);
    } catch (err) {
      if (config.useLocalFallback) return localFallback(input);
      throw err;
    }
  }

  return localFallback(input);
}

export type HermesConnectionTest = { ok: boolean; message: string };

export async function testHermesConnection(): Promise<HermesConnectionTest> {
  const config = getHermesConfig();
  if (!config.enabled) {
    return { ok: false, message: "Hermes Agent desativado. O app usa organização local." };
  }
  switch (config.connectionMode) {
    case "local_fallback":
      return { ok: false, message: "Fallback local ativo. Hermes Agent real não conectado." };
    case "manual_termux":
      return {
        ok: false,
        message: "Hermes instalado manualmente no Termux, mas ainda não existe bridge automática com o app.",
      };
    case "local_bridge": {
      if (!config.bridgeUrl) return { ok: false, message: "Configure a URL da bridge local (ex.: http://127.0.0.1:8765)." };
      try {
        const res = await fetch(`${config.bridgeUrl.replace(/\/$/, "")}/health`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return { ok: true, message: "Hermes Bridge conectada." };
      } catch {
        return { ok: false, message: "Bridge local não encontrada. Usando fallback local." };
      }
    }
    case "remote_api": {
      if (!config.remoteApiUrl) return { ok: false, message: "Configure a URL da API remota." };
      try {
        const res = await fetch(config.remoteApiUrl, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return { ok: true, message: "API remota do Hermes respondeu." };
      } catch {
        return { ok: false, message: "API remota não respondeu. Usando fallback local." };
      }
    }
  }
}
