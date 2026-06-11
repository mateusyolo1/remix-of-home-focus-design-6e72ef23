import { getHermesConfig } from "./hermes-config";
import { localFallback, type HermesFallbackResult } from "./hermes-local-fallback";
import { runSicAgent, checkSicConfig } from "@/lib/sic.functions";

export type HermesResponse =
  | HermesFallbackResult
  | { source: "local_bridge" | "remote_api"; text: string; raw?: unknown };

export async function sendToHermes(input: string): Promise<HermesResponse> {
  const config = getHermesConfig();
  if (!config.enabled) return localFallback(input);

  try {
    if (config.connectionMode === "local_bridge") {
      if (!config.bridgeUrl) throw new Error("Bridge local sem URL configurada.");
      return await runSicAgent({
        data: { input, mode: "local_bridge", bridgeUrl: config.bridgeUrl },
      });
    }
    // Default: remote_api (proxy server-side → VPS / DeepSeek)
    return await runSicAgent({ data: { input, mode: "remote_api" } });
  } catch (err) {
    if (config.useLocalFallback) return localFallback(input);
    throw err;
  }
}

export type HermesConnectionTest = { ok: boolean; message: string };

export async function testHermesConnection(): Promise<HermesConnectionTest> {
  const config = getHermesConfig();
  if (!config.enabled) {
    return { ok: false, message: "Agente desativado. Usando organização local." };
  }

  if (config.connectionMode === "local_bridge") {
    if (!config.bridgeUrl) return { ok: false, message: "Configure a URL da bridge local." };
    try {
      const res = await fetch(`${config.bridgeUrl.replace(/\/$/, "")}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ok: true, message: "Bridge local respondeu." };
    } catch {
      return { ok: false, message: "Bridge local não respondeu." };
    }
  }

  // remote_api: verifica via server fn se as secrets estão presentes
  try {
    const status = await checkSicConfig();
    if (!status.configured) {
      return {
        ok: false,
        message: "API SIC não configurada no servidor (faltam SIC_API_BASE_URL / SIC_API_TOKEN).",
      };
    }
    // Ping leve com prompt mínimo
    const r = await runSicAgent({ data: { input: "ping", mode: "remote_api" } });
    return { ok: true, message: `API SIC respondeu (${status.baseUrlHost ?? "remoto"} • ${status.model}).` };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
