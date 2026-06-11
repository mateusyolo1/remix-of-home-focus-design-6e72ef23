import type { NotificationSettings } from "@/lib/notifications/notification-types";

export type ReminderPlan = {
  /** Timestamp (ms) em que disparar. */
  at: number;
  /** Sufixo para id (taskId + suffix). */
  suffix: string;
  /** Tipo de notificação. */
  kind: "task_due" | "task_overdue" | "task_forgotten";
  title: string;
  body: string;
};

export function planRemindersForTask(input: {
  taskId: string;
  title: string;
  dueAt?: number;
  reminderAt?: number;
  createdAt?: number;
  done: boolean;
  notifyBeforeMinutes?: number[];
  settings: NotificationSettings;
  now?: number;
}): ReminderPlan[] {
  const now = input.now ?? Date.now();
  if (input.done) return [];
  const out: ReminderPlan[] = [];
  const due = input.dueAt ?? input.reminderAt;

  if (input.settings.taskRemindersEnabled && due && due > now - 60_000) {
    const minutes = input.notifyBeforeMinutes ?? input.settings.notifyBeforeMinutes ?? [60, 15, 0];
    for (const m of minutes) {
      const at = due - m * 60_000;
      if (at <= now) continue;
      if (m === 0) {
        out.push({
          at,
          suffix: `due-0`,
          kind: "task_due",
          title: "Prazo atingido",
          body: input.title,
        });
      } else if (m >= 60) {
        out.push({
          at,
          suffix: `due-${m}`,
          kind: "task_due",
          title: "Sua tarefa está chegando",
          body: `${input.title} em ${Math.round(m / 60)}h`,
        });
      } else {
        out.push({
          at,
          suffix: `due-${m}`,
          kind: "task_due",
          title: `Faltam ${m} min`,
          body: input.title,
        });
      }
    }

    if (input.settings.remindOverdue) {
      const overdueAt = due + 60 * 60_000;
      if (overdueAt > now) {
        out.push({
          at: overdueAt,
          suffix: `overdue`,
          kind: "task_overdue",
          title: "Você ainda não concluiu",
          body: input.title,
        });
      }
    }
  }

  // Lembrete de tarefa esquecida (sem prazo)
  if (
    input.settings.taskRemindersEnabled &&
    !due &&
    input.createdAt &&
    input.settings.forgottenTaskHours > 0
  ) {
    const at = input.createdAt + input.settings.forgottenTaskHours * 3600_000;
    if (at > now) {
      out.push({
        at,
        suffix: `forgotten`,
        kind: "task_forgotten",
        title: "Você esqueceu uma tarefa?",
        body: `A tarefa "${input.title}" ainda está pendente. Já concluiu?`,
      });
    }
  }

  return out;
}
