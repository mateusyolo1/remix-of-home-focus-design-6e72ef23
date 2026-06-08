import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Plus, Sparkles, Target } from "lucide-react";
import { useActiveTask, useSteps, useTasks, type Subtask } from "@/lib/focus-store";

export const Route = createFileRoute("/foco")({
  head: () => ({
    meta: [
      { title: "Modo Uma Tarefa — FocusMind" },
      { name: "description", content: "Tela limpa para uma única tarefa em foco." },
    ],
  }),
  component: FocoPage,
});

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function suggestSteps(title: string): Subtask[] {
  const t = title.trim() || "esta tarefa";
  return [
    { id: uid(), text: `Definir o resultado claro de “${t}”`, done: false },
    { id: uid(), text: `Listar tudo que já sei sobre ${t}`, done: false },
    { id: uid(), text: `Identificar o primeiro passo de 2 minutos`, done: false },
    { id: uid(), text: `Executar o primeiro passo`, done: false },
    { id: uid(), text: `Revisar e definir o próximo micro-passo`, done: false },
  ];
}

function FocoPage() {
  const [active] = useActiveTask();
  const [steps, setSteps] = useSteps(active?.time ?? null);
  const { tasks, toggle: toggleTask } = useTasks();
  const [newStep, setNewStep] = useState("");

  if (!active) {
    return (
      <main className="px-6 py-10 max-w-md mx-auto text-center space-y-6">
        <Target className="size-8 mx-auto text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Nada em foco</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Escolha um bloco na Agenda e toque em <strong>Focar</strong> para entrar
            no modo Uma Tarefa.
          </p>
        </div>
        <Link
          to="/agenda"
          className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform"
        >
          Ir para Agenda
        </Link>
      </main>
    );
  }

  const linkedTasks = tasks.filter((t) => t.blockTime === active.time);

  const toggle = (id: string) =>
    setSteps(steps.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));

  const addStep = () => {
    const text = newStep.trim();
    if (!text) return;
    setSteps([...steps, { id: uid(), text, done: false }]);
    setNewStep("");
  };

  const divide = () => {
    if (steps.length > 0) return;
    setSteps(suggestSteps(active.title));
  };

  const done = steps.filter((s) => s.done).length;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;

  return (
    <main className="min-h-screen flex flex-col px-6 pt-6 pb-10 max-w-md mx-auto">
      <header className="flex items-center justify-between mb-6">
        <Link
          to="/timer"
          className="size-9 rounded-full bg-secondary grid place-items-center active:scale-95 transition-transform"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Uma tarefa por vez
        </p>
        <span className="size-9" />
      </header>

      <section className="bg-card rounded-3xl p-6 ring-1 ring-black/5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
          {active.tag} · {active.time}
        </p>
        <h1 className="text-2xl font-semibold leading-tight mt-2 text-balance">
          {active.title}
        </h1>
        {active.goal && (
          <p className="text-sm text-muted-foreground mt-3 italic">
            “{active.goal}”
          </p>
        )}
      </section>

      {/* Tarefas vinculadas a este bloco */}
      {linkedTasks.length > 0 && (
        <section className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
            Tarefas deste bloco
          </p>
          <ul className="space-y-1.5">
            {linkedTasks.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => toggleTask(t.id)}
                  className="w-full text-left flex items-center gap-3 p-3 bg-card rounded-xl ring-1 ring-black/5 active:scale-[0.99] transition-transform"
                >
                  <span
                    className={[
                      "size-5 shrink-0 rounded-md grid place-items-center ring-1",
                      t.done ? "bg-foreground text-background ring-foreground" : "bg-background ring-border",
                    ].join(" ")}
                  >
                    {t.done && <Check className="size-3" />}
                  </span>
                  <span className={["text-sm flex-1", t.done ? "line-through text-muted-foreground" : ""].join(" ")}>
                    {t.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {steps.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 px-1">
            <span>Progresso (passos)</span>
            <span className="tabular-nums font-medium text-foreground">
              {done}/{steps.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-foreground transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <section className="mt-6 flex-1 space-y-2">
        {steps.length === 0 ? (
          <button
            onClick={divide}
            className="w-full bg-foreground text-background rounded-2xl p-5 inline-flex items-center justify-center gap-2 font-medium active:scale-[0.99] transition-transform"
          >
            <Sparkles className="size-4" /> Dividir em passos menores
          </button>
        ) : (
          <ul className="space-y-2">
            {steps.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => toggle(s.id)}
                  className="w-full text-left flex items-start gap-3 p-4 bg-card rounded-xl ring-1 ring-black/5 active:scale-[0.99] transition-transform"
                >
                  <span
                    className={[
                      "mt-0.5 size-5 rounded-md shrink-0 grid place-items-center ring-1 transition-colors",
                      s.done
                        ? "bg-foreground text-background ring-foreground"
                        : "bg-background ring-border",
                    ].join(" ")}
                  >
                    {s.done && <Check className="size-3.5" />}
                  </span>
                  <span
                    className={[
                      "text-sm leading-relaxed",
                      s.done ? "line-through text-muted-foreground" : "text-foreground",
                    ].join(" ")}
                  >
                    {s.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-4 flex items-center gap-2 bg-card rounded-xl p-2 ring-1 ring-black/5">
        <input
          type="text"
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addStep()}
          placeholder="Adicionar um micro-passo…"
          className="flex-1 bg-transparent text-sm outline-none px-2 py-2 placeholder:text-muted-foreground"
        />
        <button
          onClick={addStep}
          aria-label="Adicionar passo"
          className="size-9 rounded-lg bg-foreground text-background grid place-items-center active:scale-95 transition-transform"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </main>
  );
}
