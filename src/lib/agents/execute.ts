import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useActiveTask, useBlocks, useLists, useQuickNotes, useTasks } from "@/lib/focus-store";
import type { AgentAction } from "@/lib/agent";
import type { RoutedAction } from "@/lib/agents/orchestrator";

export function useExecuteActions() {
  const { add: addTask } = useTasks();
  const { add: addBlock } = useBlocks();
  const { add: addNote } = useQuickNotes();
  const { add: addList } = useLists();
  const [, setActive] = useActiveTask();
  const navigate = useNavigate();

  return (actions: AgentAction[] | RoutedAction[]) => {
    for (const a of actions) {
      try {
        if (a.type === "create_task") {
          addTask(a.title, a.blockTime, a.tag);
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
          addNote({ title: a.title, body: a.body, ttlDays: a.ttlDays });
          toast.success(`Nota: ${a.title}`);
        } else if (a.type === "create_list") {
          addList({ title: a.title, items: a.items, tag: a.tag });
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
