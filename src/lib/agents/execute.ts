import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useActiveTask, useBlocks, useLists, useQuickNotes, useTasks } from "@/lib/focus-store";
import type { AgentAction } from "@/lib/agent";
import type { RoutedAction } from "@/lib/agents/orchestrator";
import { recordCreation } from "@/lib/hermes/learning-core";

export function useExecuteActions() {
  const { add: addTask, update: updateTask } = useTasks();
  const { add: addBlock } = useBlocks();
  const { add: addNote } = useQuickNotes();
  const { add: addList } = useLists();
  const [, setActive] = useActiveTask();
  const navigate = useNavigate();

  const toEpoch = (v: string | number | undefined): number | undefined => {
    if (v === undefined || v === null) return undefined;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const ms = Date.parse(v);
      if (!Number.isNaN(ms)) return ms;
    }
    return undefined;
  };

  return (actions: AgentAction[] | RoutedAction[]) => {
    for (const a of actions) {
      try {
        if (a.type === "create_task") {
          const t = addTask(a.title, a.blockTime, a.tag);
          // Aplica dueAt/reminderAt/scheduledFor extraídos pelo Hermes.
          const due = toEpoch((a as { dueAt?: string | number }).dueAt);
          const rem = toEpoch((a as { reminderAt?: string | number }).reminderAt);
          const scheduledFor = (a as { scheduledFor?: string }).scheduledFor;
          if (due || rem || scheduledFor) {
            updateTask(t.id, {
              dueAt: due ?? undefined,
              reminderAt: rem ?? undefined,
              scheduledFor: scheduledFor ?? undefined,
            });
          }
          recordCreation({ entityId: t.id, entityKind: "task", title: t.title, tag: t.tag });
          toast.success(`Tarefa: ${a.title}`);
        } else if (a.type === "create_block") {
          addBlock({
            time: a.time,
            title: a.title,
            tag: a.tag ?? "Foco",
            notes: a.notes ?? "",
            date: a.date,
          });
          toast.success(`Bloco ${a.time}: ${a.title}`);
        } else if (a.type === "create_note") {
          const n = addNote({ title: a.title, body: a.body, ttlDays: a.ttlDays });
          recordCreation({ entityId: n.id, entityKind: "note", title: n.title });
          toast.success(`Nota: ${a.title}`);
        } else if (a.type === "create_list") {
          const l = addList({ title: a.title, items: a.items, tag: a.tag });
          recordCreation({
            entityId: l.id,
            entityKind: "list",
            title: l.title,
            tag: l.tag,
            items: a.items,
          });
          toast.success(`Lista: ${a.title} (${a.items.length})`);
        } else if (a.type === "start_timer") {
          setActive({
            time: new Date().toTimeString().slice(0, 5),
            title: a.title ?? "Foco",
            tag: "Foco",
            goal: "",
            minutes: a.minutes,
          });
          toast.success(`Timer ${a.minutes}min`);
          navigate({ to: "/timer" });
        }
      } catch (err) {
        console.error(err);
        toast.error(`Falha ao executar ${a.type}`);
      }
    }
  };
}
