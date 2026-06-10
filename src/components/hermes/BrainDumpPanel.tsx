/* ============================================
   BrainDumpPanel — Despejar Mente
   ============================================ */

import { useState } from "react";
import { Mic, Sparkles, X } from "lucide-react";
import { captureInput } from "../../lib/hermes/agents/capture-agent";
import { processUserInput } from "../../lib/hermes/hermes-core";
import { getUIState, openOrganizedWindow } from "../../lib/hermes/agents/ui-state-agent";
import { setDraftChecklist, setDraftOrganized } from "../../lib/hermes/hermes-store";
import { toast } from "sonner";

type Props = {
  onOrganized: () => void;
};

export function BrainDumpPanel({ onOrganized }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOrganize = async () => {
    const raw = text.trim();
    if (!raw) {
      toast.error("Digite ou fale algo primeiro");
      return;
    }

    setLoading(true);

    try {
      // 1. Capture
      captureInput({ rawText: raw });

      // 2. Process through Hermes pipeline
      const { organized, checklist, quality } = processUserInput(raw);

      // 3. Save results
      setDraftOrganized(organized);
      setDraftChecklist(checklist);

      // 4. Check quality
      if (quality.needsReview) {
        if (quality.problems.length > 0) {
          toast.warning(quality.problems[0]);
        }
      }

      // 5. Open organized window
      openOrganizedWindow();
      onOrganized();

      // 6. Clear input
      setText("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao organizar";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleOrganize();
    }
  };

  return (
    <div className="bg-card rounded-2xl p-5 ring-1 ring-black/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Despejar Mente
          </h3>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Fale ou digite o que vier à mente: briefings, tarefas, ideias, alterações..."
        rows={3}
        className="w-full bg-secondary rounded-xl p-3 text-sm outline-none ring-1 ring-black/5 focus:ring-foreground resize-none placeholder:text-muted-foreground"
        disabled={loading}
      />

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleOrganize}
          disabled={loading || !text.trim()}
          className="flex-1 h-10 rounded-xl bg-foreground text-background text-sm font-medium inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
        >
          {loading ? (
            "Organizando..."
          ) : (
            <>
              <Sparkles className="size-4" />
              Organizar
            </>
          )}
        </button>

        {text.trim() && (
          <button
            onClick={() => setText("")}
            aria-label="Limpar"
            className="size-10 rounded-xl bg-secondary text-muted-foreground grid place-items-center active:scale-95 transition-transform"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {text.trim().length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Enter para organizar · Shift+Enter para nova linha
        </p>
      )}
    </div>
  );
}
