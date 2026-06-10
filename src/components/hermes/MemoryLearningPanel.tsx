/* ============================================
   MemoryLearningPanel — Painel de Memória
   ============================================ */

import { useEffect, useState } from "react";
import { Brain, Trash2, Lightbulb, RefreshCw } from "lucide-react";
import {
  useMemoryPatterns,
  getMemoryPatterns,
} from "../../lib/hermes/hermes-store";
import { getMemoryStats, clearMemory } from "../../lib/hermes/agents/memory-agent";
import { toast } from "sonner";

export function MemoryLearningPanel() {
  const [patterns] = useMemoryPatterns();
  const [stats, setStats] = useState(() => getMemoryStats());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setStats(getMemoryStats());
  }, [patterns]);

  const handleClear = () => {
    clearMemory();
    setStats({ totalPatterns: 0, topCategories: [] });
    toast.success("Memória limpa");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-card rounded-2xl p-4 ring-1 ring-black/5 text-left active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-accent" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Memória do Hermes
          </p>
        </div>
        <p className="text-sm mt-2 text-foreground">
          {stats.totalPatterns > 0
            ? `${stats.totalPatterns} padrão(ões) aprendido(s)`
            : "Nenhum padrão aprendido ainda"}
        </p>
      </button>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-5 ring-1 ring-black/5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-accent" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Memória
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-[10px] font-medium text-accent"
        >
          Fechar
        </button>
      </div>

      {stats.totalPatterns === 0 ? (
        <p className="text-sm text-muted-foreground">
          O Hermes aprende com suas correções. Conforme você edita e salva notas,
          ele começa a reconhecer seus padrões e sugere melhorias automaticamente.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary rounded-xl p-3 text-center">
              <p className="text-2xl font-semibold tabular-nums">{stats.totalPatterns}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                Padrões
              </p>
            </div>
            <div className="bg-secondary rounded-xl p-3 text-center">
              <p className="text-2xl font-semibold tabular-nums">{stats.topCategories.length}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                Categorias
              </p>
            </div>
          </div>

          {stats.topCategories.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                Categorias mais aprendidas
              </p>
              <ul className="space-y-1">
                {stats.topCategories.map((cat) => (
                  <li
                    key={cat.category}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground">{cat.category}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {cat.count}x
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleClear}
          className="flex-1 h-9 rounded-xl bg-secondary text-foreground text-xs font-medium inline-flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
        >
          <Trash2 className="size-3" />
          Limpar memória
        </button>
      </div>
    </div>
  );
}
