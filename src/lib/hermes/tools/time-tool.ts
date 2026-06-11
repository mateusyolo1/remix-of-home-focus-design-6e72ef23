/**
 * Hermes Time Tool — contexto temporal real para o agente.
 *
 * Tudo aqui é puro/cliente, sem dependência de rede. O Planner deve chamar
 * `getTimeContext()` antes de criar tarefa com prazo, lembrete ou timer,
 * e `parseRelativeDate()` para converter expressões em PT-BR em timestamps.
 */

export type TimeContext = {
  /** Date.now() no momento da chamada. */
  now: number;
  /** ISO completo (com timezone offset). */
  iso: string;
  /** Data formatada pt-BR (DD/MM/AAAA). */
  date: string;
  /** Hora formatada pt-BR (HH:MM). */
  time: string;
  /** IANA timezone (ex.: "America/Sao_Paulo"). */
  timezone: string;
  /** Dia da semana em pt-BR ("segunda-feira"...). */
  weekday: string;
};

const WEEKDAYS_PT = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const WEEKDAY_ALIASES: Record<string, number> = {
  domingo: 0,
  dom: 0,
  segunda: 1,
  "segunda-feira": 1,
  seg: 1,
  terça: 2,
  terca: 2,
  "terça-feira": 2,
  "terca-feira": 2,
  ter: 2,
  quarta: 3,
  "quarta-feira": 3,
  qua: 3,
  quinta: 4,
  "quinta-feira": 4,
  qui: 4,
  sexta: 5,
  "sexta-feira": 5,
  sex: 5,
  sábado: 6,
  sabado: 6,
  sab: 6,
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function getCurrentTime(now = new Date()): string {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function getCurrentDate(now = new Date()): string {
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
}

export function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function getTimeContext(now = new Date()): TimeContext {
  return {
    now: now.getTime(),
    iso: now.toISOString(),
    date: getCurrentDate(now),
    time: getCurrentTime(now),
    timezone: getTimezone(),
    weekday: WEEKDAYS_PT[now.getDay()],
  };
}

/** ------- parseRelativeDate ------- */

export type ParsedDate = {
  timestamp: number;
  /** Hora extraída do input ou null se só veio "amanhã" sem hora. */
  hasTime: boolean;
  /** Expressão original que foi reconhecida. */
  matched: string;
};

function withTime(base: Date, hours: number, minutes = 0): Date {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Tenta extrair "HH" / "HHh" / "HH:MM" / "HHhMM" / "às HH" de um trecho.
 * Retorna null se nada encontrado.
 */
function extractTime(text: string): { h: number; m: number } | null {
  const m = text.match(/(?:às?\s*)?(\d{1,2})(?:[:h](\d{2}))?\s*(h|hs|horas?)?/i);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  // Heurística: o regex acima casa qualquer número de 1-2 dígitos. Para
  // evitar falsos positivos ("amanhã 2 itens"), só consideramos se vier
  // junto de "h"/"hs"/"horas"/":" ou prefixo "às".
  if (!m[3] && !m[2] && !/às?\s*\d{1,2}/i.test(text)) return null;
  return { h, m: min };
}

/**
 * Converte expressões em PT-BR ("hoje", "amanhã às 9h", "daqui 30 minutos",
 * "próxima segunda", "sexta às 18h", "fim de semana", "semana que vem")
 * em timestamp absoluto. Retorna null se não reconheceu.
 */
export function parseRelativeDate(input: string, now = new Date()): ParsedDate | null {
  const text = input
    .toLowerCase()
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;

  const time = extractTime(text);

  // "daqui X minutos|horas|dias"
  const daqui = text.match(/(?:daqui|em)\s+(\d+)\s*(minutos?|min|horas?|hs?|dias?)/);
  if (daqui) {
    const n = Number(daqui[1]);
    const unit = daqui[2];
    const ms = unit.startsWith("min")
      ? n * 60_000
      : unit.startsWith("h")
        ? n * 3_600_000
        : n * 86_400_000;
    return { timestamp: now.getTime() + ms, hasTime: true, matched: daqui[0] };
  }

  // "hoje"
  if (/\bhoje\b/.test(text)) {
    const d = time ? withTime(now, time.h, time.m) : new Date(now);
    return { timestamp: d.getTime(), hasTime: Boolean(time), matched: "hoje" };
  }

  // "depois de amanhã"
  if (/depois de amanh[ãa]/.test(text)) {
    const base = new Date(now);
    base.setDate(base.getDate() + 2);
    const d = time ? withTime(base, time.h, time.m) : withTime(base, 9, 0);
    return { timestamp: d.getTime(), hasTime: Boolean(time), matched: "depois de amanhã" };
  }

  // "amanhã"
  if (/\bamanh[ãa]\b/.test(text)) {
    const base = new Date(now);
    base.setDate(base.getDate() + 1);
    const d = time ? withTime(base, time.h, time.m) : withTime(base, 9, 0);
    return { timestamp: d.getTime(), hasTime: Boolean(time), matched: "amanhã" };
  }

  // "fim de semana" → próximo sábado 10h
  if (/fim de semana/.test(text)) {
    const base = new Date(now);
    const delta = (6 - base.getDay() + 7) % 7 || 7;
    base.setDate(base.getDate() + delta);
    const d = time ? withTime(base, time.h, time.m) : withTime(base, 10, 0);
    return { timestamp: d.getTime(), hasTime: Boolean(time), matched: "fim de semana" };
  }

  // "semana que vem" / "próxima semana"
  if (/(semana que vem|pr[óo]xima semana)/.test(text)) {
    const base = new Date(now);
    base.setDate(base.getDate() + 7);
    const d = time ? withTime(base, time.h, time.m) : withTime(base, 9, 0);
    return { timestamp: d.getTime(), hasTime: Boolean(time), matched: "semana que vem" };
  }

  // "próxima segunda" / "segunda que vem" / "segunda-feira às 18h"
  for (const [alias, dow] of Object.entries(WEEKDAY_ALIASES)) {
    const re = new RegExp(`\\b(pr[óo]xim[ao]\\s+)?${alias}(\\s+que\\s+vem)?\\b`);
    if (re.test(text)) {
      const base = new Date(now);
      const cur = base.getDay();
      let delta = (dow - cur + 7) % 7;
      // "próxima X" ou "X que vem" → forçar próxima semana se hoje for o mesmo dia
      const forceNext = /pr[óo]xim[ao]|que\s+vem/.test(text);
      if (delta === 0 && forceNext) delta = 7;
      if (delta === 0 && !time) delta = 7; // sem hora explícita, manda pra próxima
      base.setDate(base.getDate() + delta);
      const d = time ? withTime(base, time.h, time.m) : withTime(base, 9, 0);
      return { timestamp: d.getTime(), hasTime: Boolean(time), matched: alias };
    }
  }

  // Só hora ("às 18h") → hoje nessa hora, ou amanhã se já passou
  if (time) {
    let d = withTime(now, time.h, time.m);
    if (d.getTime() <= now.getTime()) {
      d = new Date(d.getTime() + 86_400_000);
    }
    return { timestamp: d.getTime(), hasTime: true, matched: `${time.h}h` };
  }

  return null;
}

/** Mensagem de transparência sugerida para o Hermes incluir na resposta. */
export const TIME_TRANSPARENCY_NOTE = "Usei a data e hora atual para calcular o lembrete.";
