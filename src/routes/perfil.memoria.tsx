import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Brain, Eye, EyeOff, Trash2 } from "lucide-react";
import { useHermesMemories } from "@/lib/hermes/memory-store";
import { analyzeHermesBehavior } from "@/lib/hermes/behavior-analyzer";
import { toast } from "sonner";

export const Route = createFileRoute("/perfil/memoria")({
  head: () => ({
    meta: [
      { title: "Memória do Hermes — FocusMind" },
      { name: "description", content: "Veja, edite e controle o que o Hermes aprendeu com você." },
    ],
  }),
  component: MemoryPage,
});

function MemoryPage() {
  const { memories, remove, toggleDisabled, clear } = useHermesMemories();
  const summary = useMemo(() => analyzeHermesBehavior(), [memories]);

  return (
    <div className="min-h-screen pb-32">
      <header className="px-6 pt-10 pb-5 flex items-center gap-3">
        <Link
          to="/perfil"
          className="size-9 rounded-full bg-card ring-1 ring-black/5 grid place-items-center text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-accent">Hermes</p>
          <h1 className="text-lg font-semibold tracking-tight">Memória aprendida</h1>
        </div>
      </header>

      <section className="px-6 space-y-4">
        <div className="p-4 rounded-2xl bg-card ring-1 ring-black/5 flex items-start gap-3">
          <Brain className="size-5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">{summary.totalMemories} aprendizados ativos</p>
            <p className="text-muted-foreground text-xs mt-1">
              O Hermes ajusta a forma de organizar tarefas, listas e notas com base nessas regras.
              Nada sensível é salvo.
            </p>
          </div>
        </div>

        {summary.recurrentMistakes.length > 0 && (
          <div className="p-4 rounded-2xl bg-secondary/40 ring-1 ring-black/5">
            <p className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground mb-2">
              Erros recorrentes detectados
            </p>
            <ul className="space-y-1 text-xs">
              {summary.recurrentMistakes.map((m, i) => (
                <li key={i} className="text-foreground">• {m}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Aprendizados
          </h2>
          {memories.length > 0 && (
            <button
              onClick={() => {
                clear();
                toast.success("Memória limpa");
              }}
              className="text-[10px] uppercase tracking-wider font-semibold text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-full ring-1 ring-destructive/20"
            >
              Limpar tudo
            </button>
          )}
        </div>

        {memories.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            Ainda não há aprendizados. Use o Hermes, corrija quando errar, e ele aprenderá.
          </p>
        ) : (
          <ul className="space-y-2">
            {memories.map((m) => (
              <li
                key={m.id}
                className={[
                  "p-3 rounded-xl bg-card ring-1 ring-black/5",
                  m.disabled ? "opacity-50" : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">
                    {labelFor(m.type)} · {Math.round(m.confidence * 100)}%
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => toggleDisabled(m.id)}
                      aria-label={m.disabled ? "Ativar" : "Desativar"}
                      className="size-7 rounded-md bg-secondary text-muted-foreground grid place-items-center"
                    >
                      {m.disabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </button>
                    <button
                      onClick={() => remove(m.id)}
                      aria-label="Apagar"
                      className="size-7 rounded-md bg-destructive/10 text-destructive grid place-items-center"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                {m.rule && (
                  <p className="text-sm text-foreground font-medium leading-snug mb-1">{m.rule}</p>
                )}
                <p className="text-xs text-muted-foreground leading-snug">{m.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function labelFor(t: string) {
  switch (t) {
    case "correction": return "Correção";
    case "rejection": return "Rejeição";
    case "category_rule": return "Categoria";
    case "acceptance": return "Aceitação";
    case "preference": return "Preferência";
    case "pattern": return "Padrão";
    case "feedback": return "Feedback";
    case "creation": return "Criação";
    default: return t;
  }
}
