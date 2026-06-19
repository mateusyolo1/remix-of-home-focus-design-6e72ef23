/**
 * Hermes Tool Executor — executa a ToolRequest decidida pelo router
 * e devolve um trecho de contexto pra ser injetado no system prompt
 * do chat-reply. Apenas leituras + tools puras (time/calc/units/weather/
 * web). Mutações ficam fora — o orchestrator devolve uma dica pro usuário
 * confirmar via UI.
 */

import { decideTool, type ToolRequest } from "./tool-router";
import { getTimeContext, parseRelativeDate } from "./time-tool";
import { webSearch, WEB_SEARCH_NOTE, WEB_FAIL_NOTE } from "./web-search-tool";
import { webFetch } from "./web-fetch-tool";
import { listTasks, getTaskStats, getNextTask } from "./tasks-tool";
import { listLists, getListStats } from "./lists-tool";
import { listNotes } from "./notes-tool";
import { listBlocks, getNextBlock } from "./agenda-tool";
import { recallMemories } from "./memory-tool";
import { getActiveTimer } from "./timer-tool";
import { calc } from "./calc-tool";
import { getWeather } from "./weather-tool";

export type ToolRunResult = {
  request: ToolRequest;
  context: string;
  note?: string;
};

function fmtTask(t: { title: string; tag?: string; scheduledFor?: string; dueAt?: number }) {
  const bits: string[] = [t.title];
  if (t.tag) bits.push(`[${t.tag}]`);
  if (t.dueAt) bits.push(`(vence ${new Date(t.dueAt).toLocaleString("pt-BR")})`);
  else if (t.scheduledFor) bits.push(`(${t.scheduledFor})`);
  return bits.join(" ");
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

    case "task_mutate":
    case "list_mutate":
    case "note_mutate":
    case "block_mutate":
    case "timer_control":
    case "notify":
    case "share":
      return {
        request: req,
        context:
          "O usuário pediu uma ação que altera dados ou dispara notificação. Confirme o que ele quer e oriente a usar o botão correspondente na tela (Tarefas/Listas/Notas/Agenda/Timer) — a execução automática ainda não está habilitada.",
        note: "needs_confirmation",
      };
  }
}
