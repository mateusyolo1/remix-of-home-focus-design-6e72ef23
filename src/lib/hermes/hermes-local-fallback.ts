export type HermesFallbackSection = { title: string; items: string[] };
export type HermesFallbackResult = {
  source: "local_fallback";
  notice: string;
  sections: HermesFallbackSection[];
  text: string;
};

const SECTION_LABELS: Record<string, string> = {
  tarefas: "Tarefas",
  tarefa: "Tarefas",
  compras: "Compras",
  compra: "Compras",
  projetos: "Projetos",
  projeto: "Projetos",
  notas: "Notas",
  nota: "Notas",
  ideias: "Ideias",
  ideia: "Ideias",
};

function splitItems(raw: string): string[] {
  return raw
    .split(/[,;]|\se\s/gi)
    .map((s) => s.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

function maybePrefix(section: string, item: string): string {
  if (section === "Compras" && !/^comprar/i.test(item)) {
    return `Comprar ${item.charAt(0).toLowerCase() + item.slice(1)}`;
  }
  return item;
}

export function localFallback(input: string): HermesFallbackResult {
  const text = input.trim();
  const sections: HermesFallbackSection[] = [];
  const regex = /(tarefas?|compras?|projetos?|notas?|ideias?)\s*:\s*([^]*?)(?=(?:tarefas?|compras?|projetos?|notas?|ideias?)\s*:|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const label = SECTION_LABELS[m[1].toLowerCase()] ?? m[1];
    const items = splitItems(m[2]).map((it) => maybePrefix(label, it.replace(/\.$/, "")));
    if (items.length) sections.push({ title: label, items });
  }
  if (!sections.length && text) {
    sections.push({ title: "Tarefas", items: splitItems(text) });
  }
  const rendered = sections
    .map((s) => `${s.title}:\n${s.items.map((i) => `[ ] ${i}`).join("\n")}`)
    .join("\n\n");
  return {
    source: "local_fallback",
    notice: "Hermes real não conectado. Resultado gerado pelo fallback local.",
    sections,
    text: rendered,
  };
}
