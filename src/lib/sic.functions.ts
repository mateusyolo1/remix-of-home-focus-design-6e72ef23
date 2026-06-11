import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server function: proxy seguro para a API SIC (Hermes-Nous Remote Agent).
// Token e URL ficam apenas no servidor (process.env). O navegador nunca os vê.

const RunInput = z.object({
  input: z.string().min(1).max(8000),
  mode: z.enum(["remote_api", "local_bridge"]).optional(),
  bridgeUrl: z.string().url().optional(), // só usado quando mode === "local_bridge"
});

export type SicRunResult = {
  source: "remote_api" | "local_bridge";
  text: string;
};

async function callRemoteSic(input: string): Promise<SicRunResult> {
  const baseUrl = process.env.SIC_API_BASE_URL;
  const token = process.env.SIC_API_TOKEN;
  const model = process.env.SIC_API_MODEL ?? "deepseek-v4-flash";
  if (!baseUrl || !token) {
    throw new Error("API SIC não configurada no servidor (SIC_API_BASE_URL / SIC_API_TOKEN ausentes).");
  }

  // Endpoint OpenAI-compatible (DeepSeek, OpenAI, etc.)
  const url = `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Você é o Agente SIC (Hermes-Nous Remote). Organize a fala do usuário em seções claras (Tarefas, Compras, Projetos, Notas, Ideias) quando fizer sentido. Responda em português, direto, sem floreios.",
          },
          { role: "user", content: input },
        ],
        temperature: 0.4,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`API SIC ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      throw new Error("API SIC retornou resposta vazia ou inválida.");
    }
    return { source: "remote_api", text, raw: data };
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") {
      throw new Error("Tempo esgotado ao chamar a API SIC (30s).");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function callLocalBridge(bridgeUrl: string, input: string): Promise<SicRunResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${bridgeUrl.replace(/\/$/, "")}/organize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Bridge ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const text = typeof data?.text === "string" ? data.text : JSON.stringify(data);
    return { source: "local_bridge", text, raw: data };
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") {
      throw new Error("Tempo esgotado ao chamar a bridge local (15s).");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const runSicAgent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => RunInput.parse(data))
  .handler(async ({ data }): Promise<SicRunResult> => {
    const mode = data.mode ?? "remote_api";
    if (mode === "local_bridge") {
      if (!data.bridgeUrl) throw new Error("Bridge local selecionada, mas a URL não foi informada.");
      return callLocalBridge(data.bridgeUrl, data.input);
    }
    return callRemoteSic(data.input);
  });

export const checkSicConfig = createServerFn({ method: "GET" }).handler(async () => {
  const baseUrl = process.env.SIC_API_BASE_URL;
  const token = process.env.SIC_API_TOKEN;
  const model = process.env.SIC_API_MODEL ?? "deepseek-v4-flash";
  return {
    configured: Boolean(baseUrl && token),
    baseUrlHost: baseUrl ? safeHost(baseUrl) : null,
    model,
  };
});

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
