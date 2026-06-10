/* ============================================
   FocusExecutionView — Visão de Execução com Foco
   ============================================ */

import { useState } from "react";
import { Check, Play, Pause, Sparkles, Target } from "lucide-react";
import type { ChecklistItem } from "../../lib/hermes/hermes-types";

type Props = {
  task: string;
  minutes: number;
  steps?: string[];
  onComplete?: () => void;
  onClose?: () => void;
};

export function FocusExecutionView({
  task,
  minutes,
  steps: initialSteps,
  onComplete,
  onClose,
}: Props) {
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const [microSteps, setMicroSteps] = useState<string[]>(initialSteps ?? []);
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());

  // Countdown effect
  const [intervalId, setIntervalId] = useState<number | null>(null);

  const toggleTimer = () => {
    if (running) {
      if (intervalId) clearInterval(intervalId);
      setIntervalId(null);
    } else {
      const id = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(id);
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setIntervalId(id);
    }
    setRunning(!running);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const toggleStep = (idx: number) => {
    const next = new Set(doneSteps);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setDoneSteps(next);
  };

  const handleComplete = () => {
    if (intervalId) clearInterval(intervalId);
    setRunning(false);
    if (onComplete) onComplete();
  };

  const progress = 1 - timeLeft / (minutes * 60);
  const dashOffset = 289 * (1 - progress);

  return (
    <div className="bg-card rounded-2xl p-5 ring-1 ring-black/5 space-y-5">
      {/* Task header */}
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
          Foco atual
        </p>
        <h3 className="text-lg font-semibold mt-1 leading-snug text-balance">{task}</h3>
      </div>

      {/* Timer */}
      <div className="flex flex-col items-center py-2">
        <div className="relative size-44 grid place-items-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-border"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="289"
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="text-foreground transition-[stroke-dashoffset] duration-700"
            />
          </svg>
          <span className="text-4xl font-medium tracking-tighter tabular-nums">
            {formatTime(timeLeft)}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={toggleTimer}
            className="px-6 h-11 rounded-full bg-foreground text-background font-medium inline-flex items-center gap-2 active:scale-95 transition-transform"
          >
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
            {running ? "Pausar" : "Iniciar"}
          </button>
          <button
            onClick={handleComplete}
            className="size-11 rounded-full bg-secondary grid place-items-center ring-1 ring-black/5 active:scale-95 transition-transform"
            aria-label="Concluir"
          >
            <Check className="size-4" />
          </button>
        </div>
      </div>

      {/* Micro-steps */}
      {microSteps.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Micro-passos
          </p>
          <ul className="space-y-1.5">
            {microSteps.map((step, idx) => (
              <li key={idx}>
                <button
                  onClick={() => toggleStep(idx)}
                  className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/60 active:scale-[0.99] transition-transform"
                >
                  <span
                    className={[
                      "size-5 shrink-0 rounded-md grid place-items-center ring-1",
                      doneSteps.has(idx)
                        ? "bg-foreground text-background ring-foreground"
                        : "bg-background ring-border",
                    ].join(" ")}
                  >
                    {doneSteps.has(idx) && <Check className="size-3" />}
                  </span>
                  <span
                    className={[
                      "text-sm flex-1",
                      doneSteps.has(idx) ? "line-through text-muted-foreground" : "text-foreground",
                    ].join(" ")}
                  >
                    {step}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="w-full text-center text-xs text-muted-foreground py-2 active:scale-95"
        >
          Fechar foco
        </button>
      )}
    </div>
  );
}
