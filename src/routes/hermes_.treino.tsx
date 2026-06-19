import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft, BrainCog, RefreshCw, Trash2, ThumbsUp, ThumbsDown, Wrench, MessageSquare, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  clearTraining,
  isTrainingEnabled,
  runTrainingCycle,
  setTrainingEnabled,
  useTrainingRules,
} from "@/lib/hermes/training";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/hermes_/treino")({
  head: () => ({
    meta: [
      { title: "Hermes — Treino" },
      { name: "description", content: "Painel de aprendizado do Hermes: padrões aprendidos, tom, confirmações automáticas." },
    ],
  }),
  component: TreinoPage,
});

function TreinoPage() {
  const { rules } = useTrainingRules();
  const [enabled, setEnabled] = useState(true);
  useEffect(() => setEnabled(isTrainingEnabled()), []);

  const toggle = () => {
    const v = !enabled;
    setTrainingEnabled(v);
    setEnabled(v);
    toast(v ? "Treino ativado" : "Treino pausado");
  };

  const reanalyze = () => {
    runTrainingCycle();
    toast.success("Padrões reanalisados");
  };

  const wipe = () => {
    if (!window.confirm("Apagar todo o histórico de treino?")) return;
    clearTraining();
    toast.success("Histórico apagado");
  };

  const tokenEntries = Object.entries(rules.toolHints).slice(0, 20);
  const totalRatings = rules.stats.ratingsUp + rules.stats.ratingsDown;
  const approval = totalRatings > 0 ? Math.round((rules.stats.ratingsUp / totalRatings) * 100) : null;

  return (
    <>
      <PageHeader eyebrow="Hermes" title="Treino do Agente" />
      <main className="px-6 space-y-4 pb-32">
        <Link to="/perfil" className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">
          <ArrowLeft className="size-3.5" /> Voltar
        </Link>

        <section className="bg-card rounded-2xl ring-1 ring-black/5 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <span className="size-10 rounded-xl bg-secondary grid place-items-center shrink-0">
              <BrainCog className="size-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Loop de aprendizado</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                O Hermes registra cada interação, observa seus 👍/👎 e ajusta sozinho tom, ferramentas e confirmações.
              </p>
            </div>
            <button
              type="button"
              onClick={toggle}
              className={["w-11 h-6 rounded-full relative transition-colors", enabled ? "bg-foreground" : "bg-border"].join(" ")}
              aria-pressed={enabled}
            >
              <span className={["absolute top-0.5 size-5 rounded-full bg-background transition-all", enabled ? "left-[22px]" : "left-0.5"].join(" ")} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat label="Respostas" value={rules.stats.responses} />
            <Stat label="👍" value={rules.stats.ratingsUp} />
            <Stat label="👎" value={rules.stats.ratingsDown} />
          </div>
          {approval !== null && (
            <p className="text-[11px] text-muted-foreground text-center">Aprovação: {approval}%</p>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={reanalyze} className="flex-1 inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-xl py-2.5 text-sm font-medium active:scale-[0.99]">
              <RefreshCw className="size-4" /> Reanalisar
            </button>
            <button type="button" onClick={wipe} aria-label="Limpar histórico" className="size-11 rounded-xl bg-secondary grid place-items-center">
              <Trash2 className="size-4" />
            </button>
          </div>
        </section>

        <section className="bg-card rounded-2xl ring-1 ring-black/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Tom aprendido</p>
          </div>
          {rules.toneInstructions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ainda sem padrões de tom. Use 👎 → "Muito longo" / "Muito formal" algumas vezes para ensinar.</p>
          ) : (
            <ul className="space-y-1.5">
              {rules.toneInstructions.map((t, i) => (
                <li key={i} className="text-xs bg-secondary/60 rounded-lg px-3 py-2 ring-1 ring-black/5">{t}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-card rounded-2xl ring-1 ring-black/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Wrench className="size-4" />
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Padrões de ferramenta (token → tools)</p>
          </div>
          {tokenEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem padrões ainda. Cada 👍 ensina que aquelas tools fazem sentido para palavras parecidas.</p>
          ) : (
            <ul className="space-y-1.5">
              {tokenEntries.map(([tk, bag]) => (
                <li key={tk} className="text-xs bg-secondary/60 rounded-lg px-3 py-2 ring-1 ring-black/5 flex items-center justify-between gap-2">
                  <span className="font-mono">{tk}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {Object.entries(bag).map(([t, w]) => `${t} (${w})`).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-card rounded-2xl ring-1 ring-black/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Confirmações automáticas</p>
          </div>
          {rules.autoConfirmKinds.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nada automático ainda. Após 5+ confirmações seguidas do mesmo tipo de mutação, o Hermes passa a executar direto.</p>
          ) : (
            <ul className="space-y-1.5">
              {rules.autoConfirmKinds.map((k) => (
                <li key={k} className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg px-3 py-2 ring-1 ring-emerald-500/20 flex items-center justify-between">
                  <span className="font-mono">{k}</span>
                  <span className="text-[10px]">
                    ✓ {rules.stats.confirmYes[k] ?? 0} · ✗ {rules.stats.confirmNo[k] ?? 0} · auto {rules.stats.autoExec[k] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold uppercase tracking-wider">Histórico por tipo</p>
            <ul className="grid grid-cols-2 gap-1">
              {Object.entries({ ...rules.stats.confirmYes, ...rules.stats.confirmNo }).map(([k]) => (
                <li key={k} className="flex items-center gap-1 text-[10px]">
                  <ThumbsUp className="size-2.5 text-emerald-600" /> {rules.stats.confirmYes[k as never] ?? 0}
                  <ThumbsDown className="size-2.5 text-destructive ml-1" /> {rules.stats.confirmNo[k as never] ?? 0}
                  <span className="font-mono ml-1">{k}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {rules.stats.lastCycleAt && (
          <p className="text-[10px] text-muted-foreground text-center">
            Último ciclo: {new Date(rules.stats.lastCycleAt).toLocaleString("pt-BR")}
          </p>
        )}
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-secondary/60 rounded-xl ring-1 ring-black/5 p-3 text-center">
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
