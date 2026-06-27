import { useEffect, useRef, useState } from "react";
import { AlarmClock, BellOff, ChevronRight, Moon } from "lucide-react";

import { onAlarmRing, type AlarmRingDetail } from "@/lib/alarm-runner";
import { useAlarms, type Alarm } from "@/lib/alarms-store";

type Queued = AlarmRingDetail;

/** Loop de beep com Web Audio enquanto o alarme está ativo. */
function useAlarmSound(active: boolean, enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!active || !enabled) {
      stopRef.current();
      return;
    }
    try {
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      let stopped = false;
      const tick = () => {
        if (stopped) return;
        const t0 = ctx.currentTime;
        for (let i = 0; i < 2; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = i === 0 ? 880 : 988;
          osc.connect(gain);
          gain.connect(ctx.destination);
          const s = t0 + i * 0.45;
          gain.gain.setValueAtTime(0, s);
          gain.gain.linearRampToValueAtTime(0.28, s + 0.02);
          gain.gain.linearRampToValueAtTime(0, s + 0.4);
          osc.start(s);
          osc.stop(s + 0.45);
        }
      };
      tick();
      const id = window.setInterval(tick, 1400);
      const vib = window.setInterval(() => {
        try {
          if ("vibrate" in navigator) navigator.vibrate([300, 150, 300]);
        } catch {
          /* noop */
        }
      }, 1400);
      stopRef.current = () => {
        stopped = true;
        window.clearInterval(id);
        window.clearInterval(vib);
        ctx.close().catch(() => {});
        ctxRef.current = null;
      };
    } catch {
      /* sem áudio */
    }
    return () => stopRef.current();
  }, [active, enabled]);
}

function fmtNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AlarmOverlay() {
  const [queue, setQueue] = useState<Queued[]>([]);
  const [now, setNow] = useState(fmtNow());
  const { add } = useAlarms();
  const current: Queued | undefined = queue[0];

  useEffect(() => {
    return onAlarmRing((d) => setQueue((q) => [...q, d]));
  }, []);

  useEffect(() => {
    if (!current) return;
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const id = window.setInterval(() => setNow(fmtNow()), 15_000);
    return () => window.clearInterval(id);
  }, [current]);

  useAlarmSound(!!current, !!current?.alarm.sound);

  if (!current) return null;
  const a: Alarm = current.alarm;

  const dismiss = () => setQueue((q) => q.slice(1));

  const snooze = (minutes: number) => {
    const t = new Date(Date.now() + minutes * 60_000);
    const hh = String(t.getHours()).padStart(2, "0");
    const mm = String(t.getMinutes()).padStart(2, "0");
    add({
      label: `${a.label || "Alarme"} (soneca)`,
      time: `${hh}:${mm}`,
      repeat: "once",
      sound: a.sound,
      notify: a.notify,
    });
    dismiss();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background text-foreground">
      {/* Halo animado de fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 size-[520px] rounded-full bg-foreground/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 size-[360px] rounded-full bg-foreground/[0.04] blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center justify-center flex-1 px-6 text-center">
        <div className="grid place-items-center size-20 rounded-3xl bg-foreground text-background shadow-2xl shadow-foreground/20 mb-8 animate-bounce">
          <AlarmClock className="size-10" />
        </div>

        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
          Alarme tocando
        </p>
        <h1 className="text-7xl font-light tracking-tight tabular-nums leading-none mb-4">
          {a.time}
        </h1>
        <p className="text-xl font-medium max-w-xs">
          {a.label || "Sem rótulo"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Agora são {now}</p>

        {queue.length > 1 && (
          <div className="mt-6 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            +{queue.length - 1} alarme{queue.length - 1 > 1 ? "s" : ""} na fila
          </div>
        )}
      </div>

      <div className="relative px-6 pb-10 pt-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[5, 10, 15].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => snooze(m)}
              className="flex flex-col items-center gap-1 rounded-2xl bg-card border border-border py-3 active:scale-95 transition"
            >
              <Moon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{m} min</span>
            </button>
          ))}
        </div>
        <SwipeToDismiss onDismiss={dismiss} />

      </div>
    </div>
  );
}
