import { useEffect } from "react";
import { useLists, useQuickNotes, useTasks } from "@/lib/focus-store";
import { runLearningCycle } from "./agent-learning";

/** Roda periodicamente para detectar exclusões/edições + sugerir tags. */
export function useHermesTracker() {
  const { tasks } = useTasks();
  const { lists } = useLists();
  const { notes } = useQuickNotes();

  useEffect(() => {
    const snapshot = {
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, tag: t.tag })),
      lists: lists.map((l) => ({ id: l.id, title: l.title, tag: l.tag })),
      notes: notes.map((n) => ({ id: n.id, title: n.title })),
    };
    runLearningCycle(snapshot);
    const interval = window.setInterval(() => runLearningCycle(snapshot), 60_000);
    return () => window.clearInterval(interval);
  }, [tasks, lists, notes]);
}

