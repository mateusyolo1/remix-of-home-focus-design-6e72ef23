import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { AlertTriangle, CalendarClock, CheckSquare, Home as HomeIcon, ListChecks, Send, Settings2, Sparkles, StickyNote, Timer as TimerIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAgentConfig } from "@/lib/agent-store";
import { runAgent, type ChatMsg } from "@/lib/agent";
import type { RouteTarget } from "@/lib/agents/router";
import type { RoutedAction } from "@/lib/agents/orchestrator";
import { useExecuteActions } from "@/lib/agents/execute";
import { buildProfileContext, useProfile } from "@/lib/profile-store";
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

type UiMsg = { role: "user" | "assistant"; content: string; routed?: RoutedAction[] };

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

  const [profile] = useProfile();
  const execute = useExecuteActions();

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    setMessages(loadMessages());
  }, []);

  // Persist on every change.
  useEffect(() => {
    if (typeof window === "undefined") return;
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
        { role: "assistant", content: result.reply || "✓", routed: result.routed },
      ]);
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
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 px-6 pt-4 pb-2 shadow-[0_1px_0_0_hsl(var(--border)/0.4)]">
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
        <div className="mx-6 mb-3 p-3 rounded-xl bg-destructive/10 ring-1 ring-destructive/30 text-xs text-destructive flex items-start gap-2">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>
            Adicione sua API key em <Link to="/perfil/editar" className="underline font-semibold">Perfil → Agente IA</Link> para o Hermes responder.
          </span>
        </div>
      )}

      <main ref={scrollRef} className="flex-1 px-6 space-y-3 pb-24 overflow-y-auto">
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
            {m.routed && m.routed.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {m.routed.map((a, j) => (
                  <li key={j}>
                    <RoutedBadge action={a} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {loading && (
          <div className="max-w-[85%] p-4 rounded-2xl bg-card ring-1 ring-black/5 text-sm text-muted-foreground">
            Hermes está roteando…
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <div className="fixed bottom-28 inset-x-0 px-4 z-30">
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
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md ring-1 ${styleMap[target]}`}
    >
      <Icon className="size-3" />
      {labelFor(action)}
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
