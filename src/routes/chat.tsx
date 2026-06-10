import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { AlertTriangle, Send, Settings2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAgentConfig } from "@/lib/agent-store";
import { runAgent, type AgentAction, type ChatMsg } from "@/lib/agent";
import { useActiveTask, useBlocks, useNotes, useTasks } from "@/lib/focus-store";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Hermes — Agente IA" },
      { name: "description", content: "Converse com o Hermes para criar tarefas, blocos, notas e iniciar foco automaticamente." },
    ],
  }),
  component: ChatPage,
});

type UiMsg = { role: "user" | "assistant"; content: string; actions?: AgentAction[] };

const GREETING: UiMsg = {
  role: "assistant",
  content:
    "Oi, sou o Hermes. Me peça em linguagem natural: \"crie uma tarefa de comprar pão\", \"agenda reunião amanhã às 14h\", \"lista de compras: arroz, feijão, café\" ou \"foco de 25 minutos\".",
};

function ChatPage() {
  const [config] = useAgentConfig();
  const [messages, setMessages] = useState<UiMsg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { add: addTask } = useTasks();
  const { add: addBlock } = useBlocks();
  const { setNote } = useNotes();
  const [, setActive] = useActiveTask();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const hasKey =
    (config.provider === "gemini" && config.geminiKey) ||
    (config.provider === "deepseek" && config.deepseekKey);

  const executeActions = (actions: AgentAction[]) => {
    for (const a of actions) {
      try {
        if (a.type === "create_task") {
          addTask(a.title, a.blockTime);
          toast.success(`Tarefa: ${a.title}`);
        } else if (a.type === "create_block") {
          addBlock({
            time: a.time,
            title: a.title,
            tag: a.tag ?? "Foco",
            notes: a.notes ?? "",
            date: a.date,
          });
          toast.success(`Bloco ${a.time}: ${a.title}`);
        } else if (a.type === "create_note") {
          const key = `nota-${Date.now()}`;
          const itemsHtml = a.items?.length
            ? `<ul>${a.items.map((i) => `<li>${i}</li>`).join("")}</ul>`
            : "";
          const html = `<h2>${a.title}</h2>${itemsHtml}${a.body ? `<p>${a.body}</p>` : ""}`;
          setNote(key, html);
          toast.success(`Nota: ${a.title}`);
        } else if (a.type === "start_timer") {
          setActive({
            time: new Date().toTimeString().slice(0, 5),
            title: a.title ?? "Foco",
            tag: "Foco",
            goal: "",
            minutes: a.minutes,
          });
          toast.success(`Timer ${a.minutes}min`);
          navigate({ to: "/timer" });
        }
      } catch (err) {
        console.error(err);
        toast.error(`Falha ao executar ${a.type}`);
      }
    }
  };

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
      const result = await runAgent(config, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply || "✓", actions: result.actions },
      ]);
      if (result.actions.length) executeActions(result.actions);
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
      <PageHeader eyebrow="Agente" title="Hermes IA" />

      <div className="px-6 mb-3">
        <Link
          to="/perfil/editar"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest font-semibold text-accent bg-card px-3 py-2 rounded-full ring-1 ring-black/5"
        >
          <Settings2 className="size-3.5" />
          {config.provider === "gemini" ? "Gemini" : "DeepSeek"} · {config.model}
        </Link>
      </div>

      {!hasKey && (
        <div className="mx-6 mb-3 p-3 rounded-xl bg-destructive/10 ring-1 ring-destructive/30 text-xs text-destructive flex items-start gap-2">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>
            Adicione sua API key em <Link to="/perfil/editar" className="underline font-semibold">Perfil → Agente IA</Link> para o Hermes responder.
          </span>
        </div>
      )}

      <main ref={scrollRef} className="flex-1 px-6 space-y-3 pb-32 overflow-y-auto">
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
            {m.actions && m.actions.length > 0 && (
              <ul className="mt-2 space-y-1">
                {m.actions.map((a, j) => (
                  <li key={j} className="text-[11px] bg-secondary/60 rounded-md px-2 py-1 inline-block mr-1">
                    ✓ {labelFor(a)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {loading && (
          <div className="max-w-[85%] p-4 rounded-2xl bg-card ring-1 ring-black/5 text-sm text-muted-foreground">
            Hermes está pensando…
          </div>
        )}
      </main>

      <div className="fixed bottom-24 inset-x-0 px-4 z-30">
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
            placeholder="Peça uma tarefa, bloco, lista ou foco…"
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

function labelFor(a: AgentAction): string {
  switch (a.type) {
    case "create_task":
      return `Tarefa: ${a.title}`;
    case "create_block":
      return `Bloco ${a.time}${a.date ? ` (${a.date})` : ""}: ${a.title}`;
    case "create_note":
      return `Nota: ${a.title}${a.items?.length ? ` (${a.items.length} itens)` : ""}`;
    case "start_timer":
      return `Timer: ${a.minutes}min`;
  }
}
