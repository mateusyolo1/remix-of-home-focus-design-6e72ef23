import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Check, ChevronRight, Pause, Play, RotateCcw, SkipForward, Target, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useActiveTask, useBlocks, useTasks, type Block } from "@/lib/focus-store";
import { logActivity } from "@/lib/activity-log";

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
  const [active, setActive] = useActiveTask();
  const { tasks, toggle } = useTasks();
  const [minutes, setMinutes] = useState(active?.minutes ?? 25);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Sync minutes when active task changes
  useEffect(() => {
    if (active?.minutes) {
      setMinutes(active.minutes);
      setSeconds(0);
      setRunning(false);
    }
  }, [active?.time, active?.minutes]);

  // Countdown
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s > 0) return s - 1;
        // s === 0
        return 59;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Decrement minute when seconds wrap
  useEffect(() => {
    if (!running) return;
    if (seconds === 59) {
      setMinutes((m) => {
        if (m <= 0) {
          setRunning(false);
          setSeconds(0);
          const planned = active?.minutes ?? 25;
          logActivity({
            kind: "focus",
            title: active?.title ?? "Foco",
            detail: `${planned} min`,
            tag: active?.tag,
            minutes: planned,
          });
          return 0;
        }
        return m - 1;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);


  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const totalSecs = (active?.minutes ?? 25) * 60;
  const remaining = minutes * 60 + seconds;
  const progress = Math.max(0, Math.min(1, 1 - remaining / totalSecs));
  const dashOffset = 289 * (1 - progress);

  const updateGoal = (goal: string) => {
    if (!active) return;
    setActive({ ...active, goal });
  };

  const updateMinutes = (m: number) => {
    setMinutes(m);
    setSeconds(0);
    setRunning(false);
    if (active) setActive({ ...active, minutes: m });
  };

  const logElapsed = () => {
    const planned = active?.minutes ?? 25;
    const elapsedMin = Math.max(0, planned - minutes - (seconds > 0 ? 0 : 0));
    if (elapsedMin <= 0) return;
    logActivity({
      kind: "focus",
      title: active?.title ?? "Foco",
      detail: `${elapsedMin} min`,
      tag: active?.tag,
      minutes: elapsedMin,
    });
  };

  const reset = () => {
    setRunning(false);
    logElapsed();
    setMinutes(active?.minutes ?? 25);
    setSeconds(0);
  };

  const complete = () => {
    setRunning(false);
    logElapsed();
    setMinutes(0);
    setSeconds(0);
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
                onClick={() => setActive(null)}
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
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Restante</p>
              <p className="text-6xl font-medium tracking-tighter tabular-nums mt-1">{display}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {active ? active.title : "Sessão livre"}
              </p>
            </button>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={reset}
              aria-label="Reiniciar"
              className="size-12 rounded-full bg-secondary grid place-items-center ring-1 ring-black/5 active:scale-95 transition-transform"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              onClick={() => setRunning((r) => !r)}
              className="px-8 h-14 rounded-full bg-foreground text-background font-medium inline-flex items-center gap-2 active:scale-95 transition-transform"
            >
              {running ? <Pause className="size-4" /> : <Play className="size-4" />}
              {running ? "Pausar" : "Iniciar"}
            </button>
            <button
              onClick={complete}
              aria-label="Concluir sessão"
              className="size-12 rounded-full bg-secondary grid place-items-center ring-1 ring-black/5 active:scale-95 transition-transform"
            >
              <SkipForward className="size-4" />
            </button>
          </div>
        </section>

        {/* Tarefas vinculadas ao bloco em foco */}
        {active && linkedTasks.length > 0 && (
          <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Tarefas deste bloco
            </p>
            <ul className="space-y-2">
              {linkedTasks.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => toggle(t.id)}
                    className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60 active:scale-[0.99] transition-transform"
                  >
                    <span
                      className={[
                        "size-5 shrink-0 rounded-md grid place-items-center ring-1",
                        t.done ? "bg-foreground text-background ring-foreground" : "bg-background ring-border",
                      ].join(" ")}
                    >
                      {t.done && <Check className="size-3" />}
                    </span>
                    <span
                      className={[
                        "text-sm",
                        t.done ? "line-through text-muted-foreground" : "text-foreground",
                      ].join(" ")}
                    >
                      {t.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-3">
            Predefinições
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Pomodoro", val: 25 },
              { label: "Deep work", val: 45 },
              { label: "Maratona", val: 90 },
            ].map((p) => {
              const isActive = (active?.minutes ?? minutes) === p.val;
              return (
                <button
                  key={p.label}
                  onClick={() => updateMinutes(p.val)}
                  className={[
                    "rounded-2xl p-4 ring-1 ring-black/5 text-left active:scale-95 transition-transform",
                    isActive ? "bg-foreground text-background" : "bg-card",
                  ].join(" ")}
                >
                  <p className={["text-xs", isActive ? "opacity-70" : "text-muted-foreground"].join(" ")}>{p.label}</p>
                  <p className="text-xl font-semibold tabular-nums mt-1">{p.val}m</p>
                </button>
              );
            })}
          </div>
        </section>

        {active && (
          <Link
            to="/foco"
            className="block text-center bg-secondary rounded-2xl p-4 ring-1 ring-black/5 active:scale-[0.99] transition-transform"
          >
            <p className="text-sm font-medium">Entrar no modo Uma Tarefa</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tela limpa só com esta tarefa
            </p>
          </Link>
        )}

        <div className="h-4" />
      </main>

      <TimePickerSheet
        open={open}
        initialMinutes={minutes}
        initialSeconds={seconds}
        onClose={() => setOpen(false)}
        onConfirm={(m, s) => {
          setMinutes(m);
          setSeconds(s);
          if (active) setActive({ ...active, minutes: m });
          setOpen(false);
        }}
      />

      {pickerOpen && (
        <TaskPickerSheet
          onClose={() => setPickerOpen(false)}
          onPick={(b) => {
            setActive({
              time: b.time,
              title: b.title,
              tag: b.tag,
              goal: active?.goal ?? "",
              minutes: active?.minutes ?? minutes,
            });
            setPickerOpen(false);
          }}
        />
      )}
    </>
  );
}

function TaskPickerSheet({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (b: Block) => void;
}) {
  const { blocks } = useBlocks();
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl ring-1 ring-black/5 p-5 pb-7 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Escolher tarefa</p>
          <button onClick={onClose} aria-label="Fechar" className="size-8 rounded-full bg-secondary grid place-items-center">
            <X className="size-4" />
          </button>
        </div>
        <ul className="space-y-2 max-h-[60dvh] overflow-y-auto">
          {blocks.map((b) => (
            <li key={b.time}>
              <button
                type="button"
                onClick={() => onPick(b)}
                className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary active:scale-[0.99] transition-transform"
              >
                <span className="text-xs font-medium text-muted-foreground w-12 tabular-nums">
                  {b.time}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      "text-[10px] font-semibold uppercase tracking-widest",
                      b.priority === "important" ? "text-destructive" : "text-accent",
                    ].join(" ")}
                  >
                    {b.tag}
                  </p>
                  <p className="text-sm font-medium truncate">{b.title}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const ITEM_H = 44;

function TimePickerSheet({
  open,
  initialMinutes,
  initialSeconds,
  onClose,
  onConfirm,
}: {
  open: boolean;
  initialMinutes: number;
  initialSeconds: number;
  onClose: () => void;
  onConfirm: (m: number, s: number) => void;
}) {
  const [m, setM] = useState(initialMinutes);
  const [s, setS] = useState(initialSeconds);

  useEffect(() => {
    if (open) { setM(initialMinutes); setS(initialSeconds); }
  }, [open, initialMinutes, initialSeconds]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-t-3xl ring-1 ring-black/5 p-5 pb-7 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Definir tempo</p>
          <button onClick={onClose} aria-label="Fechar" className="size-8 rounded-full bg-secondary grid place-items-center">
            <X className="size-4" />
          </button>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-secondary rounded-xl"
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
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: value * ITEM_H, behavior: "auto" });
  }, [value]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
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
