import { useEffect } from "react";
import { useLists, useQuickNotes, useTasks } from "@/lib/focus-store";
import { reconcileCreations } from "./learning-core";

/** Roda periodicamente para detectar exclusões/edições de itens criados pelo Hermes. */
export function useHermesTracker() {
  const { tasks } = useTasks();
  const { lists } = useLists();
  const { notes } = useQuickNotes();

  useEffect(() => {
    reconcileCreations({
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, tag: t.tag })),
      lists: lists.map((l) => ({ id: l.id, title: l.title, tag: l.tag })),
      notes: notes.map((n) => ({ id: n.id, title: n.title })),
    });
    const interval = window.setInterval(() => {
      reconcileCreations({
        tasks: tasks.map((t) => ({ id: t.id, title: t.title, tag: t.tag })),
        lists: lists.map((l) => ({ id: l.id, title: l.title, tag: l.tag })),
        notes: notes.map((n) => ({ id: n.id, title: n.title })),
      });
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [tasks, lists, notes]);
}
