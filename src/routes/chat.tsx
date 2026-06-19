import { createFileRoute, Link } from "@tanstack/react-router";

import { AlertTriangle, CalendarClock, Check, CheckSquare, Clock, Cloud, FileSearch, Globe, Hash, Home as HomeIcon, ListChecks, Ruler, Send, Settings2, Shuffle, Sparkles, Split, StickyNote, Tag, ThumbsDown, ThumbsUp, Timer as TimerIcon, Wrench, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAgentConfig } from "@/lib/agent-store";
import { runAgent, type ChatMsg } from "@/lib/agent";
import type { RouteTarget } from "@/lib/agents/router";
import type { RoutedAction } from "@/lib/agents/orchestrator";
import { useExecuteActions } from "@/lib/agents/execute";
import { buildProfileContext, useProfile } from "@/lib/profile-store";
import { submitAgentFeedback, type AgentFeedbackKind } from "@/lib/hermes/agent-core";
import type { PendingMutation } from "@/lib/hermes/tools/tool-executor";
import { completeTask, reopenTask, deleteTask, moveTaskToToday } from "@/lib/hermes/tools/task-mutations";
import { deleteList, completeList } from "@/lib/hermes/tools/list-mutations";
import { deleteNote, archiveNote } from "@/lib/hermes/tools/note-mutations";
import { cancelBlock } from "@/lib/hermes/tools/block-mutations";
import { pauseTimer, resumeTimer, stopTimer, resetTimer, extendTimer } from "@/lib/hermes/tools/timer-control";
import { createAlarm } from "@/lib/hermes/tools/notify-tool";
import { recordAutoExec, recordConfirmation, recordRating, shouldAutoConfirm, type DownReason } from "@/lib/hermes/training";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Hermes — Agente IA" },
      { name: "description", content: "Converse com o Hermes: ele roteia sua fala para Agenda, Timer e Home." },
    ],
  }),
  component: ChatPage,
});

type UiMsg = {
  role: "user" | "assistant";
  content: string;
  routed?: RoutedAction[];
  toolUsed?: string;
  toolsUsed?: string[];
  pending?: PendingMutation;
  pendingResolved?: "yes" | "no" | "auto";
  /** Snapshot do input do usuário que originou esta resposta (para training). */
  forInput?: string;
  /** Rating registrado pelo usuário. */
  rated?: "up" | "down";
};

const GREETING: UiMsg = {
  role: "assistant",
  content:
    "Oi, sou o Hermes. Fale naturalmente — eu divido em partes e mando para a Agenda, Timer ou Home. Ex.: \"amanhã 14h reunião com João, depois 25min de foco e me lembra de comprar pão\".",
};

const STORAGE_KEY = "fm.hermes.chat";

function loadMessages(): UiMsg[] {
  if (typeof window === "undefined") return [GREETING];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [GREETING];
    const parsed = JSON.parse(raw) as UiMsg[];
    return Array.isArray(parsed) && parsed.length ? parsed : [GREETING];
  } catch {
    return [GREETING];
  }
}

function ChatPage() {
  const [config] = useAgentConfig();
  const [messages, setMessages] = useState<UiMsg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);

  const [profile] = useProfile();
  const execute = useExecuteActions();

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    const loaded = loadMessages();
    setMessages(loaded);
    // marca hidratado só DEPOIS que o setState propagar — usa microtask
    // para garantir que o efeito de persistência ignore o estado inicial.
    queueMicrotask(() => {
      hydratedRef.current = true;
    });
  }, []);

  // Persist on every change — só depois da hidratação para não sobrescrever
  // o histórico salvo com o GREETING inicial.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* quota or serialize errors are non-fatal */
    }
  }, [messages]);

  useEffect(() => {
    // Auto-scroll: rola tanto o container interno quanto a janela (layout flex
    // não garante container scrollável). requestAnimationFrame garante que o DOM
    // já pintou a nova mensagem antes de medir scrollHeight.
    const raf = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [messages, loading]);

  const clearHistory = () => {
    setMessages([GREETING]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    toast.success("Conversa limpa");
  };


  const hasKey =
    (config.provider === "gemini" && config.geminiKey) ||
    (config.provider === "deepseek" && config.deepseekKey);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!hasKey) {
      toast.error("Configure sua API key no Perfil → Agente IA");
      return;
    }
    const next: UiMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const history: ChatMsg[] = next.map((m) => ({ role: m.role, content: m.content }));
      const result = await runAgent(config, history, buildProfileContext(profile));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.reply || "✓",
          routed: result.routed,
          toolUsed: result.toolUsed,
          toolsUsed: result.toolsUsed,
          pending: result.pending,
          forInput: text,
        },
      ]);
      // auto-confirm pending se o usuário já confirmou esse tipo várias vezes
      if (result.pending && shouldAutoConfirm(result.pending.kind)) {
        const r = runPending(result.pending);
        if (r.ok) {
          recordAutoExec(result.pending.kind);
          toast.success("Feito (auto)");
          setMessages((prev) => prev.map((m, idx) => idx === prev.length - 1 ? { ...m, pendingResolved: "auto" } : m));
        }
      }
      if (result.routed.length) execute(result.routed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-0 inset-x-0 bottom-[112px] flex flex-col bg-background overflow-hidden">
      <div className="shrink-0 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 px-6 pt-4 pb-2 shadow-[0_1px_0_0_hsl(var(--border)/0.4)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-full bg-secondary ring-1 ring-black/5 grid place-items-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
              H
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-accent leading-none mb-0.5">Agente</p>
              <h1 className="text-base font-semibold tracking-tight text-foreground leading-tight truncate">Hermes IA</h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              to="/perfil/editar"
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-accent bg-card px-2.5 py-1.5 rounded-full ring-1 ring-black/5"
            >
              <Settings2 className="size-3" />
              {config.provider === "gemini" ? "Gemini" : "DeepSeek"}
            </Link>
            {messages.length > 1 && (
              <button
                type="button"
                onClick={clearHistory}
                className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-secondary px-2.5 py-1.5 rounded-full ring-1 ring-black/5 active:scale-95"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {!hasKey && (
        <div className="shrink-0 mx-6 mt-2 p-3 rounded-xl bg-destructive/10 ring-1 ring-destructive/30 text-xs text-destructive flex items-start gap-2">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>
            Adicione sua API key em <Link to="/perfil/editar" className="underline font-semibold">Perfil → Agente IA</Link> para o Hermes responder.
          </span>
        </div>
      )}

      <main ref={scrollRef} className="flex-1 min-h-0 px-6 pt-2 pb-3 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-end gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={[
                "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ring-1 ring-black/5 whitespace-pre-wrap",
                m.role === "assistant"
                  ? "bg-card text-foreground rounded-bl-sm"
                  : "bg-foreground text-background ml-auto rounded-br-sm",
              ].join(" ")}
            >
              {m.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-widest text-accent font-semibold">
                  <Sparkles className="size-3" /> Hermes
                </div>
              )}
              {m.content}
              {m.role === "assistant" && (m.toolsUsed?.length ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {m.toolsUsed.map((t, idx) => <ToolBadge key={`${t}-${idx}`} tool={t} />)}
                </div>
              ) : m.toolUsed ? <ToolBadge tool={m.toolUsed} /> : null)}
              {m.pending && (
                <PendingCard
                  pending={m.pending}
                  resolved={m.pendingResolved}
                  onResolve={(decision) => {
                    setMessages((prev) =>
                      prev.map((msg, idx) => (idx === i ? { ...msg, pendingResolved: decision } : msg)),
                    );
                  }}
                />
              )}
              {m.routed && m.routed.length > 0 && (
                <>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {m.routed.map((a, j) => (
                      <li key={j}>
                        <RoutedBadge action={a} />
                      </li>
                    ))}
                  </ul>
                  <FeedbackBar actions={m.routed} />
                </>
              )}
              {m.role === "assistant" && m.forInput && (
                <MessageRating
                  forInput={m.forInput}
                  tools={(m.toolsUsed ?? (m.toolUsed ? [m.toolUsed] : [])) as never}
                  rated={m.rated}
                  onRated={(r) =>
                    setMessages((prev) => prev.map((msg, idx) => (idx === i ? { ...msg, rated: r } : msg)))
                  }
                />
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start items-end gap-2 animate-[hermes-fade_200ms_ease-out]">
              <div className="size-7 rounded-full bg-gradient-to-br from-accent/70 to-accent grid place-items-center text-accent-foreground shadow-sm ring-1 ring-accent/40 animate-[hermes-pulse_1.6s_ease-in-out_infinite]">
                <Sparkles className="size-3.5 animate-[hermes-spin_3s_linear_infinite]" />
              </div>
              <div className="px-3 py-2 rounded-2xl rounded-bl-sm bg-secondary ring-1 ring-black/5 flex items-center gap-1 shadow-sm">
                <span className="size-1.5 rounded-full bg-accent" style={{ animation: "hermes-dot 1.1s 0ms infinite ease-in-out" }} />
                <span className="size-1.5 rounded-full bg-accent" style={{ animation: "hermes-dot 1.1s 160ms infinite ease-in-out" }} />
                <span className="size-1.5 rounded-full bg-accent" style={{ animation: "hermes-dot 1.1s 320ms infinite ease-in-out" }} />
              </div>
              <style>{`
                @keyframes hermes-fade { from { opacity: 0; transform: translateY(4px);} to { opacity:1; transform: translateY(0);} }
                @keyframes hermes-dot { 0%,60%,100% { transform: translateY(0); opacity:.4;} 30% { transform: translateY(-3px); opacity:1;} }
                @keyframes hermes-pulse { 0%,100% { transform: scale(1); box-shadow: 0 0 0 0 hsl(var(--accent) / 0.4);} 50% { transform: scale(1.06); box-shadow: 0 0 0 6px hsl(var(--accent) / 0);} }
                @keyframes hermes-spin { to { transform: rotate(360deg);} }
              `}</style>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <div className="shrink-0 px-4 pb-3 pt-2 bg-gradient-to-t from-background via-background to-background/0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="max-w-md mx-auto bg-card rounded-2xl ring-1 ring-black/5 p-2 flex items-center gap-2 shadow-lg"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Fale livre — agenda, timer ou home…"
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            disabled={loading}
          />
          <button
            type="submit"
            aria-label="Enviar"
            disabled={loading || !input.trim()}
            className="size-10 rounded-xl bg-foreground text-background grid place-items-center active:scale-95 transition-transform disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function iconForAction(a: RoutedAction) {
  switch (a.type) {
    case "create_task":
      return CheckSquare;
    case "create_list":
      return ListChecks;
    case "create_note":
      return StickyNote;
    case "create_block":
      return CalendarClock;
    case "start_timer":
      return TimerIcon;
    default:
      return HomeIcon;
  }
}

function RoutedBadge({ action }: { action: RoutedAction }) {
  const target: RouteTarget = action._target;
  const styleMap: Record<RouteTarget, string> = {
    agenda: "bg-blue-500/10 text-blue-600 ring-blue-500/20",
    timer: "bg-orange-500/10 text-orange-600 ring-orange-500/20",
    home: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
    chat: "bg-secondary text-foreground ring-black/5",
  };
  const Icon = iconForAction(action);
  return (
    <span
      className={`inline-flex items-start gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md ring-1 ${styleMap[target]}`}
    >
      <Icon className="size-3.5 shrink-0 mt-[1px]" strokeWidth={2} />
      <span className="leading-snug">{labelFor(action)}</span>
    </span>
  );
}

function labelFor(a: RoutedAction): string {
  switch (a.type) {
    case "create_task":
      return `${a.title}${a.tag ? ` · ${a.tag}` : ""}`;
    case "create_block":
      return `${a.time}${a.date ? ` (${a.date})` : ""} · ${a.title}`;
    case "create_note":
      return `Nota: ${a.title}`;
    case "create_list":
      return `${a.title} (${a.items.length})${a.tag ? ` · ${a.tag}` : ""}`;
    case "start_timer":
      return `${a.minutes}min${a.title ? ` · ${a.title}` : ""}`;
  }
}

function FeedbackBar({ actions }: { actions: RoutedAction[] }) {
  const [sent, setSent] = useState<AgentFeedbackKind | null>(null);
  const send = (kind: AgentFeedbackKind) => {
    const summary = actions.map((a) => labelFor(a)).join(" | ");
    submitAgentFeedback({ kind, summary });
    setSent(kind);
    toast.success("Feedback registrado");
  };
  if (sent) {
    return (
      <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        Obrigado — o Hermes aprendeu.
      </p>
    );
  }
  const btn = "size-6 rounded-md ring-1 inline-flex items-center justify-center active:scale-95 transition";
  return (
    <div className="mt-2 flex justify-end gap-1">
      <button title="Ficou bom" aria-label="Ficou bom" onClick={() => send("good")} className={`${btn} bg-emerald-500/10 text-emerald-600 ring-emerald-500/20`}>
        <ThumbsUp className="size-3.5" />
      </button>
      <button title="Tag errada" aria-label="Tag errada" onClick={() => send("wrong_category")} className={`${btn} bg-secondary text-muted-foreground ring-black/5`}>
        <Tag className="size-3.5" />
      </button>
      <button title="Tipo errado" aria-label="Tipo errado" onClick={() => send("wrong_type")} className={`${btn} bg-secondary text-muted-foreground ring-black/5`}>
        <Shuffle className="size-3.5" />
      </button>
      <button title="Agrupou/separou errado" aria-label="Agrupou ou separou errado" onClick={() => send("wrong_grouping")} className={`${btn} bg-secondary text-muted-foreground ring-black/5`}>
        <Split className="size-3.5" />
      </button>
      <button title="Não criar" aria-label="Não criar" onClick={() => send("should_not_create")} className={`${btn} bg-destructive/10 text-destructive ring-destructive/20`}>
        <ThumbsDown className="size-3.5" />
      </button>
    </div>
  );
}

const TOOL_META: Record<string, { label: string; Icon: typeof Wrench }> = {
  time: { label: "tempo", Icon: Clock },
  tasks_read: { label: "tarefas", Icon: CheckSquare },
  task_mutate: { label: "tarefa", Icon: CheckSquare },
  agenda_read: { label: "agenda", Icon: CalendarClock },
  block_mutate: { label: "agenda", Icon: CalendarClock },
  lists_read: { label: "listas", Icon: ListChecks },
  list_mutate: { label: "lista", Icon: ListChecks },
  notes_read: { label: "notas", Icon: StickyNote },
  note_mutate: { label: "nota", Icon: StickyNote },
  timer_read: { label: "timer", Icon: TimerIcon },
  timer_control: { label: "timer", Icon: TimerIcon },
  memory_recall: { label: "memória", Icon: Hash },
  memory_save: { label: "memória", Icon: Hash },
  calc: { label: "cálculo", Icon: Hash },
  units: { label: "unidades", Icon: Ruler },
  weather: { label: "clima", Icon: Cloud },
  web_search: { label: "busca web", Icon: Globe },
  web_fetch: { label: "página", Icon: FileSearch },
  notify: { label: "notificar", Icon: Wrench },
  share: { label: "compartilhar", Icon: Wrench },
};

function ToolBadge({ tool }: { tool: string }) {
  const meta = TOOL_META[tool] ?? { label: tool, Icon: Wrench };
  const Icon = meta.Icon;
  return (
    <div className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full ring-1 ring-black/5">
      <Icon className="size-3" /> {meta.label}
    </div>
  );
}

function runPending(p: PendingMutation): { ok: boolean; reason?: string } {
  switch (p.kind) {
    case "complete_task": return completeTask(p.query);
    case "reopen_task": return reopenTask(p.query);
    case "delete_task": return deleteTask(p.query);
    case "move_task_today": return moveTaskToToday(p.query);
    case "delete_list": return deleteList(p.query);
    case "complete_list": return completeList(p.query);
    case "delete_note": return deleteNote(p.query);
    case "archive_note": return archiveNote(p.query);
    case "cancel_block": return cancelBlock(p.query);
    case "timer_pause": return pauseTimer();
    case "timer_resume": return resumeTimer();
    case "timer_stop": return stopTimer();
    case "timer_reset": return resetTimer();
    case "timer_extend": return extendTimer(p.minutes);
    case "create_alarm": {
      const r = createAlarm({ label: p.title, time: p.time, repeat: p.repeat });
      return r.ok ? { ok: true } : { ok: false, reason: r.reason };
    }
  }
}

function PendingCard({
  pending,
  resolved,
  onResolve,
}: {
  pending: PendingMutation;
  resolved?: "yes" | "no" | "auto";
  onResolve: (decision: "yes" | "no") => void;
}) {
  const confirm = () => {
    const r = runPending(pending);
    if (r.ok) toast.success("Feito");
    else toast.error(r.reason ?? "Não foi possível executar");
    recordConfirmation(pending.kind, "yes");
    onResolve("yes");
  };
  const decline = () => {
    toast("Ok, deixei como estava");
    recordConfirmation(pending.kind, "no");
    onResolve("no");
  };
  if (resolved) {
    return (
      <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        {resolved === "yes" ? "✓ Confirmado" : resolved === "auto" ? "✓ Auto-executado (aprendido)" : "✗ Cancelado"}
      </p>
    );
  }
  return (
    <div className="mt-3 p-3 rounded-xl bg-secondary/70 ring-1 ring-black/5 flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-foreground">{pending.label}</span>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={confirm}
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30 active:scale-95"
        >
          <Check className="size-3.5" /> Sim
        </button>
        <button
          onClick={decline}
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-secondary text-muted-foreground ring-1 ring-black/5 active:scale-95"
        >
          <X className="size-3.5" /> Não
        </button>
      </div>
    </div>
  );
}

const DOWN_REASONS: { value: DownReason; label: string }[] = [
  { value: "wrong_tool", label: "Ferramenta errada" },
  { value: "too_long", label: "Muito longo" },
  { value: "too_formal", label: "Muito formal" },
  { value: "missed_info", label: "Faltou info" },
  { value: "wrong_action", label: "Ação errada" },
  { value: "other", label: "Outro" },
];

function MessageRating({
  forInput,
  tools,
  rated,
  onRated,
}: {
  forInput: string;
  tools: string[];
  rated?: "up" | "down";
  onRated: (r: "up" | "down") => void;
}) {
  const [showReasons, setShowReasons] = useState(false);
  if (rated === "up") {
    return <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">✓ Obrigado — Hermes aprendeu.</p>;
  }
  if (rated === "down" && !showReasons) {
    return <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">✗ Anotado, vou ajustar.</p>;
  }
  const sendUp = () => {
    recordRating({ userInput: forInput, tools: tools as never, rating: "up" });
    toast.success("Feedback registrado");
    onRated("up");
  };
  const sendDown = (reason?: DownReason) => {
    recordRating({ userInput: forInput, tools: tools as never, rating: "down", reason });
    toast("Anotado");
    onRated("down");
    setShowReasons(false);
  };
  return (
    <div className="mt-2 flex flex-col items-end gap-1.5">
      {!showReasons ? (
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Boa resposta"
            onClick={sendUp}
            className="size-6 rounded-md inline-flex items-center justify-center bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 active:scale-95"
          >
            <ThumbsUp className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Resposta ruim"
            onClick={() => setShowReasons(true)}
            className="size-6 rounded-md inline-flex items-center justify-center bg-destructive/10 text-destructive ring-1 ring-destructive/20 active:scale-95"
          >
            <ThumbsDown className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1 justify-end max-w-full">
          {DOWN_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => sendDown(r.value)}
              className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-md bg-secondary text-muted-foreground ring-1 ring-black/5 active:scale-95"
            >
              {r.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowReasons(false)}
            className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-md bg-secondary text-muted-foreground ring-1 ring-black/5"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}



