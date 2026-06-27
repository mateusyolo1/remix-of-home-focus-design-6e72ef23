import { useEffect, useRef } from "react";
import { shouldFire, useAlarms, type Alarm } from "@/lib/alarms-store";

const EVT_RING = "fm:alarm-ring";

export type AlarmRingDetail = { alarm: Alarm; firedAt: string };

export function emitAlarmRing(a: Alarm) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AlarmRingDetail>(EVT_RING, {
      detail: { alarm: a, firedAt: new Date().toISOString() },
    }),
  );
}

export function onAlarmRing(handler: (detail: AlarmRingDetail) => void) {
  if (typeof window === "undefined") return () => {};
  const fn = (e: Event) => handler((e as CustomEvent<AlarmRingDetail>).detail);
  window.addEventListener(EVT_RING, fn as EventListener);
  return () => window.removeEventListener(EVT_RING, fn as EventListener);
}

function fire(a: Alarm) {
  emitAlarmRing(a);
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
