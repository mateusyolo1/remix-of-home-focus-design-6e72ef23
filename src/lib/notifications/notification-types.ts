export type NotificationKind =
  | "timer_end"
  | "task_due"
  | "task_overdue"
  | "task_forgotten"
  | "test";

export type NotificationActionId =
  | "complete"
  | "snooze"
  | "open"
  | "restart_timer"
  | "dismiss";

export type ScheduledNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  scheduledAt: number;
  entityId?: string;
  entityType?: "task" | "timer";
};

export type NotificationPermissionState =
  | "granted"
  | "denied"
  | "default"
  | "unsupported";

export type NotificationLogEntry = {
  id: string;
  type: NotificationKind;
  title: string;
  body: string;
  entityId?: string;
  entityType?: "task" | "timer";
  status: "scheduled" | "sent" | "clicked" | "dismissed" | "failed";
  scheduledAt?: number;
  sentAt?: number;
  clickedAt?: number;
};

export type NotificationSettings = {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  repeatUntilDismissed: boolean;
  taskRemindersEnabled: boolean;
  notifyBeforeMinutes: number[];
  remindOverdue: boolean;
  forgottenTaskHours: number;
  quietHoursEnabled: boolean;
  quietStart: string; // HH:MM
  quietEnd: string; // HH:MM
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  repeatUntilDismissed: false,
  taskRemindersEnabled: true,
  notifyBeforeMinutes: [60, 15, 0],
  remindOverdue: true,
  forgottenTaskHours: 24,
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00",
};
