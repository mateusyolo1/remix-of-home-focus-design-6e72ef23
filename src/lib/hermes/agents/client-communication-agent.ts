/* ============================================
   Hermes — Client Communication Agent
   ============================================
   Generates polite messages for clients:
   clarification questions, briefing confirmations,
   delivery messages, approval requests.
   ============================================ */

export type ClientMessage = {
  type: "question" | "confirmation" | "delivery" | "approval" | "warning";
  subject: string;
  body: string;
};

/**
 * Generate a message asking the client for clarification.
 */
export function generateClarificationQuestions(
  questions: string[],
  clientName?: string,
): ClientMessage {
  const greeting = clientName
    ? `Oi, tudo bem? Só para eu finalizar certinho o trabalho do ${clientName}:`
    : "Oi, tudo bem? Só para eu finalizar certinho:";

  const body = [greeting, "", ...questions.map((q) => `• ${q}`)].join("\n");

  return {
    type: "question",
    subject: "Dúvidas sobre o briefing",
    body: body + "\n\nMe confirma esses pontos para eu seguir?",
  };
}

/**
 * Generate a briefing confirmation message.
 */
export function generateBriefingConfirmation(
  projectName: string | undefined,
  details: string[],
): ClientMessage {
  const greeting = "Oi! Segue o resumo do briefing para confirmarmos:";
  const detailsList = details.map((d) => `• ${d}`).join("\n");

  const body = [
    greeting,
    "",
    detailsList,
    "",
    "Pode confirmar se está tudo certo? Se precisar ajustar algo, me avisa!",
  ].join("\n");

  return {
    type: "confirmation",
    subject: `Confirmação de briefing — ${projectName ?? "projeto"}`,
    body,
  };
}

/**
 * Generate a delivery message.
 */
export function generateDeliveryMessage(
  deliverable: string,
  clientName?: string,
  note?: string,
): ClientMessage {
  const greeting = clientName
    ? `Olá ${clientName}!`
    : "Olá!";

  const body = [
    greeting,
    `Segue o arquivo de ${deliverable} para sua avaliação.`,
    note ? `\n${note}` : "",
    "\nMe avise se precisar de algum ajuste!",
  ].join("\n");

  return {
    type: "delivery",
    subject: `Entrega: ${deliverable}`,
    body,
  };
}

/**
 * Generate an approval request message.
 */
export function generateApprovalRequest(
  projectName: string | undefined,
  previewType: string,
): ClientMessage {
  const body = [
    "Olá!",
    `Segue a prévia do ${projectName ?? "projeto"} em ${previewType} para aprovação.`,
    "",
    "Por favor, me confirme se está tudo ok ou se precisa de alguma alteração.",
    "Obrigado!",
  ].join("\n");

  return {
    type: "approval",
    subject: `Aprovação: ${projectName ?? "prévia"} em ${previewType}`,
    body,
  };
}

/**
 * Generate a warning about additional scope.
 */
export function generateScopeWarning(
  originalBrief: string,
  additionalItem: string,
): ClientMessage {
  const body = [
    "Só um aviso importante:",
    `O briefing original previa "${originalBrief}".`,
    `Você solicitou também "${additionalItem}", que está fora do escopo inicial.`,
    "",
    "Podemos incluir, mas isso pode gerar um custo adicional ou prazo extra. Confirma?",
  ].join("\n");

  return {
    type: "warning",
    subject: "Aviso de escopo adicional",
    body,
  };
}
