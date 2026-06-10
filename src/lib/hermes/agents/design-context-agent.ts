/* ============================================
   Hermes — Design Context Agent
   ============================================
   Understands design terms, detects piece type,
   visual direction, necessary assets, and
   generates questions for the client.
   ============================================ */

import type { DesignTerm } from "../hermes-types";

const DESIGN_TERM_MAP: Record<DesignTerm, string[]> = {
  logo: ["logo", "logotipo", "marca", "assinatura"],
  identidade_visual: ["identidade visual", "identidade visual", "branding"],
  paleta: ["paleta", "cores", "cor", "colorido"],
  tipografia: ["tipografia", "fonte", "letra", "font"],
  feed: ["feed", "feed do instagram", "perfil"],
  story: ["story", "stories", "instagram story"],
  reels: ["reels", "video curto"],
  carrossel: ["carrossel", "multi-slide", "slide"],
  banner: ["banner", "banner", "faixa"],
  outdoor: ["outdoor", "painel", "placa", "cartaz"],
  mockup: ["mockup", "mockup", "maquete"],
  briefing: ["briefing", "brief", "escopo"],
  aprovacao: ["aprovacao", "aprovação", "approval", "ok do cliente"],
  previa: ["previa", "prévia", "preview", "amostra"],
  layout: ["layout", "leiaute", "disposição"],
  arquivo_final: ["arquivo final", "final", "entrega final"],
  png: ["png", ".png"],
  pdf: ["pdf", ".pdf"],
  vetor: ["vetor", "vetorizado", "svg", "eps", "ai"],
  illustrator: ["illustrator", "ai", ".ai"],
  photoshop: ["photoshop", "psd", ".psd"],
  canva: ["canva", "canva"],
  figma: ["figma", "figma"],
};

const PIECE_TYPES = [
  { term: "feed", label: "Arte para Instagram Feed" },
  { term: "story", label: "Arte para Instagram Story" },
  { term: "reels", label: "Capa de Reels" },
  { term: "carrossel", label: "Carrossel Instagram" },
  { term: "banner", label: "Banner" },
  { term: "outdoor", label: "Outdoor / Painel" },
  { term: "logo", label: "Logotipo" },
];

export type DesignAnalysis = {
  pieceType: string | null;
  detectedTerms: DesignTerm[];
  visualDirections: string[];
  necessaryAssets: string[];
  questions: string[];
  deliverables: string[];
};

/**
 * Analyze text and detect design-related context.
 */
export function analyzeDesignContext(text: string): DesignAnalysis {
  const t = text.toLowerCase();
  const detectedTerms: DesignTerm[] = [];
  const visualDirections: string[] = [];
  const necessaryAssets: string[] = [];
  const questions: string[] = [];
  const deliverables: string[] = [];

  // Detect which design terms are present
  for (const [term, keywords] of Object.entries(DESIGN_TERM_MAP)) {
    if (keywords.some((kw) => t.includes(kw))) {
      detectedTerms.push(term as DesignTerm);
    }
  }

  // Detect piece type
  let pieceType: string | null = null;
  for (const pt of PIECE_TYPES) {
    if (t.includes(pt.term)) {
      pieceType = pt.label;
      break;
    }
  }

  // Extract visual directions
  const directionPatterns: [RegExp, string][] = [
    [/(fund[oae]\s+\w+)/gi, "$1"],
    [/(paleta\s+\w+)/gi, "$1"],
    [/(estilo\s+\w+)/gi, "$1"],
    [/(premium|luxo|simples|modern[oa]|clássic[oa]|minimalista)/gi, "$1"],
  ];

  for (const [pattern, replacement] of directionPatterns) {
    const match = text.match(pattern);
    if (match) {
      visualDirections.push(match[0].replace(replacement, "$1").trim());
    }
  }

  // Determine necessary assets
  if (detectedTerms.includes("logo")) {
    necessaryAssets.push("Logo do cliente");
  }
  if (detectedTerms.includes("paleta") || !t.includes("paleta")) {
    necessaryAssets.push("Paleta de cores do cliente");
  }
  if (t.includes("produto") || t.includes("foto")) {
    necessaryAssets.push("Fotos do produto");
  }
  if (t.includes("tipografia")) {
    necessaryAssets.push("Definição tipográfica");
  }

  // Generate questions based on missing info
  if (!t.includes("feed") && !t.includes("story")) {
    if (detectedTerms.length > 0 && !pieceType) {
      questions.push("A arte será para feed ou story?");
    }
  }
  if (!t.includes("logo")) {
    questions.push("Você tem o logo do cliente em alta resolução?");
  }
  if (!t.includes("prazo") && !t.includes("amanhã") && !t.includes("hoje")) {
    questions.push("Qual o prazo para esta entrega?");
  }
  if (!t.includes("tamanho") && !t.includes("medida") && !t.includes("resolução")) {
    questions.push("Qual o formato/tamanho necessário?");
  }

  // Deliverables
  if (pieceType) {
    deliverables.push(pieceType);
  }
  if (detectedTerms.length > 0) {
    if (detectedTerms.includes("logo")) deliverables.push("Logo aplicado");
    if (detectedTerms.includes("vetor")) deliverables.push("Arquivo vetorizado");
    if (detectedTerms.includes("pdf")) deliverables.push("Arquivo PDF");
    if (detectedTerms.includes("png")) deliverables.push("Arquivo PNG");
  }

  return {
    pieceType,
    detectedTerms,
    visualDirections: [...new Set(visualDirections)],
    necessaryAssets: [...new Set(necessaryAssets)],
    questions,
    deliverables: [...new Set(deliverables)],
  };
}
