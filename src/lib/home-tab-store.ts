// Tiny pub/sub para a aba ativa da Home (Tarefas | Notas | Listas).
// Permite que o AppShell saiba qual aba está aberta sem prop drilling.
import { useSyncExternalStore } from "react";

export type HomeTab = "Tarefas" | "Notas" | "Listas";

let current: HomeTab = "Tarefas";
const listeners = new Set<() => void>();

export function setHomeTab(tab: HomeTab) {
  if (current === tab) return;
  current = tab;
  listeners.forEach((l) => l());
}

export function getHomeTab(): HomeTab {
  return current;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useHomeTab(): HomeTab {
  return useSyncExternalStore(subscribe, getHomeTab, getHomeTab);
}
