/**
 * Hermes Share Tool — clipboard + formatação de texto para compartilhar.
 */

import type { Block, CheckList, QuickNote, Task } from "@/lib/focus-store";

export async function copyToClipboard(text: string): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === "undefined" || !navigator?.clipboard) {
    return { ok: false, reason: "clipboard unavailable" };
  }
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}

type Shareable =
  | { kind: "task"; entity: Task }
  | { kind: "list"; entity: CheckList }
  | { kind: "note"; entity: QuickNote }
  | { kind: "block"; entity: Block };

export function buildShareText(input: Shareable): string {
  if (input.kind === "task") {
    const t = input.entity;
    const status = t.done ? "✓" : "○";
    const extra = [t.tag, t.blockTime].filter(Boolean).join(" · ");
    return `${status} ${t.title}${extra ? `\n${extra}` : ""}`;
  }
  if (input.kind === "list") {
    const l = input.entity;
    const items = l.items.map((i) => `${i.done ? "✓" : "○"} ${i.text}`).join("\n");
    return `📋 ${l.title}\n${items}`;
  }
  if (input.kind === "note") {
    const n = input.entity;
    return `📝 ${n.title}${n.body ? `\n\n${n.body}` : ""}`;
  }
  const b = input.entity;
  return `📅 ${b.time} · ${b.title}${b.tag ? ` (${b.tag})` : ""}${b.notes ? `\n\n${b.notes}` : ""}`;
}
