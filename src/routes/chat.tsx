import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Send, Sparkles } from "lucide-react";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Agente IA — FocusMind" },
      { name: "description", content: "Converse com o agente FocusMind sobre seu dia." },
    ],
  }),
  component: ChatPage,
});

const messages = [
  { from: "ai", text: "Oi Tiago! Quer revisar suas três prioridades de hoje?" },
  { from: "me", text: "Sim, e me ajuda a decidir o que adiar." },
  { from: "ai", text: "Beleza. Sua agenda tem 6 blocos. Posso sugerir cortar a Sincronização Mensal — você já tem ata anterior pronta." },
];

function ChatPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader eyebrow="Agente" title="FocusMind IA" />

      <main className="flex-1 px-6 space-y-3 pb-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={[
              "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ring-1 ring-black/5",
              m.from === "ai"
                ? "bg-card text-foreground rounded-bl-sm"
                : "bg-foreground text-background ml-auto rounded-br-sm",
            ].join(" ")}
          >
            {m.from === "ai" && (
              <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-widest text-accent font-semibold">
                <Sparkles className="size-3" /> FocusMind
              </div>
            )}
            {m.text}
          </div>
        ))}
      </main>

      <div className="sticky bottom-24 px-4">
        <form className="bg-card rounded-2xl ring-1 ring-black/5 p-2 flex items-center gap-2 shadow-sm">
          <input
            type="text"
            placeholder="Pergunte algo ao agente…"
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label="Enviar"
            className="size-10 rounded-xl bg-foreground text-background grid place-items-center active:scale-95 transition-transform"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}