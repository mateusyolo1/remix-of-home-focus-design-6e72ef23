import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { TimePicker } from "@/components/TimePicker";
import {
  Bold,
  CalendarDays,
  Check,
  ChevronRight,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Plus,
  Search,
  StickyNote,
  Target,
  Trash2,
  X,
} from "lucide-react";
import {
  useActiveTask,
  useBlocks,
  useNotes,
  useTasks,
  blockDateKey,
  dateKey,
  type Block,
} from "@/lib/focus-store";
import { Calendar } from "@/components/ui/calendar";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — FocusMind" },
      { name: "description", content: "Blocos, compromissos e tarefas do seu dia." },
    ],
  }),
  component: AgendaPage,
});

const filters = ["Tudo", "Foco", "Reunião", "Pausa", "Ritual"] as const;
const tagOptions = ["Foco", "Reunião", "Pausa", "Ritual"] as const;

function getImportantDates(blocks: Block[]): Date[] {
  // Apenas dias que realmente têm um bloco marcado como importante.
  const keys = new Set<string>();
  blocks.forEach((b) => {
    if (b.priority === "important") keys.add(blockDateKey(b));
  });
  return Array.from(keys).map((k) => {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d);
  });
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function getWeekDays(base: Date) {
  const day = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const DAY_LABELS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function AgendaPage() {
  const { blocks, add: addBlock } = useBlocks();
  const [editing, setEditing] = useState<Block | null>(null);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("Tudo");
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [dayPreview, setDayPreview] = useState<Date | null>(null);
  const [blockPreview, setBlockPreview] = useState<Block | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [hasMoreRight, setHasMoreRight] = useState(false);
  const importantDates = useMemo(() => getImportantDates(blocks), [blocks]);

  const selectedKey = dateKey(selectedDate);
  const blocksOfDay = useMemo(
    () => blocks.filter((b) => blockDateKey(b) === selectedKey),
    [blocks, selectedKey]
  );
  const datesWithBlocks = useMemo(() => {
    const s = new Set<string>();
    blocks.forEach((b) => s.add(blockDateKey(b)));
    return s;
  }, [blocks]);
  const datesWithBlocksArr = useMemo(
    () =>
      Array.from(datesWithBlocks).map((k) => {
        const [y, m, d] = k.split("-").map(Number);
        return new Date(y, m - 1, d);
      }),
    [datesWithBlocks]
  );

  const visibleBlocks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return blocksOfDay.filter((b) => {
      if (activeFilter !== "Tudo" && b.tag !== activeFilter) return false;
      if (q && !`${b.title} ${b.tag} ${b.time}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [blocksOfDay, activeFilter, query]);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      setHasMoreRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const lpTimer = useRef<number | null>(null);
  const lpFired = useRef(false);
  const startLP = (cb: () => void) => {
    lpFired.current = false;
    if (lpTimer.current) window.clearTimeout(lpTimer.current);
    lpTimer.current = window.setTimeout(() => {
      lpFired.current = true;
      cb();
    }, 450);
  };
  const cancelLP = () => {
    if (lpTimer.current) {
      window.clearTimeout(lpTimer.current);
      lpTimer.current = null;
    }
  };

  const blocksForDate = (d: Date) =>
    blocks.filter((b) => blockDateKey(b) === dateKey(d));


  return (
    <>
      <PageHeader eyebrow="Sua semana" title="Agenda" />
      <main className="px-6 space-y-6">
        <section className="bg-card rounded-2xl p-3 ring-1 ring-black/5 select-none">
          <div className="flex items-center justify-between px-1 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {selectedDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              onClick={() => setCalendarOpen(true)}
              className="text-[10px] font-medium text-accent inline-flex items-center gap-1 active:scale-95"
              aria-label="Abrir calendário completo"
            >
              <CalendarDays className="size-3.5" /> Mês
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d, i) => {
              const isSelected = sameDay(d, selectedDate);
              const isImportant = importantDates.some((x) => sameDay(x, d));
              const hasBlocks = datesWithBlocks.has(dateKey(d));
              return (
                <button
                  key={d.toISOString()}
                  onPointerDown={() => startLP(() => setDayPreview(d))}
                  onPointerUp={cancelLP}
                  onPointerLeave={cancelLP}
                  onPointerCancel={cancelLP}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setDayPreview(d);
                  }}
                  onClick={() => {
                    if (lpFired.current) return;
                    setSelectedDate(d);
                  }}
                  className={[
                    "flex flex-col items-center py-2 rounded-xl transition-colors",
                    isSelected
                      ? "bg-foreground text-background"
                      : "text-foreground hover:bg-secondary",
                  ].join(" ")}
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-70">
                    {DAY_LABELS[i]}
                  </span>
                  <span
                    className={[
                      "text-base font-semibold tabular-nums mt-0.5",
                      isImportant && !isSelected ? "text-destructive" : "",
                    ].join(" ")}
                  >
                    {d.getDate()}
                  </span>
                  <span className="flex items-center gap-0.5 mt-0.5 h-1">
                    {hasBlocks && !isSelected && (
                      <span
                        className={[
                          "size-1 rounded-full",
                          isImportant ? "bg-destructive" : "bg-foreground",
                        ].join(" ")}
                      />
                    )}
                  </span>

                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2 opacity-70">
            Toque para selecionar · segure para ver o que tem no dia
          </p>
        </section>


        <div className="flex items-center gap-2 bg-card rounded-xl p-2 ring-1 ring-black/5">
          <Search className="size-4 ml-2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar bloco, tag ou pessoa…"
            className="flex-1 bg-transparent text-sm outline-none py-2 placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="size-7 mr-1 rounded-full bg-secondary grid place-items-center active:scale-95"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="relative -mx-6">
          <div
            ref={scrollerRef}
            className="px-6 py-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex gap-2 w-max pr-10">
              {filters.map((f) => {
                const active = activeFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={[
                      "px-4 py-2 rounded-full text-xs font-medium ring-1 transition-transform active:scale-95 whitespace-nowrap",
                      active
                        ? "bg-foreground text-background ring-foreground"
                        : "bg-card text-muted-foreground ring-black/10",
                    ].join(" ")}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            aria-hidden
            className={[
              "pointer-events-none absolute right-0 top-0 bottom-0 w-12 flex items-center justify-end pr-2 bg-gradient-to-l from-background via-background/80 to-transparent transition-opacity duration-200",
              hasMoreRight ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            <ChevronRight className="size-4 text-muted-foreground animate-nudge-x" />
          </div>
        </div>

        <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {sameDay(selectedDate, new Date())
                ? "Blocos hoje"
                : `Blocos · ${selectedDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`}
            </p>
            <p className="text-3xl font-semibold tabular-nums mt-1">{visibleBlocks.length}</p>
          </div>
          <button
            onClick={() => setNewOpen(true)}
            className="inline-flex items-center gap-2 bg-foreground text-background px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-transform"
          >
            <Plus className="size-4" /> Novo bloco
          </button>
        </section>


        <section className="space-y-3">
          {visibleBlocks.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhum bloco encontrado.
            </p>
          )}
          {visibleBlocks.map((b) => (
            <article key={b.time} className="flex gap-4 items-start">
              <span className="text-xs font-medium text-muted-foreground w-12 pt-1 tabular-nums">
                {b.time}
              </span>
              <button
                type="button"
                aria-label={`Abrir notas de ${b.title}`}
                onPointerDown={() => startLP(() => setBlockPreview(b))}
                onPointerUp={cancelLP}
                onPointerLeave={cancelLP}
                onPointerCancel={cancelLP}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setBlockPreview(b);
                }}
                onClick={() => {
                  if (lpFired.current) return;
                  setEditing(b);
                }}
                className={[
                  "flex-1 text-left p-4 bg-card rounded-xl ring-1 ring-black/5 border-l-2 active:scale-[0.99] transition-transform",
                  b.priority === "important" ? "border-destructive" : "border-foreground/70",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={[
                        "text-[10px] font-semibold uppercase tracking-widest",
                        b.priority === "important" ? "text-destructive" : "text-accent",
                      ].join(" ")}
                    >
                      {b.tag}
                      {b.priority === "important" ? " · importante" : ""}
                    </p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{b.title}</p>
                  </div>
                  <span className="size-7 -mt-0.5 -mr-0.5 shrink-0 grid place-items-center rounded-lg bg-secondary text-muted-foreground ring-1 ring-black/5">
                    <StickyNote className="size-3.5" />
                  </span>
                </div>
              </button>
            </article>
          ))}
        </section>
        <div className="h-4" />
      </main>

      {editing && <NoteEditor block={editing} onClose={() => setEditing(null)} />}

      {calendarOpen && (
        <FullCalendarModal
          selected={selectedDate}
          importantDates={importantDates}
          datesWithBlocks={datesWithBlocksArr}
          onSelect={(d) => {
            setSelectedDate(d);
            setCalendarOpen(false);
          }}
          onClose={() => setCalendarOpen(false)}
        />
      )}

      {newOpen && (
        <NewBlockModal
          initialDate={selectedDate}
          onClose={() => setNewOpen(false)}
          onCreate={(b) => {
            addBlock(b);
            setSelectedDate(new Date(b.date + "T00:00:00"));
            setNewOpen(false);
          }}
        />
      )}

      {dayPreview && (
        <DayPreviewModal
          date={dayPreview}
          blocks={blocksForDate(dayPreview)}
          onClose={() => setDayPreview(null)}
          onOpenDay={() => {
            setSelectedDate(dayPreview);
            setDayPreview(null);
          }}
          onOpenBlock={(b) => {
            setDayPreview(null);
            setEditing(b);
          }}
        />
      )}

      {blockPreview && (
        <BlockPreviewModal
          block={blockPreview}
          onClose={() => setBlockPreview(null)}
          onOpen={() => {
            const b = blockPreview;
            setBlockPreview(null);
            setEditing(b);
          }}
        />
      )}

    </>
  );
}

function FullCalendarModal({
  selected,
  importantDates,
  datesWithBlocks,
  onSelect,
  onClose,
}: {
  selected: Date;
  importantDates: Date[];
  datesWithBlocks: Date[];
  onSelect: (d: Date) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl ring-1 ring-black/5 shadow-2xl p-3 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between px-2 py-1">
          <p className="text-sm font-semibold">Calendário</p>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="size-9 rounded-full bg-secondary grid place-items-center active:scale-95"
          >
            <X className="size-4" />
          </button>
        </div>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => d && onSelect(d)}
          modifiers={{ important: importantDates, hasBlocks: datesWithBlocks }}
          modifiersClassNames={{
            important: "text-destructive font-semibold",
            hasBlocks: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-accent",
          }}
          className="pointer-events-auto mx-auto"
        />
        <p className="text-[10px] text-center text-muted-foreground mt-2">
          <span className="inline-block size-1.5 rounded-full bg-accent mr-1 align-middle" />
          dias com blocos
        </p>
      </div>
    </div>
  );
}


function NewBlockModal({
  initialDate,
  onClose,
  onCreate,
}: {
  initialDate: Date;
  onClose: () => void;
  onCreate: (b: { time: string; title: string; tag: string; date: string; priority?: "important" }) => void;
}) {
  const [time, setTime] = useState("09:00");
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState<(typeof tagOptions)[number]>("Foco");
  const [important, setImportant] = useState(false);
  const [date, setDate] = useState<string>(() => dateKey(initialDate));

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
    };
  }, []);

  const canSave = title.trim() && /^\d{2}:\d{2}$/.test(time) && /^\d{4}-\d{2}-\d{2}$/.test(date);


  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl ring-1 ring-black/5 shadow-2xl p-5 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">Novo bloco</p>
          <button onClick={onClose} aria-label="Fechar" className="size-8 rounded-full bg-secondary grid place-items-center active:scale-95">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Título</span>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Revisar wireframes"
              className="mt-1 w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none ring-1 ring-black/5 focus:ring-foreground"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Data</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none ring-1 ring-black/5 focus:ring-foreground tabular-nums"
            />
          </label>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Horário</span>
            <div className="mt-1">
              <TimePicker value={time} onChange={setTime} className="w-full" />
            </div>
          </div>


          <div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tag</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {tagOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={[
                    "px-3 py-1.5 rounded-full text-xs font-medium ring-1",
                    tag === t
                      ? "bg-foreground text-background ring-foreground"
                      : "bg-card text-muted-foreground ring-black/10",
                  ].join(" ")}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              checked={important}
              onChange={(e) => setImportant(e.target.checked)}
              className="accent-destructive"
            />
            <span className="text-sm">Marcar como importante</span>
          </label>
        </div>
        <button
          disabled={!canSave}
          onClick={() => onCreate({ time, title: title.trim(), tag, date, priority: important ? "important" : undefined })}
          className="mt-5 w-full h-12 rounded-xl bg-foreground text-background font-medium text-sm disabled:opacity-40 active:scale-[0.99] transition-transform"
        >
          Criar bloco
        </button>
      </div>
    </div>
  );
}

function NoteEditor({ block, onClose }: { block: Block; onClose: () => void }) {
  const { notes, setNote } = useNotes();
  const { tasks, add: addTask, toggle, remove } = useTasks();
  const [, setActive] = useActiveTask();
  const ref = useRef<HTMLDivElement>(null);
  const [didInit, setDidInit] = useState(false);
  const [newTask, setNewTask] = useState("");

  const linked = tasks.filter((t) => t.blockTime === block.time);

  useEffect(() => {
    if (didInit) return;
    const el = ref.current;
    if (!el) return;
    el.innerHTML = notes[block.time] ?? `<p>${escapeHtml(block.notes)}</p>`;
    setDidInit(true);
  }, [block, notes, didInit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
    };
  }, [onClose]);

  const save = () => {
    if (ref.current) setNote(block.time, ref.current.innerHTML);
    onClose();
  };

  const exec = (cmd: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, value);
  };

  // H1/H2/H3: aplica só na linha (bloco) onde está o cursor; clicar de novo volta a parágrafo.
  const applyHeading = (level: "H1" | "H2" | "H3") => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      exec("formatBlock", level);
      return;
    }
    let node: Node | null = sel.anchorNode;
    while (node && node !== ref.current) {
      if (node.nodeType === 1) {
        const tag = (node as HTMLElement).tagName;
        if (tag === level) {
          exec("formatBlock", "P");
          return;
        }
        if (/^H[1-6]$|^P$|^DIV$|^LI$/.test(tag)) break;
      }
      node = node.parentNode;
    }
    exec("formatBlock", level);
  };

  const setFocus = () => {
    if (ref.current) setNote(block.time, ref.current.innerHTML);
    setActive({
      time: block.time,
      title: block.title,
      tag: block.tag,
      goal: "",
      minutes: 25,
    });
    onClose();
  };

  const submitTask = () => {
    const v = newTask.trim();
    if (!v) return;
    addTask(v, block.time);
    setNewTask("");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={save} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl ring-1 ring-black/5 shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200"
        style={{ maxHeight: "min(92dvh, 760px)" }}
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-3 border-b border-border">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
              {block.tag} · {block.time}
            </p>
            <h2 className="text-lg font-semibold mt-0.5 truncate">{block.title}</h2>
          </div>
          <button
            onClick={save}
            aria-label="Fechar"
            className="size-9 -mr-1 -mt-1 shrink-0 rounded-full bg-secondary grid place-items-center active:scale-95 transition-transform"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-secondary/40 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ToolbarBtn onClick={() => applyHeading("H1")} label="Título 1">
            <Heading1 className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => applyHeading("H2")} label="Título 2">
            <Heading2 className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => applyHeading("H3")} label="Título 3">
            <Heading3 className="size-4" />
          </ToolbarBtn>
          <span className="w-px h-5 bg-border mx-1" />
          <ToolbarBtn onClick={() => exec("bold")} label="Negrito">
            <Bold className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec("italic")} label="Itálico">
            <Italic className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec("insertUnorderedList")} label="Lista">
            <List className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec("insertOrderedList")} label="Lista numerada">
            <ListOrdered className="size-4" />
          </ToolbarBtn>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            className="p-5 text-[15px] leading-relaxed text-foreground outline-none
              [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_strong]:font-semibold
              [&_h1]:text-2xl sm:[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:mt-3 [&_h1]:mb-2
              [&_h2]:text-xl sm:[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-snug [&_h2]:mt-3 [&_h2]:mb-1.5
              [&_h3]:text-lg sm:[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1"
          />

          {/* Tarefas vinculadas a este bloco */}
          <div className="px-5 pb-5 border-t border-border pt-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Tarefas deste bloco
            </p>
            {linked.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhuma tarefa vinculada. Adicione abaixo — elas aparecem no Timer e na Home.
              </p>
            )}
            <ul className="space-y-1.5">
              {linked.map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(t.id)}
                    aria-label="Concluir tarefa"
                    className={[
                      "size-5 shrink-0 rounded-md grid place-items-center ring-1 transition-colors",
                      t.done ? "bg-foreground text-background ring-foreground" : "bg-background ring-border",
                    ].join(" ")}
                  >
                    {t.done && <Check className="size-3" />}
                  </button>
                  <span
                    className={[
                      "flex-1 text-sm",
                      t.done ? "line-through text-muted-foreground" : "text-foreground",
                    ].join(" ")}
                  >
                    {t.title}
                  </span>
                  <button
                    onClick={() => remove(t.id)}
                    aria-label="Remover tarefa"
                    className="size-7 rounded-md text-muted-foreground hover:bg-secondary grid place-items-center"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 bg-secondary/60 rounded-lg p-1.5">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitTask()}
                placeholder="Adicionar tarefa…"
                className="flex-1 bg-transparent text-sm outline-none px-2 py-1.5 placeholder:text-muted-foreground"
              />
              <button
                onClick={submitTask}
                aria-label="Adicionar"
                className="size-8 rounded-md bg-foreground text-background grid place-items-center active:scale-95"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-4 border-t border-border">
          <button
            onClick={setFocus}
            className="h-11 rounded-xl bg-secondary text-foreground font-medium text-sm inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Target className="size-4" /> Focar
          </button>
          <Link
            to="/timer"
            onClick={setFocus}
            className="h-11 rounded-xl bg-foreground text-background font-medium text-sm inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            Iniciar timer
          </Link>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      className="size-9 shrink-0 rounded-lg grid place-items-center text-muted-foreground hover:bg-card hover:text-foreground transition-colors active:scale-95"
    >
      {children}
    </button>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function DayPreviewModal({
  date,
  blocks,
  onClose,
  onOpenDay,
  onOpenBlock,
}: {
  date: Date;
  blocks: Block[];
  onClose: () => void;
  onOpenDay: () => void;
  onOpenBlock: (b: Block) => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
    };
  }, []);

  const sorted = [...blocks].sort((a, b) => a.time.localeCompare(b.time));
  const label = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl ring-1 ring-black/5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[80dvh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Pré-visualização</p>
            <p className="text-sm font-semibold capitalize">{label}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="size-9 rounded-full bg-secondary grid place-items-center active:scale-95"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sorted.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhum bloco para este dia.
            </p>
          )}
          {sorted.map((b) => (
            <button
              key={b.time + b.title}
              type="button"
              onClick={() => onOpenBlock(b)}
              className="w-full text-left flex gap-3 items-start p-3 rounded-xl bg-secondary/60 ring-1 ring-black/5 active:scale-[0.99]"
            >
              <span className="text-xs font-semibold w-12 pt-0.5 tabular-nums text-muted-foreground">
                {b.time}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={[
                    "text-[10px] font-semibold uppercase tracking-widest",
                    b.priority === "important" ? "text-destructive" : "text-accent",
                  ].join(" ")}
                >
                  {b.tag}
                  {b.priority === "important" ? " · importante" : ""}
                </p>
                <p className="text-sm font-medium mt-0.5 truncate">{b.title}</p>
                {b.notes && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    {b.notes.replace(/<[^>]+>/g, "").trim()}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-border">
          <button
            type="button"
            onClick={onOpenDay}
            className="w-full bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold active:scale-[0.99]"
          >
            Abrir este dia
          </button>
        </div>
      </div>
    </div>
  );
}

function BlockPreviewModal({
  block,
  onClose,
  onOpen,
}: {
  block: Block;
  onClose: () => void;
  onOpen: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
    };
  }, []);

  const notesText = (block.notes ?? "").replace(/<[^>]+>/g, "").trim();

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl ring-1 ring-black/5 shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {block.time}
              {block.date ? ` · ${block.date}` : ""}
            </p>
            <p
              className={[
                "text-[10px] font-semibold uppercase tracking-widest",
                block.priority === "important" ? "text-destructive" : "text-accent",
              ].join(" ")}
            >
              {block.tag}
              {block.priority === "important" ? " · importante" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="size-9 rounded-full bg-secondary grid place-items-center active:scale-95"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <h3 className="text-lg font-semibold leading-tight">{block.title}</h3>
          {notesText ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notesText}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">Sem notas neste bloco ainda.</p>
          )}
          <button
            type="button"
            onClick={onOpen}
            className="w-full bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold active:scale-[0.99]"
          >
            Abrir e editar notas
          </button>
        </div>
      </div>
    </div>
  );
}
