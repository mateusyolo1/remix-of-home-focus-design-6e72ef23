import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Pause, RotateCcw, SkipForward, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const [minutes, setMinutes] = useState(17);
  const [seconds, setSeconds] = useState(42);
  const [open, setOpen] = useState(false);

  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <>
      <PageHeader eyebrow="Sessão 02 de 04" title="Foco profundo" />
      <main className="px-6 space-y-8">
        <section className="bg-card rounded-3xl p-8 ring-1 ring-black/5 flex flex-col items-center">
          <div className="relative size-64 grid place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
              <circle
                cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2"
                strokeDasharray="289" strokeDashoffset="80" strokeLinecap="round"
                className="text-foreground"
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
              <p className="text-xs text-muted-foreground mt-2">Projeto Aurora</p>
            </button>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button aria-label="Reiniciar" className="size-12 rounded-full bg-secondary grid place-items-center ring-1 ring-black/5 active:scale-95 transition-transform">
              <RotateCcw className="size-4" />
            </button>
            <button className="px-8 h-14 rounded-full bg-foreground text-background font-medium inline-flex items-center gap-2 active:scale-95 transition-transform">
              <Pause className="size-4" /> Pausar
            </button>
            <button aria-label="Próxima" className="size-12 rounded-full bg-secondary grid place-items-center ring-1 ring-black/5 active:scale-95 transition-transform">
              <SkipForward className="size-4" />
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-3">
            Predefinições
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Pomodoro", val: 25 },
              { label: "Deep work", val: 45 },
              { label: "Maratona", val: 90 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => { setMinutes(p.val); setSeconds(0); }}
                className="bg-card rounded-2xl p-4 ring-1 ring-black/5 text-left active:scale-95 transition-transform"
              >
                <p className="text-xs text-muted-foreground">{p.label}</p>
                <p className="text-xl font-semibold tabular-nums mt-1">{p.val}m</p>
              </button>
            ))}
          </div>
        </section>
        <div className="h-4" />
      </main>

      <TimePickerSheet
        open={open}
        initialMinutes={minutes}
        initialSeconds={seconds}
        onClose={() => setOpen(false)}
        onConfirm={(m, s) => { setMinutes(m); setSeconds(s); setOpen(false); }}
      />
    </>
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
          {/* selection highlight */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-secondary rounded-xl"
            style={{ height: ITEM_H }}
          />
          <div className="flex items-center justify-center gap-2 relative">
            <WheelColumn
              count={181}
              value={m}
              onChange={setM}
              suffix="min"
            />
            <p className="text-2xl font-semibold tabular-nums">:</p>
            <WheelColumn
              count={60}
              value={s}
              onChange={setS}
              suffix="seg"
            />
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

  // Sync scroll position to value when value changes externally (e.g. open)
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
