/**
 * Hermes Tool Executor — executa a ToolRequest decidida pelo router
 * e devolve um trecho de contexto pra ser injetado no system prompt
 * do chat-reply. Apenas leituras + tools puras (time/calc/units/weather/
 * web). Mutações devolvem uma `PendingMutation` para o usuário confirmar
 * via UI (botão Sim/Não no chat).
 */

import { decideTool, decideToolChain, type ToolRequest } from "./tool-router";
import { getTimeContext, parseRelativeDate } from "./time-tool";
import { webSearch, WEB_SEARCH_NOTE, WEB_FAIL_NOTE } from "./web-search-tool";
import { webFetch } from "./web-fetch-tool";
import { listTasks, getTaskStats, getNextTask, findTask } from "./tasks-tool";
import { listLists, getListStats, getList } from "./lists-tool";
import { listNotes, getNote } from "./notes-tool";
import { listBlocks, getNextBlock } from "./agenda-tool";
import { recallMemories } from "./memory-tool";
import { getActiveTimer } from "./timer-tool";
import { calc } from "./calc-tool";
import { getWeather } from "./weather-tool";

export type PendingMutation =
  | { kind: "complete_task"; query: string; label: string }
  | { kind: "reopen_task"; query: string; label: string }
  | { kind: "delete_task"; query: string; label: string }
  | { kind: "move_task_today"; query: string; label: string }
  | { kind: "delete_list"; query: string; label: string }
  | { kind: "complete_list"; query: string; label: string }
  | { kind: "delete_note"; query: string; label: string }
  | { kind: "archive_note"; query: string; label: string }
  | { kind: "cancel_block"; query: string; label: string }
  | { kind: "timer_pause"; label: string }
  | { kind: "timer_resume"; label: string }
  | { kind: "timer_stop"; label: string }
  | { kind: "timer_reset"; label: string }
  | { kind: "timer_extend"; minutes: number; label: string };

export type ToolRunResult = {
  request: ToolRequest;
  context: string;
  note?: string;
  pending?: PendingMutation;
};

function fmtTask(t: { title: string; tag?: string; scheduledFor?: string; dueAt?: number }) {
  const bits: string[] = [t.title];
  if (t.tag) bits.push(`[${t.tag}]`);
  if (t.dueAt) bits.push(`(vence ${new Date(t.dueAt).toLocaleString("pt-BR")})`);
  else if (t.scheduledFor) bits.push(`(${t.scheduledFor})`);
  return bits.join(" ");
}

function stripVerb(input: string, verbRe: RegExp): string {
  return input
    .replace(/^(por favor,?\s*)?/i, "")
    .replace(verbRe, "")
    .replace(/^(a|o|essa|esse|isso|aquela|aquele)\s+/i, "")
    .replace(/^(tarefa|lista|nota|bloco|compromisso|reuni[ãa]o)\s+/i, "")
    .replace(/[?!.]+$/, "")
    .trim();
}

function detectTaskMutation(input: string): PendingMutation | null {
  const verbRe =
    /\b(marca[r]?|conclu[íi][r]?|finaliza[r]?|completa[r]?|terminei|feito|risca[r]?|apaga[r]?|deleta[r]?|remove[r]?|adia[r]?|reagenda[r]?|move[r]?\s+para\s+hoje)\b/i;
  const query = stripVerb(input, verbRe);
  const guess = findTask(query) ?? findTask(input);
  const target = guess?.title ?? query ?? "tarefa";

  if (/\b(apaga|deleta|remove)/i.test(input))
    return { kind: "delete_task", query: guess?.id ?? query, label: `Apagar tarefa "${target}"?` };
  if (/\b(adia|reagenda|hoje|move)/i.test(input))
    return { kind: "move_task_today", query: guess?.id ?? query, label: `Mover "${target}" para hoje?` };
  if (/\b(reabri[r]?|reopen|voltar)/i.test(input))
    return { kind: "reopen_task", query: guess?.id ?? query, label: `Reabrir "${target}"?` };
  return { kind: "complete_task", query: guess?.id ?? query, label: `Concluir "${target}"?` };
}

function detectListMutation(input: string): PendingMutation | null {
  const verbRe = /\b(apaga[r]?|deleta[r]?|remove[r]?\s+(a\s+)?lista|conclui[r]?|finaliza[r]?)\b/i;
  const query = stripVerb(input, verbRe).replace(/^lista\s+(de\s+)?/i, "");
  const list = getList(query) ?? listLists()[0];
  if (!list) return null;
  if (/\b(apaga|deleta|remove)/i.test(input))
    return { kind: "delete_list", query: list.id, label: `Apagar lista "${list.title}"?` };
  if (/\b(conclu[íi]|finaliza|pronta)/i.test(input))
    return { kind: "complete_list", query: list.id, label: `Marcar lista "${list.title}" como concluída?` };
  return null;
}

function detectNoteMutation(input: string): PendingMutation | null {
  const verbRe = /\b(apaga[r]?|deleta[r]?|arquiva[r]?|edita[r]?|atualiza[r]?)\b.*\bnota\b/i;
  const query = stripVerb(input, verbRe);
  const note = getNote(query) ?? listNotes({ recent: 1 })[0];
  if (!note) return null;
  if (/\barquiva/i.test(input))
    return { kind: "archive_note", query: note.id, label: `Arquivar nota "${note.title}"?` };
  if (/\b(apaga|deleta)/i.test(input))
    return { kind: "delete_note", query: note.id, label: `Apagar nota "${note.title}"?` };
  return null;
}

function detectBlockMutation(input: string): PendingMutation | null {
  if (!/\b(cancela|remove|apaga)/i.test(input)) return null;
  const verbRe = /\b(cancela[r]?|remove[r]?|apaga[r]?)\b/i;
  const query = stripVerb(input, verbRe);
  return { kind: "cancel_block", query, label: `Cancelar bloco "${query || "selecionado"}"?` };
}

function detectTimerControl(input: string): PendingMutation | null {
  if (/\bpausa/i.test(input)) return { kind: "timer_pause", label: "Pausar o timer?" };
  if (/\b(retoma|continua)/i.test(input)) return { kind: "timer_resume", label: "Retomar o timer?" };
  if (/\breseta/i.test(input)) return { kind: "timer_reset", label: "Resetar o timer?" };
  if (/\b(para|encerra|stop)/i.test(input)) return { kind: "timer_stop", label: "Encerrar o timer?" };
  const ext = input.match(/(?:estende[r]?|adiciona[r]?|\+)\s*(\d+)\s*min/i);
  if (ext) {
    const m = Number(ext[1]);
    return { kind: "timer_extend", minutes: m, label: `Adicionar ${m}min ao timer?` };
  }
  return null;
}

export async function executeTool(input: string): Promise<ToolRunResult | null> {
  const req = decideTool(input);
  if (!req) return null;

  switch (req.tool) {
    case "time": {
      const ctx = getTimeContext();
      const parsed = parseRelativeDate(input);
      const lines = [
        `Agora: ${ctx.weekday}, ${ctx.date} ${ctx.time} (${ctx.timezone}).`,
      ];
      if (parsed) {
        lines.push(
          `Expressão "${parsed.matched}" → ${new Date(parsed.timestamp).toLocaleString("pt-BR")}.`,
        );
      }
      return { request: req, context: lines.join("\n") };
    }

    case "tasks_read": {
      const today = listTasks({ when: "today" }).slice(0, 8);
      const overdue = listTasks({ when: "overdue" }).slice(0, 5);
      const stats = getTaskStats();
      const next = getNextTask();
      const lines = [
        `Tarefas — total: ${stats.total} · abertas: ${stats.open} · concluídas: ${stats.done} · atrasadas: ${stats.overdue} · hoje: ${stats.today}.`,
      ];
      if (next) lines.push(`Próxima: ${fmtTask(next)}.`);
      if (today.length) lines.push(`Hoje:\n${today.map((t) => `• ${fmtTask(t)}`).join("\n")}`);
      if (overdue.length)
        lines.push(`Atrasadas:\n${overdue.map((t) => `• ${fmtTask(t)}`).join("\n")}`);
      if (!today.length && !overdue.length && !next) lines.push("Nenhuma tarefa aberta no momento.");
      return { request: req, context: lines.join("\n") };
    }

    case "agenda_read": {
      const today = new Date();
      const k = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const blocks = listBlocks({ date: k });
      const next = getNextBlock();
      const lines: string[] = [];
      if (blocks.length) {
        lines.push(
          `Agenda de hoje:\n${blocks.map((b) => `• ${b.time} — ${b.title}${b.tag ? ` [${b.tag}]` : ""}`).join("\n")}`,
        );
      } else {
        lines.push("Nenhum bloco agendado hoje.");
      }
      if (next) {
        const d = next.date ? ` (${next.date})` : "";
        lines.push(`Próximo bloco: ${next.time}${d} — ${next.title}.`);
      }
      return { request: req, context: lines.join("\n") };
    }

    case "lists_read": {
      const lists = listLists().slice(0, 6);
      const stats = getListStats();
      const lines = [
        `Listas — total: ${stats.lists} · itens: ${stats.total} · abertos: ${stats.open}.`,
      ];
      for (const l of lists) {
        const open = l.items.filter((i) => !i.done);
        lines.push(
          `• ${l.title} (${open.length}/${l.items.length} abertos): ${open
            .slice(0, 5)
            .map((i) => i.text)
            .join(", ")}${open.length > 5 ? "..." : ""}`,
        );
      }
      if (!lists.length) lines.push("Nenhuma lista ativa.");
      return { request: req, context: lines.join("\n") };
    }

    case "notes_read": {
      const notes = listNotes({ recent: 6 });
      if (!notes.length) return { request: req, context: "Nenhuma nota recente." };
      const lines = notes.map(
        (n) => `• ${n.title}${n.body ? ` — ${n.body.slice(0, 80)}` : ""}`,
      );
      return { request: req, context: `Notas recentes:\n${lines.join("\n")}` };
    }

    case "timer_read": {
      const info = getActiveTimer();
      if (!info) return { request: req, context: "Nenhum timer ativo." };
      const mins = Math.max(0, Math.round(info.snapshot.remainingMs / 60_000));
      return {
        request: req,
        context: `Timer ativo: ${info.timer.title ?? "Foco"} — ${info.timer.status}, ${mins}min restantes.`,
      };
    }

    case "memory_recall": {
      const mems = recallMemories({ query: input, limit: 5 });
      if (!mems.length) return { request: req, context: "Nenhuma memória relevante." };
      return {
        request: req,
        context: `Memórias relevantes:\n${mems.map((m) => `• ${m.text}${m.rule ? ` → ${m.rule}` : ""}`).join("\n")}`,
      };
    }

    case "memory_save": {
      return {
        request: req,
        context:
          "Reconheça o pedido e diga ao usuário que pode salvar pela tela Perfil → Memória (a interface confirma antes de gravar).",
        note: "memory_save_hint",
      };
    }

    case "calc": {
      const r = calc(req.expression);
      if (!r.ok) return { request: req, context: `Não consegui calcular "${req.expression}".` };
      return { request: req, context: `Resultado: ${r.expression} = ${r.value}.` };
    }

    case "units": {
      const ctx = getTimeContext();
      return {
        request: req,
        context: `Use a data atual (${ctx.date} ${ctx.time}) para conversões; responda com a unidade pedida pelo usuário.`,
      };
    }

    case "weather": {
      const cityMatch = input.match(/(?:em|de|no|na)\s+([A-Za-zÀ-ÿ\s-]{2,40})/i);
      const city = cityMatch?.[1]?.trim();
      if (!city) {
        return {
          request: req,
          context: "Peça ao usuário a cidade — não tenho geolocalização aqui.",
        };
      }
      const r = await getWeather({ city, when: "now" });
      if ("ok" in r && !r.ok) {
        return { request: req, context: `Não consegui o clima de ${city} (${r.reason}).` };
      }
      const w = r as Exclude<typeof r, { ok: false }>;
      return {
        request: req,
        context: `Clima em ${w.city.name}: ${Math.round(w.weather.temperature)}°C — ${w.weather.label}.`,
      };
    }

    case "web_search": {
      const { results, error } = await webSearch(req.query, 5);
      if (error || !results.length) {
        return { request: req, context: WEB_FAIL_NOTE, note: "web_failed" };
      }
      const lines = results.map((r) => `• ${r.title} — ${r.url}\n  ${r.snippet ?? ""}`);
      return {
        request: req,
        context: `${WEB_SEARCH_NOTE}\n${lines.join("\n")}`,
        note: "web_ok",
      };
    }

    case "web_fetch": {
      const { result, error } = await webFetch(req.url);
      if (error || !result) {
        return { request: req, context: WEB_FAIL_NOTE, note: "web_failed" };
      }
      const body = result.text.slice(0, 1500);
      return {
        request: req,
        context: `Conteúdo de ${result.url}${result.truncated ? " (truncado)" : ""}:\n${body}`,
      };
    }

    case "task_mutate": {
      const pending = detectTaskMutation(input);
      return {
        request: req,
        context: pending
          ? `O usuário pediu: ${pending.label}. Confirme brevemente e aguarde a ação dele no botão.`
          : "Confirme com o usuário qual tarefa ele quer alterar.",
        note: "needs_confirmation",
        pending: pending ?? undefined,
      };
    }

    case "list_mutate": {
      const pending = detectListMutation(input);
      return {
        request: req,
        context: pending
          ? `O usuário pediu: ${pending.label}. Confirme brevemente.`
          : "Peça ao usuário qual lista e item ele quer alterar.",
        note: "needs_confirmation",
        pending: pending ?? undefined,
      };
    }

    case "note_mutate": {
      const pending = detectNoteMutation(input);
      return {
        request: req,
        context: pending
          ? `O usuário pediu: ${pending.label}. Confirme brevemente.`
          : "Peça ao usuário qual nota ele quer alterar.",
        note: "needs_confirmation",
        pending: pending ?? undefined,
      };
    }

    case "block_mutate": {
      const pending = detectBlockMutation(input);
      return {
        request: req,
        context: pending
          ? `O usuário pediu: ${pending.label}. Confirme brevemente.`
          : "Para reagendar, sugira ao usuário usar a tela Agenda — confirmação manual ainda não automática.",
        note: "needs_confirmation",
        pending: pending ?? undefined,
      };
    }

    case "timer_control": {
      const pending = detectTimerControl(input);
      return {
        request: req,
        context: pending
          ? `O usuário pediu: ${pending.label}. Confirme brevemente.`
          : "Peça ao usuário o que ele quer fazer com o timer.",
        note: "needs_confirmation",
        pending: pending ?? undefined,
      };
    }

    case "notify":
    case "share":
      return {
        request: req,
        context:
          "Notificação/compartilhamento ainda não automatizado — oriente o usuário a usar os botões da tela correspondente.",
        note: "needs_confirmation",
      };
  }
}
