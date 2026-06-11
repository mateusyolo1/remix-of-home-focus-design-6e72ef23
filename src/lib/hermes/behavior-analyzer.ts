import { getMemories } from "./memory-store";
import type { HermesMemory } from "./learning-types";

export type BehaviorSummary = {
  totalMemories: number;
  topRules: { rule: string; confidence: number; type: string }[];
  rejectedTitles: string[];
  preferredTagByKeyword: Record<string, string>;
  recurrentMistakes: string[];
};

export function analyzeHermesBehavior(): BehaviorSummary {
  const memories = getMemories().filter((m) => !m.disabled);
  const rejections = memories.filter((m) => m.type === "rejection");
  const categoryRules = memories.filter((m) => m.type === "category_rule" && m.tag);
  const corrections = memories.filter((m) => m.type === "correction");

  const preferredTagByKeyword: Record<string, string> = {};
  for (const c of categoryRules) {
    for (const k of c.keywords ?? []) {
      preferredTagByKeyword[k] = c.tag!;
    }
  }

  const topRules = memories
    .filter((m) => m.rule)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8)
    .map((m) => ({ rule: m.rule!, confidence: m.confidence, type: m.type }));

  const rejectedTitles = Array.from(
    new Set(rejections.map((r) => r.text.replace(/^.*?: "/, "").replace(/"$/, ""))),
  ).slice(0, 12);

  const counts = new Map<string, number>();
  for (const m of [...rejections, ...corrections]) {
    const key = (m.rule ?? m.text).slice(0, 80);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const recurrentMistakes = Array.from(counts.entries())
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  return {
    totalMemories: memories.length,
    topRules,
    rejectedTitles,
    preferredTagByKeyword,
    recurrentMistakes,
  };
}

export function sortByRelevance(input: string, memories: HermesMemory[]): HermesMemory[] {
  const lower = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return memories
    .map((m) => {
      const score = (m.keywords ?? []).reduce(
        (acc, k) => (lower.includes(k) ? acc + 1 : acc),
        0,
      );
      return { m, score };
    })
    .sort((a, b) => b.score - a.score || b.m.confidence - a.m.confidence)
    .map((x) => x.m);
}
