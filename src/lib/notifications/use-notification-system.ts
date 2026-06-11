import { useEffect } from "react";
import {
  initNotificationBridge,
} from "@/lib/notifications/notification-actions";
import { rehydrateScheduled } from "@/lib/notifications/notification-service";
import { useReminderEngine } from "@/lib/reminders/reminder-engine";

/**
 * Hook único que liga o sistema de notificações:
 *  - registra a ponte com o service worker
 *  - re-hidrata notificações agendadas
 *  - mantém os lembretes de tarefas sincronizados
 */
export function useNotificationSystem() {
  useEffect(() => {
    initNotificationBridge();
    rehydrateScheduled();
    const onVisible = () => {
      if (document.visibilityState === "visible") rehydrateScheduled();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  useReminderEngine();
}
