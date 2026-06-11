import type { AgentConfig } from "@/lib/agent-store";

export type LlmMsg = { role: "user" | "assistant" | "system"; content: string };

export async function callLlm(
  config: AgentConfig,
  system: string,
  messages: LlmMsg[],
  opts: { jsonObject?: boolean; temperature?: number } = {},
): Promise<string> {
  const temperature = opts.temperature ?? 0.4;
  if (config.provider === "gemini") {
    if (!config.geminiKey) throw new Error("Configure sua API key do Gemini no Perfil.");
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
        generationConfig: opts.jsonObject
          ? { responseMimeType: "application/json", temperature }
          : { temperature },
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
  if (!config.deepseekKey) throw new Error("Configure sua API key do DeepSeek no Perfil.");
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
      ...(opts.jsonObject ? { response_format: { type: "json_object" } } : {}),
      temperature,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

export function parseJson<T = unknown>(text: string): T | null {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
