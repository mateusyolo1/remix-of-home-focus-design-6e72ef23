/* ============================================
   NextActionCard — Card da Próxima Ação
   ============================================ */

import { ArrowUpRight, Target } from "lucide-react";
import type { ExecutionPlan } from "../../lib/hermes/hermes-types";

type Props = {
  plan: ExecutionPlan | null;
  onStartFocus?: (task: string, minutes: number) => void;
};

export function NextActionCard({ plan, onStartFocus }: Props) {
  if (!plan || !plan.nextAction) {
    return (
      <div className="block bg-card rounded-2xl p-5 ring-1 ring-black/5 text-center">
        <Target className="size-5 mx-auto text-muted-foreground" />
        <p className="text-sm font-medium mt-2 text-foreground">Nenhuma tarefa pendente</p>
        <p className="text-xs text-muted-foreground mt-1">Use o painel "Despejar Mente" para criar tarefas</p>
      </div>
    );
  }

  const totalUndone =
    plan.now.length + plan.later.length + plan.review.length;

  return (
    <div className="bg-zinc-900 text-background rounded-2xl p-5 ring-1 ring-black/5">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs text-zinc-400 font-medium inline-flex items-center gap-1.5">
            <Target className="size-3" />
            Próxima ação
          </p>
          <h4 className="text-lg font-medium leading-tight text-balance">
            {plan.nextAction.text}
          </h4>
        </div>
        <ArrowUpRight className="size-5 text-zinc-400 shrink-0 mt-0.5" />
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
        <span>
          <span className="font-medium text-background">{plan.now.length}</span> agora
        </span>
        <span className="w-px h-3 bg-zinc-700" />
        <span>
          <span className="font-medium text-background">{plan.later.length}</span> depois
        </span>
        <span className="w-px h-3 bg-zinc-700" />
        <span>
          <span className="font-medium text-background">{plan.review.length}</span> revisão
        </span>
        <span className="w-px h-3 bg-zinc-700" />
        <span>
          <span className="font-medium text-background">{plan.suggestedFocusMinutes}</span> min sugeridos
        </span>
      </div>

      {onStartFocus && (
        <button
          onClick={() => onStartFocus(plan.nextAction.text, plan.suggestedFocusMinutes)}
          className="mt-3 w-full bg-background/10 hover:bg-background/20 text-background rounded-xl py-2 text-xs font-medium transition-colors active:scale-[0.98]"
        >
          Focar nesta tarefa
        </button>
      )}
    </div>
  );
}
