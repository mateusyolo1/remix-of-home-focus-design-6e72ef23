import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { shouldFire, useAlarms, type Alarm } from "@/lib/alarms-store";

/** Toca um beep curto usando Web Audio (sem dependência de arquivo). */
function playBeep() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
    osc.start();
    osc.stop(ctx.currentTime + 1.25);
    setTimeout(() => ctx.close().catch(() => {}), 1600);
  } catch {
    /* sem áudio */
  }
}

function fire(a: Alarm) {
  toast(`⏰ ${a.label || "Alarme"}`, {
    description: a.time,
    duration: 8000,
  });
  if (a.sound) playBeep();
  if (a.notify && typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        new Notification(a.label || "Alarme", { body: `Programado para ${a.time}`, tag: a.id });
      } catch {
        /* noop */
      }
    }
  }
}

/** Tick global que verifica alarmes a cada 20s e dispara quando o minuto bate. */
export function useAlarmRunner() {
  const { list, update } = useAlarms();
  const listRef = useRef(list);
  useEffect(() => {
    listRef.current = list;
  }, [list]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      for (const a of listRef.current) {
        if (shouldFire(a, now)) {
          fire(a);
          if (a.repeat === "once") {
            update(a.id, { enabled: false, lastFiredAt: now.toISOString() });
          } else {
            update(a.id, { lastFiredAt: now.toISOString() });
          }
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, [update]);
}
