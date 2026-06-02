import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — FocusMind" },
      { name: "description", content: "Blocos, compromissos e tarefas do seu dia." },
    ],
  }),
  component: AgendaPage,
});

const blocks = [
  { time: "08:30", title: "Planejamento do dia", tag: "Ritual" },
  { time: "09:00", title: "Daily Standup", tag: "Reunião" },
  { time: "10:00", title: "Deep Work — Design", tag: "Foco" },
  { time: "12:30", title: "Almoço sem tela", tag: "Pausa" },
  { time: "14:00", title: "Sincronização Mensal", tag: "Reunião" },
  { time: "16:00", title: "Revisões finais", tag: "Foco" },
];

const filters = ["Tudo", "Foco", "Reunião", "Pausa", "Ritual"] as const;

function AgendaPage() {
  return (
    <>
      <PageHeader eyebrow="Terça, 14 Out" title="Sua agenda" />
      <main className="px-6 space-y-6">
        <div className="flex items-center gap-2 bg-card rounded-xl p-2 ring-1 ring-black/5">
          <Search className="size-4 ml-2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar bloco, tag ou pessoa…"
            className="flex-1 bg-transparent text-sm outline-none py-2 placeholder:text-muted-foreground"
          />
        </div>

        <div className="-mx-6 px-6 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {filters.map((f, i) => (
              <button
                key={f}
                className={[
                  "px-4 py-2 rounded-full text-xs font-medium ring-1 transition-transform active:scale-95 whitespace-nowrap",
                  i === 0
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-card text-muted-foreground ring-black/5",
                ].join(" ")}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Blocos hoje
            </p>
            <p className="text-3xl font-semibold tabular-nums mt-1">{blocks.length}</p>
          </div>
          <button className="inline-flex items-center gap-2 bg-foreground text-background px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-transform">
            <Plus className="size-4" /> Novo bloco
          </button>
        </section>

        <section className="space-y-3">
          {blocks.map((b) => (
            <article key={b.time} className="flex gap-4 items-start">
              <span className="text-xs font-medium text-muted-foreground w-12 pt-1 tabular-nums">
                {b.time}
              </span>
              <div className="flex-1 p-4 bg-card rounded-xl ring-1 ring-black/5 border-l-2 border-foreground/70">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
                  {b.tag}
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5">{b.title}</p>
              </div>
            </article>
          ))}
        </section>
        <div className="h-4" />
      </main>
    </>
  );
}