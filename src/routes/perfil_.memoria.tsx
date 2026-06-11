import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Brain, Check, Eye, EyeOff, RefreshCw, Tag as TagIcon, Trash2, X } from "lucide-react";
import { useHermesMemories } from "@/lib/hermes/memory-store";
import { analyzeHermesBehavior } from "@/lib/hermes/behavior-analyzer";
import {
  acceptTagSuggestion,
  clearTagSuggestion,
  getTagSuggestions,
  ignoreTagSuggestion,
  rejectTagSuggestion,
  useCustomTags,
} from "@/lib/hermes/agent-tags";
import { clearDecision, listDecisions } from "@/lib/hermes/agent-decisions";
import { triggerReanalysis } from "@/lib/hermes/agent-core";
import { useAgentMemoryStream } from "@/lib/hermes/agent-memory";
import { useLists, useQuickNotes, useTasks } from "@/lib/focus-store";
import { toast } from "sonner";

export const Route = createFileRoute("/perfil_/memoria")({
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
  const tick = useAgentMemoryStream();
  const summary = useMemo(() => analyzeHermesBehavior(), [memories, tick]);
  const suggestions = useMemo(() => getTagSuggestions("pending"), [tick]);
  const decisions = useMemo(() => listDecisions(10), [tick]);
  const { tags: customTags, remove: removeCustomTag } = useCustomTags();
  const { tasks } = useTasks();
  const { lists } = useLists();
  const { notes } = useQuickNotes();
  const [filter, setFilter] = useState<"all" | "rules" | "rejections" | "corrections">("all");

  const visible = memories.filter((m) => {
    if (m.type === "tag_suggestion" || m.type === "decision") return false;
    if (filter === "rules") return !!m.rule;
    if (filter === "rejections") return m.type === "rejection";
    if (filter === "corrections") return m.type === "correction" || m.type === "category_rule";
    return true;
  });

  const handleReanalyze = () => {
    triggerReanalysis({
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, tag: t.tag })),
      lists: lists.map((l) => ({ id: l.id, title: l.title, tag: l.tag })),
      notes: notes.map((n) => ({ id: n.id, title: n.title })),
    });
    toast.success("Reanalisado");
  };

  return (
    <div className="min-h-screen pb-32">
      <header className="px-6 pt-10 pb-5 flex items-center gap-3">
        <Link
          to="/perfil"
          className="size-9 rounded-full bg-card ring-1 ring-black/5 grid place-items-center text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-accent">Hermes</p>
          <h1 className="text-lg font-semibold tracking-tight">Memória aprendida</h1>
        </div>
        <button
          onClick={handleReanalyze}
          className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-accent bg-card px-2.5 py-1.5 rounded-full ring-1 ring-black/5"
        >
          <RefreshCw className="size-3" /> Reanalisar
        </button>
      </header>

      <section className="px-6 space-y-4">
        <div className="p-4 rounded-2xl bg-card ring-1 ring-black/5 flex items-start gap-3">
          <Brain className="size-5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">{summary.totalMemories} aprendizados ativos</p>
            <p className="text-muted-foreground text-xs mt-1">
              O Hermes ajusta organização de tarefas, listas e notas com base nessas regras.
              Nada sensível é salvo. Tudo fica neste dispositivo.
            </p>
          </div>
        </div>

        {/* Tag suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TagIcon className="size-3.5" /> Sugestões de tag
            </h2>
            {suggestions.map((s) => (
              <div key={s.memoryId} className="p-3 rounded-xl bg-card ring-1 ring-black/5">
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-xs text-muted-foreground leading-snug mt-1">{s.reason}</p>
                <div className="flex gap-1.5 mt-2.5">
                  <button
                    onClick={() => {
                      acceptTagSuggestion(s.memoryId);
                      toast.success("Tag criada");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 px-2.5 py-1 rounded-md"
                  >
                    <Check className="size-3" /> Sim, criar
                  </button>
                  <button
                    onClick={() => {
                      rejectTagSuggestion(s.memoryId);
                      toast.success("Sugestão recusada");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-destructive/10 text-destructive ring-1 ring-destructive/20 px-2.5 py-1 rounded-md"
                  >
                    <X className="size-3" /> Não
                  </button>
                  <button
                    onClick={() => ignoreTagSuggestion(s.memoryId)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-secondary text-muted-foreground ring-1 ring-black/5 px-2.5 py-1 rounded-md"
                  >
                    Ignorar
                  </button>
                  <button
                    onClick={() => clearTagSuggestion(s.memoryId)}
                    aria-label="Apagar sugestão"
                    className="ml-auto size-7 rounded-md bg-secondary text-muted-foreground grid place-items-center"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Custom tags */}
        {customTags.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Tags personalizadas
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {customTags.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-card ring-1 ring-black/5 px-2.5 py-1 rounded-full"
                >
                  {t.label}
                  <button
                    onClick={() => removeCustomTag(t.id)}
                    aria-label="Remover"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recurrent mistakes */}
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

        {/* Recent decisions */}
        {decisions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Decisões recentes
            </h2>
            <ul className="space-y-1.5">
              {decisions.map((d) => (
                <li
                  key={d.id}
                  className="p-2.5 rounded-lg bg-card ring-1 ring-black/5 text-xs flex items-start justify-between gap-2"
                >
                  <span className="text-foreground leading-snug">{d.summary}</span>
                  <button
                    onClick={() => clearDecision(d.id)}
                    aria-label="Apagar"
                    className="size-6 rounded-md bg-secondary text-muted-foreground grid place-items-center shrink-0"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Filters + memories list */}
        <div className="flex items-center justify-between gap-2 pt-2">
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

        <div className="flex flex-wrap gap-1.5">
          {(["all", "rules", "corrections", "rejections"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                "text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full ring-1",
                filter === f
                  ? "bg-foreground text-background ring-foreground"
                  : "bg-card text-muted-foreground ring-black/5",
              ].join(" ")}
            >
              {f === "all" ? "Todos" : f === "rules" ? "Regras" : f === "corrections" ? "Correções" : "Rejeições"}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            Ainda não há aprendizados. Use o Hermes, corrija quando errar, e ele aprenderá.
          </p>
        ) : (
          <ul className="space-y-2">
            {visible.map((m) => (
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
    case "tag_suggestion": return "Sugestão de tag";
    case "decision": return "Decisão";
    default: return t;
  }
}
