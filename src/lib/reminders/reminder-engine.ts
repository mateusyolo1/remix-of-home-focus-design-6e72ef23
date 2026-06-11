import { useEffect } from "react";
import { useTasks, type Task } from "@/lib/focus-store";
import {
  cancelByEntity,
  getNotificationSettings,
  listScheduled,
  scheduleNotification,
  useNotificationSettings,
} from "@/lib/notifications/notification-service";
import { planRemindersForTask } from "./reminder-rules";
import { onNotificationAction } from "@/lib/notifications/notification-actions";
import { toast } from "sonner";

function syncTaskReminders(task: Task) {
  const settings = getNotificationSettings();
  cancelByEntity("task", task.id);
  if (!settings.enabled || !settings.taskRemindersEnabled) return;
  if (task.done) return;
  const plans = planRemindersForTask({
    taskId: task.id,
    title: task.title,
    dueAt: task.dueAt,
    reminderAt: task.reminderAt,
    createdAt: task.createdAt ? new Date(task.createdAt).getTime() : Date.now(),
    done: task.done,
    notifyBeforeMinutes: task.notifyBeforeMinutes,
    settings,
  });
  for (const p of plans) {
    scheduleNotification({
      id: `task:${task.id}:${p.suffix}`,
      kind: p.kind,
      title: p.title,
      body: p.body,
      scheduledAt: p.at,
      entityId: task.id,
      entityType: "task",
    });
  }
}

/** Hook global: sincroniza reminders de tarefas + responde a ações vindas de notificações. */
export function useReminderEngine() {
  const { tasks, toggle, update } = useTasks();
  const [settings] = useNotificationSettings();

  // Resync sempre que tasks ou settings mudarem.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const scheduled = new Set(listScheduled().map((n) => n.id));
    for (const t of tasks) {
      const plans = planRemindersForTask({
        taskId: t.id,
        title: t.title,
        dueAt: t.dueAt,
        reminderAt: t.reminderAt,
        createdAt: t.createdAt ? new Date(t.createdAt).getTime() : Date.now(),
        done: t.done,
        notifyBeforeMinutes: t.notifyBeforeMinutes,
        settings,
      });
      const wanted = new Set(plans.map((p) => `task:${t.id}:${p.suffix}`));
      // Cancela ids da tarefa que não estão mais no plano.
      for (const id of scheduled) {
        if (id.startsWith(`task:${t.id}:`) && !wanted.has(id)) {
          cancelByEntity("task", t.id);
          break;
        }
      }
      syncTaskReminders(t);
    }
    // Tarefas que sumiram da store mas têm agendamento → cancelar.
    const taskIds = new Set(tasks.map((t) => t.id));
    for (const id of scheduled) {
      const match = id.match(/^task:([^:]+):/);
      if (match && !taskIds.has(match[1])) {
        cancelByEntity("task", match[1]);
      }
    }
  }, [tasks, settings]);

  // Ações vindas da notificação: marcar concluído / adiar.
  useEffect(() => {
    return onNotificationAction((msg) => {
      if (msg.entityType !== "task" || !msg.entityId) return;
      const task = tasks.find((t) => t.id === msg.entityId);
      if (!task) return;
      if (msg.action === "complete") {
        if (!task.done) toggle(task.id);
        toast.success(`Concluído: ${task.title}`);
      } else if (msg.action === "snooze") {
        const next = Date.now() + 15 * 60_000;
        update(task.id, { reminderAt: next });
        toast(`Adiado 15 min: ${task.title}`);
      }
    });
  }, [tasks, toggle, update]);
}
