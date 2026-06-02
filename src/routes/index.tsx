import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ArrowUpRight, Mic, Plus } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FocusMind — Foco do dia" },
      { name: "description", content: "Seu painel diário de foco, tarefas, agenda e notas." },
      { property: "og:title", content: "FocusMind — Foco do dia" },
      { property: "og:description", content: "Seu painel diário de foco, tarefas, agenda e notas." },
    ],
  }),
  component: Index,
});

const todayTasks = [
  { id: 1, title: "Revisar feedback do cliente" },
  { id: 2, title: "Enviar relatório semanal" },
];

const agenda = [
  { time: "09:00", title: "Daily Standup" },
  { time: "11:30", title: "Deep Work: UI Design" },
  { time: "14:00", title: "Sincronização Mensal" },
];

const recentNotes = [
  "Lembrar de comprar café especial",
  "Pesquisar referências de tipografia suíça",
];

function Index() {
  return (
    <>
      <PageHeader eyebrow="14 de Outubro" title="Olá, Tiago" streak={12} />

      <main className="px-6 space-y-8">
        {/* Hero Focus Card */}
        <section className="bg-card rounded-2xl p-6 ring-1 ring-black/5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Foco Atual
            </h3>
            <Link to="/timer" className="text-xs font-medium text-accent inline-flex items-center gap-1">
              Ajustar <ArrowUpRight className="size-3" />
            </Link>
          </div>

          <div className="flex flex-col items-center py-2">
            <span className="text-6xl font-medium tracking-tighter tabular-nums mb-8 text-foreground">
              25:00
            </span>

            <div className="flex gap-2 mb-8">
              {["25m", "45m", "90m"].map((d, i) => (
                <button
                  key={d}
                  className={[
                    "px-4 py-2 rounded-full text-xs font-medium ring-1 ring-black/5 transition-transform active:scale-95",
                    i === 0 ? "bg-foreground text-background" : "bg-secondary text-foreground",
                  ].join(" ")}
                >
                  {d}
                </button>
              ))}
            </div>

            <button className="w-full bg-foreground text-background py-4 rounded-xl font-medium text-base ring-1 ring-black/10 transition-transform active:scale-[0.98] shadow-sm">
              Iniciar Sessão
            </button>
          </div>
        </section>

        {/* Próxima Tarefa */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">
            Próxima Tarefa
          </h3>
          <div className="bg-zinc-900 text-background p-5 rounded-2xl ring-1 ring-black/5">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <p className="text-sm text-zinc-400 font-medium">Projeto Aurora</p>
                <h4 className="text-lg font-medium leading-tight text-balance">
                  Finalizar arquitetura de dados e fluxos
                </h4>
              </div>
              <div className="size-5 rounded border border-zinc-700 flex-shrink-0 mt-1" />
            </div>
          </div>

          <ul className="space-y-2">
            {todayTasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-4 p-4 bg-card rounded-xl ring-1 ring-black/5"
              >
                <span className="size-5 rounded border border-border flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{t.title}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Agenda */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Agenda
            </h3>
            <Link to="/agenda" className="text-xs font-medium text-accent">
              Ver tudo
            </Link>
          </div>
          <ul className="space-y-3">
            {agenda.map((b) => (
              <li key={b.time} className="flex gap-4 items-start">
                <span className="text-xs font-medium text-muted-foreground w-10 pt-0.5 tabular-nums">
                  {b.time}
                </span>
                <div className="flex-1 p-3 bg-secondary/60 rounded-lg border-l-2 border-border">
                  <p className="text-sm font-medium text-foreground">{b.title}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Nota Rápida */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">
            Nota Rápida
          </h3>
          <div className="bg-card rounded-2xl p-5 ring-1 ring-black/5">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                placeholder="O que está na sua mente?"
                className="flex-1 text-sm bg-secondary p-3 rounded-lg ring-1 ring-black/5 focus:ring-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                aria-label="Gravar nota"
                className="size-11 rounded-lg bg-foreground text-background grid place-items-center transition-transform active:scale-95"
              >
                <Mic className="size-4" />
              </button>
            </div>
            <ul className="space-y-3">
              {recentNotes.map((n) => (
                <li key={n} className="flex gap-3 items-center">
                  <span className="size-1 bg-border rounded-full" />
                  <p className="text-xs text-muted-foreground">{n}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="h-4" />
      </main>
    </>
  );
}
