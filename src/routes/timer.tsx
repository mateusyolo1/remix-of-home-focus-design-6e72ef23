import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Check, Pause, Play, RotateCcw, SkipForward, Target, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useActiveTask, useTasks } from "@/lib/focus-store";
import { logActivity } from "@/lib/activity-log";
import {
  clearTimer,
  createTimer,
  pauseTimer,
  resetTimer,
  setTimerDuration,
  startTimer,
  usePersistedTimer,
  completeTimer,
  getStoredTimer,
} from "@/lib/timer/timer-store";
import { getTimerSnapshot } from "@/lib/timer/timer-engine";
import {
  cancelByEntity,
  scheduleNotification,
  showNotificationNow,
} from "@/lib/notifications/notification-service";

export const Route = createFileRoute("/timer")({
  head: () => ({
    meta: [
      { title: "Timer — FocusMind" },
      { name: "description", content: "Sessão de foco com timer persistente." },
    ],
  }),
  component: TimerPage,
});

const DEFAULT_MIN = 25;
const ITEM_H = 44;

function TimerPage() {
  const [active, setActive] = useActiveTask();
  const { tasks, toggle } = useTasks();
  const persisted = usePersistedTimer();

  // Garante que existe um timer (idle) ao entrar na tela.
  // IMPORTANTE: lê direto do storage para não usar o closure stale de `persisted`
  // (que é null no primeiro render antes do hook hidratar).
  useEffect(() => {
    const stored = getStoredTimer();
    if (!stored) {
      const minutes = active?.minutes ?? DEFAULT_MIN;
      createTimer({
        durationMs: minutes * 60_000,
        title: active?.title ?? "Foco",
        tag: active?.tag,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh visual a cada 1s — fonte da verdade continua sendo expectedEndAt.
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Detecta término: marca completed + dispara alerta dentro do app.
  const completedFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!persisted) return;
    const snap = getTimerSnapshot(persisted);
    if (snap.isCompleted && persisted.status !== "completed") {
      completeTimer();
      if (completedFiredRef.current !== persisted.id) {
        completedFiredRef.current = persisted.id;
        logActivity({
          kind: "focus",
          title: persisted.title,
          detail: `${Math.round(persisted.durationMs / 60_000)} min`,
          tag: persisted.tag,
          minutes: Math.round(persisted.durationMs / 60_000),
        });
        showNotificationNow({
          title: "Tempo finalizado",
          body: `Seu timer "${persisted.title}" terminou.`,
          kind: "timer_end",
          entityId: persisted.id,
          entityType: "timer",
          openPath: "/timer",
          actions: [
            { action: "complete", title: "Concluir" },
            { action: "restart_timer", title: "Reiniciar" },
            { action: "open", title: "Abrir" },
          ],
        });
      }
    }
  });

  const snap = getTimerSnapshot(persisted);
  const totalMs = persisted?.durationMs ?? DEFAULT_MIN * 60_000;
  const remaining = snap.remainingMs;
  const mm = Math.floor(remaining / 60_000);
  const ss = Math.floor((remaining % 60_000) / 1000);
  const display = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const progress = Math.max(0, Math.min(1, 1 - remaining / totalMs));
  const dashOffset = 289 * (1 - progress);
  const running = snap.status === "running";

  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Sync minutes from active task seleção quando muda manualmente (não auto-reseta).
  useEffect(() => {
    if (!active?.minutes) return;
    const cur = getStoredTimer();
    // só atualiza se for outro título/task — evita resets indesejados
    if (cur && cur.status !== "running" && cur.title !== active.title) {
      setTimerDuration(active.minutes * 60_000);
    }
  }, [active?.time, active?.minutes, active?.title]);

  const handleStart = () => {
    if (!persisted) {
      createTimer({
        durationMs: (active?.minutes ?? DEFAULT_MIN) * 60_000,
        title: active?.title ?? "Foco",
        tag: active?.tag,
      });
    }
    const started = startTimer();
    if (started?.expectedEndAt) {
      // Agenda notificação para o término exato.
      cancelByEntity("timer", started.id);
      scheduleNotification({
        id: `timer:${started.id}:end`,
        kind: "timer_end",
        title: "Tempo finalizado",
        body: `Seu timer "${started.title}" terminou.`,
        scheduledAt: started.expectedEndAt,
        entityId: started.id,
        entityType: "timer",
      });
    }
  };

  const handlePause = () => {
    pauseTimer();
    if (persisted) cancelByEntity("timer", persisted.id);
  };

  const handleReset = () => {
    resetTimer();
    if (persisted) cancelByEntity("timer", persisted.id);
  };

  const handleComplete = () => {
    if (persisted) {
      logActivity({
        kind: "focus",
        title: persisted.title,
        detail: `${Math.round((persisted.durationMs - snap.remainingMs) / 60_000)} min`,
        tag: persisted.tag,
        minutes: Math.round((persisted.durationMs - snap.remainingMs) / 60_000),
      });
      cancelByEntity("timer", persisted.id);
    }
    completeTimer();
  };

  const updateGoal = (goal: string) => {
    if (!active) return;
    setActive({ ...active, goal });
  };

  const updateMinutes = (m: number, s: number) => {
    const ms = m * 60_000 + s * 1000;
    setTimerDuration(ms);
    if (active) setActive({ ...active, minutes: m });
    setOpen(false);
  };

  const linkedTasks = active ? tasks.filter((t) => t.blockTime === active.time) : [];

  return (
    <>
      <PageHeader eyebrow="Sessão de foco" title="Timer" />
      <main className="px-6 space-y-6">
        {active ? (
          <section className="bg-foreground text-background rounded-2xl p-5 ring-1 ring-black/10">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="min-w-0 text-left flex-1 active:scale-[0.99] transition-transform"
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">
                  Foco atual · {active.tag} · {active.time}
                </p>
                <h2 className="text-lg font-semibold mt-1 leading-snug">{active.title}</h2>
                <p className="text-[10px] mt-1 opacity-60">Toque para trocar de tarefa</p>
              </button>
              <button
                onClick={() => {
                  setActive(null);
                  clearTimer();
                }}
                aria-label="Encerrar foco"
                className="size-8 -mr-1 shrink-0 rounded-full bg-background/15 grid place-items-center active:scale-95 transition-transform"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-1.5">
                Meta da sessão
              </p>
              <input
                type="text"
                value={active.goal}
                onChange={(e) => updateGoal(e.target.value)}
                placeholder="Ex.: revisar apenas o feedback do cliente"
                className="w-full bg-background/10 placeholder:text-background/50 text-sm rounded-lg px-3 py-2.5 outline-none ring-1 ring-background/15 focus:ring-background/40"
              />
            </div>
          </section>
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="block w-full bg-card rounded-2xl p-5 ring-1 ring-black/5 ring-dashed text-center active:scale-[0.99] transition-transform"
          >
            <Target className="size-5 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium mt-2">Conectar a uma tarefa</p>
            <p className="text-xs text-muted-foreground mt-1">
              Opcional — escolha um bloco da sua agenda
            </p>
          </button>
        )}

        <section className="bg-card rounded-3xl p-8 ring-1 ring-black/5 flex flex-col items-center">
          <div className="relative size-64 grid place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
              <circle
                cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2"
                strokeDasharray="289" strokeDashoffset={dashOffset} strokeLinecap="round"
                className="text-foreground transition-[stroke-dashoffset] duration-700"
              />
            </svg>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Definir tempo"
              className="text-center rounded-2xl px-4 py-2 active:scale-[0.98] transition-transform"
            >
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {snap.status === "completed" ? "Finalizado" : "Restante"}
              </p>
              <p className="text-6xl font-medium tracking-tighter tabular-nums mt-1">{display}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {persisted?.title ?? active?.title ?? "Sessão livre"}
              </p>
            </button>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={handleReset}
              aria-label="Reiniciar"
              className="size-12 rounded-full bg-secondary grid place-items-center ring-1 ring-black/5 active:scale-95 transition-transform"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              onClick={running ? handlePause : handleStart}
              className="px-8 h-14 rounded-full bg-foreground text-background font-medium inline-flex items-center gap-2 active:scale-95 transition-transform"
            >
              {running ? <Pause className="size-4" /> : <Play className="size-4" />}
              {running ? "Pausar" : "Iniciar"}
            </button>
            <button
              onClick={handleComplete}
              aria-label="Concluir sessão"
              className="size-12 rounded-full bg-secondary grid place-items-center ring-1 ring-black/5 active:scale-95 transition-transform"
            >
              <SkipForward className="size-4" />
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
            {[5, 15, 25, 45, 60].map((min) => {
              const isCurrent =
                persisted &&
                persisted.status !== "running" &&
                Math.round(persisted.durationMs / 60_000) === min;
              return (
                <button
                  key={min}
                  type="button"
                  onClick={() => updateMinutes(min, 0)}
                  disabled={running}
                  className={[
                    "text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full ring-1 transition active:scale-95 disabled:opacity-40",
                    isCurrent
                      ? "bg-foreground text-background ring-foreground"
                      : "bg-secondary text-muted-foreground ring-black/5",
                  ].join(" ")}
                >
                  {min} min
                </button>
              );
            })}
          </div>
        </section>

        {active && linkedTasks.length > 0 && (
          <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Tarefas deste bloco
            </p>
            <ul className="space-y-2">
              {linkedTasks.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => toggle(t.id)}
                    className="w-full flex items-center gap-3 text-left bg-secondary rounded-xl px-3 py-2 active:scale-[0.99] transition-transform"
                  >
                    <span
                      className={[
                        "size-5 rounded-full grid place-items-center ring-1",
                        t.done ? "bg-foreground text-background ring-foreground" : "ring-border",
                      ].join(" ")}
                    >
                      {t.done && <Check className="size-3" />}
                    </span>
                    <span className={["text-sm flex-1", t.done && "line-through text-muted-foreground"].filter(Boolean).join(" ")}>
                      {t.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="h-8" />
      </main>

      {open && (
        <DurationPicker
          minutes={Math.floor((persisted?.durationMs ?? DEFAULT_MIN * 60_000) / 60_000)}
          seconds={Math.floor(((persisted?.durationMs ?? 0) % 60_000) / 1000)}
          onClose={() => setOpen(false)}
          onConfirm={updateMinutes}
        />
      )}
      {pickerOpen && (
        <TaskPickerSheet
          onClose={() => setPickerOpen(false)}
          onPick={(taskId) => {
            const t = tasks.find((x) => x.id === taskId);
            if (t) {
              setActive({
                time: new Date().toTimeString().slice(0, 5),
                title: t.title,
                tag: t.tag ?? "Foco",
                goal: "",
                minutes: persisted ? Math.round(persisted.durationMs / 60_000) : DEFAULT_MIN,
              });
            }
            setPickerOpen(false);
          }}
          tasks={tasks.filter((t) => !t.done)}
        />
      )}
    </>
  );
}

function TaskPickerSheet({
  onClose,
  onPick,
  tasks,
}: {
  onClose: () => void;
  onPick: (id: string) => void;
  tasks: { id: string; title: string }[];
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-end" onClick={onClose}>
      <div
        className="w-full bg-background rounded-t-3xl p-5 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold mb-3">Escolher tarefa</p>
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma tarefa pendente.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onPick(t.id)}
                  className="w-full text-left bg-secondary rounded-xl px-3 py-2 text-sm active:scale-[0.99] transition-transform"
                >
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DurationPicker({
  minutes,
  seconds,
  onClose,
  onConfirm,
}: {
  minutes: number;
  seconds: number;
  onClose: () => void;
  onConfirm: (m: number, s: number) => void;
}) {
  const [m, setM] = useState(minutes);
  const [s, setS] = useState(seconds);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-end" onClick={onClose}>
      <div
        className="w-full bg-background rounded-t-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-center mb-3">Definir tempo</p>
        <div className="relative">
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-xl bg-secondary"
            style={{ height: ITEM_H }}
          />
          <div className="flex items-center justify-center gap-2 relative">
            <WheelColumn count={181} value={m} onChange={setM} suffix="min" />
            <p className="text-2xl font-semibold tabular-nums">:</p>
            <WheelColumn count={60} value={s} onChange={setS} suffix="seg" />
          </div>
        </div>

        <button
          onClick={() => onConfirm(m, s)}
          className="mt-5 w-full h-12 rounded-full bg-foreground text-background font-medium active:scale-[0.99] transition-transform"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}

function WheelColumn({
  count,
  value,
  onChange,
  suffix,
}: {
  count: number;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const items = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: value * ITEM_H, behavior: "auto" });
  }, [value]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(count - 1, idx));
      if (clamped !== value) onChange(clamped);
      el.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
    }, 80);
  };

  return (
    <div className="flex-1 max-w-[140px]">
      <div
        ref={ref}
        onScroll={handleScroll}
        className="relative h-[220px] overflow-y-scroll snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
        }}
      >
        <div style={{ height: ITEM_H * 2 }} />
        {items.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className="w-full snap-center grid place-items-center tabular-nums"
            style={{ height: ITEM_H }}
          >
            <span
              className={[
                "text-2xl transition-all",
                i === value ? "font-semibold text-foreground" : "text-muted-foreground/60",
              ].join(" ")}
            >
              {String(i).padStart(2, "0")}
              {i === value && <span className="ml-1 text-xs font-medium text-muted-foreground">{suffix}</span>}
            </span>
          </button>
        ))}
        <div style={{ height: ITEM_H * 2 }} />
      </div>
    </div>
  );
}
