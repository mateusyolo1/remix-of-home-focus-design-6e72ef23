/**
 * Hermes Agent Core — fachada de alto nível.
 *
 * Responsabilidades:
 *  1. Construir o contexto que vai para o prompt (preferências + tags + sugestões + regras fortes).
 *  2. Centralizar feedbacks vindos da UI.
 *  3. Disparar ciclo de aprendizado quando solicitado.
 *
 * NÃO faz fine-tuning. NÃO treina modelo. Tudo local.
 */
import { TASK_TAGS, TASK_TAG_LABEL } from "@/lib/focus-store";
import { getHermesLearningContext } from "./preference-engine";
import { getCustomTags, getTagSuggestions } from "./agent-tags";
import { logDecision } from "./agent-decisions";
import { recordFeedback } from "./learning-core";
import { runLearningCycle } from "./agent-learning";

export type AgentFeedbackKind =
  | "good"
  | "wrong_category"
  | "wrong_type"
  | "wrong_grouping"
  | "should_not_create";

/** Texto pronto para concatenar ao system prompt do home-agent. */
export function buildAgentContext(userInput?: string): string {
  const learned = getHermesLearningContext(userInput);
  const customTags = getCustomTags();
  const pending = getTagSuggestions("pending").slice(0, 3);

  const lines: string[] = [];
  lines.push("=== CONTEXTO DO HERMES AGENT CORE ===");
  lines.push(
    `Tags fixas do app (use SEMPRE uma delas em create_task/create_list): ${TASK_TAGS.map(
      (t) => `${t} (${TASK_TAG_LABEL[t]})`,
    ).join(", ")}.`,
  );
  if (customTags.length) {
    lines.push(
      `Tags personalizadas que o usuário JÁ aprovou (apenas referência mental, não emita como valor de tag): ${customTags
        .map((t) => `"${t.label}"`)
        .join(", ")}.`,
    );
  }
  lines.push(
    "NUNCA invente uma tag nova. Use apenas as tags fixas. Se nenhuma encaixar, use 'outro'.",
  );
  if (pending.length) {
    lines.push(
      `Sugestões de tag em análise (NÃO aplicar até o usuário confirmar): ${pending
        .map((s) => `"${s.label}"`)
        .join(", ")}.`,
    );
  }

  if (learned) {
    lines.push("");
    lines.push(learned);
  }
  return lines.join("\n");
}

/** Encaminha um feedback rápido vindo do chat para a memória + log de decisões. */
export function submitAgentFeedback(input: {
  kind: AgentFeedbackKind;
  summary: string;
}) {
  const { kind, summary } = input;
  switch (kind) {
    case "good":
      recordFeedback({
        kind: "preference",
        text: `Usuário confirmou que ficou bom: ${summary}`,
        rule: `Continuar usando o mesmo estilo de extração para entradas semelhantes.`,
        confidence: 0.5,
      });
      break;
    case "wrong_category":
      recordFeedback({
        kind: "category_rule",
        text: `Categoria errada em: ${summary}`,
        rule: `Revisar a escolha de tag para itens parecidos com "${summary}".`,
        confidence: 0.7,
      });
      break;
    case "wrong_type":
      recordFeedback({
        kind: "correction",
        text: `Tipo errado (task/list/note) em: ${summary}`,
        rule: `Reclassificar tipo para entradas parecidas com "${summary}".`,
        confidence: 0.7,
      });
      break;
    case "wrong_grouping":
      recordFeedback({
        kind: "correction",
        text: `Agrupamento errado em: ${summary}`,
        rule: `Avaliar com mais cuidado se deve juntar ou separar itens parecidos com "${summary}".`,
        confidence: 0.7,
      });
      break;
    case "should_not_create":
      recordFeedback({
        kind: "rejection",
        text: `Usuário não queria que fosse criado: ${summary}`,
        rule: `Não criar automaticamente itens com título parecido a "${summary}".`,
        confidence: 0.8,
      });
      break;
  }
  logDecision({
    kind: "feedback",
    summary: `Feedback (${kind}): ${summary}`,
    accepted: kind === "good",
  });
}

/** Reanalisa criações para detectar novas sugestões de tag. */
export function triggerReanalysis(snapshot: {
  tasks: { id: string; title: string; tag?: string }[];
  lists: { id: string; title: string; tag?: string }[];
  notes: { id: string; title: string }[];
}) {
  runLearningCycle(snapshot);
}
