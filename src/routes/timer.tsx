import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Pause, RotateCcw, SkipForward } from "lucide-react";

export const Route = createFileRoute("/timer")({
  head: () => ({
    meta: [
      { title: "Timer — FocusMind" },
      { name: "description", content: "Sessão de foco com pomodoros configuráveis." },
    ],
  }),
  component: TimerPage,
});

function TimerPage() {
  return (
    <>
      <PageHeader eyebrow="Sessão 02 de 04" title="Foco profundo" />
      <main className="px-6 space-y-8">
        <section className="bg-card rounded-3xl p-8 ring-1 ring-black/5 flex flex-col items-center">
          <div className="relative size-64 grid place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
              <circle
                cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2"
                strokeDasharray="289" strokeDashoffset="80" strokeLinecap="round"
                className="text-foreground"
              />
            </svg>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Restante</p>
              <p className="text-6xl font-medium tracking-tighter tabular-nums mt-1">17:42</p>
              <p className="text-xs text-muted-foreground mt-2">Projeto Aurora</p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button aria-label="Reiniciar" className="size-12 rounded-full bg-secondary grid place-items-center ring-1 ring-black/5 active:scale-95 transition-transform">
              <RotateCcw className="size-4" />
            </button>
            <button className="px-8 h-14 rounded-full bg-foreground text-background font-medium inline-flex items-center gap-2 active:scale-95 transition-transform">
              <Pause className="size-4" /> Pausar
            </button>
            <button aria-label="Próxima" className="size-12 rounded-full bg-secondary grid place-items-center ring-1 ring-black/5 active:scale-95 transition-transform">
              <SkipForward className="size-4" />
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-3">
            Predefinições
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Pomodoro", val: "25m" },
              { label: "Deep work", val: "45m" },
              { label: "Maratona", val: "90m" },
            ].map((p) => (
              <button key={p.label} className="bg-card rounded-2xl p-4 ring-1 ring-black/5 text-left active:scale-95 transition-transform">
                <p className="text-xs text-muted-foreground">{p.label}</p>
                <p className="text-xl font-semibold tabular-nums mt-1">{p.val}</p>
              </button>
            ))}
          </div>
        </section>
        <div className="h-4" />
      </main>
    </>
  );
}