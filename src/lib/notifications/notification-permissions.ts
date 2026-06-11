import type { NotificationPermissionState } from "./notification-types";

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  const p = Notification.permission;
  if (p === "granted") return "granted";
  if (p === "denied") return "denied";
  return "default";
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const result = await Notification.requestPermission();
    if (result === "granted") return "granted";
    if (result === "denied") return "denied";
    return "default";
  } catch {
    return "default";
  }
}

export function permissionLabel(p: NotificationPermissionState): string {
  switch (p) {
    case "granted":
      return "Permitido";
    case "denied":
      return "Negado — ative nas configurações do navegador/sistema";
    case "default":
      return "Não solicitado";
    case "unsupported":
      return "Indisponível neste ambiente";
  }
}
