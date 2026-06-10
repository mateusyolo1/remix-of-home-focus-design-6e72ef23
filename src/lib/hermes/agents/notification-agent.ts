/* ============================================
   Hermes — Notification Agent
   ============================================
   Manages reminders: deadlines, pending tasks,
   unsaved drafts, breaks, and session suggestions.
   ============================================ */

import type { HermesNote, ChecklistItem, Priority } from "../hermes-types";

export type HermesNotification = {
  id: string;
  type: "deadline" | "pending_task" | "unsaved_draft" | "break" | "resume" | "review";
  title: string;
  body: string;
  priority: Priority;
  timestamp: string;
};

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

const NOTIFICATION_KEY = "hermes.notifications";
const EVT = "hermes:notification";

function readNotifications(): HermesNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeNotifications(n: HermesNotification[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(n));
  window.dispatchEvent(new CustomEvent(EVT));
}

function addNotification(n: HermesNotification) {
  const list = readNotifications();
  writeNotifications([n, ...list]);
}

/** Check for upcoming deadlines in saved notes */
export function checkDeadlines(notes: HermesNote[]): HermesNotification[] {
  const notifications: HermesNotification[] = [];

  for (const note of notes) {
    if (note.organizedResult.deadlines.length > 0) {
      for (const deadline of note.organizedResult.deadlines) {
        notifications.push({
          id: uid(),
          type: "deadline",
          title: `Prazo: ${note.title}`,
          body: `Prazo identificado: ${deadline}`,
          priority: note.priority,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return notifications;
}

/** Check for pending tasks in notes */
export function checkPendingTasks(notes: HermesNote[]): HermesNotification[] {
  const notifications: HermesNotification[] = [];

  for (const note of notes) {
    const pending = note.checklist.filter((item) => !item.done);
    if (pending.length > 0) {
      const firstPending = pending[0];
      notifications.push({
        id: uid(),
        type: "pending_task",
        title: `Tarefa pendente: ${note.title}`,
        body: `"${firstPending.text}" — e mais ${pending.length - 1} tarefa(s)`,
        priority: note.priority,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return notifications;
}

/** Check if there's an unsaved draft */
export function checkUnsavedDraft(): HermesNotification | null {
  const key = "hermes.draft_organized";
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;

  try {
    return {
      id: uid(),
      type: "unsaved_draft",
      title: "Rascunho não salvo",
      body: "Você tem um conteúdo organizado que ainda não foi salvo. Deseja revisar?",
      priority: "medium",
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Generate a break reminder (suggested after a focus session) */
export function generateBreakReminder(): HermesNotification {
  return {
    id: uid(),
    type: "break",
    title: "Hora da pausa",
    body: "Você completou uma sessão de foco. Que tal fazer uma pausa de 5 minutos?",
    priority: "low",
    timestamp: new Date().toISOString(),
  };
}

/** Suggest resuming a recent task */
export function generateResumeSuggestion(
  lastTask: string,
): HermesNotification {
  return {
    id: uid(),
    type: "resume",
    title: "Retomar tarefa",
    body: `Sua última tarefa foi: "${lastTask}". Quer continuar de onde parou?`,
    priority: "medium",
    timestamp: new Date().toISOString(),
  };
}

/** Mark notification as read (remove from store) */
export function dismissNotification(id: string) {
  const list = readNotifications();
  writeNotifications(list.filter((n) => n.id !== id));
}

/** Dismiss all notifications */
export function dismissAllNotifications() {
  writeNotifications([]);
}
