import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Bold,
  CalendarDays,
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
  X,
} from "lucide-react";
import { useActiveTask, useNotes } from "@/lib/focus-store";
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

type Block = {
  time: string;
  title: string;
  tag: string;
  notes: string;
  priority?: "important";
};

const blocks: Block[] = [
  { time: "08:30", title: "Planejamento do dia", tag: "Ritual", notes: "Revisar prioridades, definir 3 tarefas-chave e checar a agenda da semana." },
  { time: "09:00", title: "Daily Standup", tag: "Reunião", notes: "Time de produto. Trazer status do onboarding e bloqueios atuais." },
  { time: "10:00", title: "Deep Work — Design", tag: "Foco", notes: "Fechar wireframes do fluxo de notas. Sem notificações.", priority: "important" },
  { time: "12:30", title: "Almoço sem tela", tag: "Pausa", notes: "Deixar o celular longe. Caminhada curta depois, se possível." },
  { time: "14:00", title: "Sincronização Mensal", tag: "Reunião", notes: "Métricas do mês, OKRs e roadmap do próximo ciclo.", priority: "important" },
  { time: "16:00", title: "Revisões finais", tag: "Foco", notes: "Code review pendente + responder e-mails marcados como importantes." },
];

const filters = ["Tudo", "Foco", "Reunião", "Pausa", "Ritual"] as const;

// Datas com tarefas importantes (mock). Inclui hoje + alguns dias futuros.
function getImportantDates(): Date[] {
  const now = new Date();
  const offsets = [0, 2, 5, 9, 14];
  return offsets.map((d) => {
    const x = new Date(now);
    x.setDate(now.getDate() + d);
    x.setHours(0, 0, 0, 0);
    return x;
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
  const [editing, setEditing] = useState<Block | null>(null);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("Tudo");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [hasMoreRight, setHasMoreRight] = useState(false);
  const importantDates = useMemo(() => getImportantDates(), []);

  const visibleBlocks =
    activeFilter === "Tudo" ? blocks : blocks.filter((b) => b.tag === activeFilter);

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

  // Long-press para abrir calendário completo
  const lpTimer = useRef<number | null>(null);
  const lpFired = useRef(false);
  const startLP = () => {
    lpFired.current = false;
    if (lpTimer.current) window.clearTimeout(lpTimer.current);
    lpTimer.current = window.setTimeout(() => {
      lpFired.current = true;
      setCalendarOpen(true);
    }, 450);
  };
  const cancelLP = () => {
    if (lpTimer.current) {
      window.clearTimeout(lpTimer.current);
      lpTimer.current = null;
    }
  };

  return (
    <>
      <PageHeader eyebrow="Sua semana" title="Agenda" />
      <main className="px-6 space-y-6">
        {/* Mini calendário semanal — segure para abrir mês completo */}
        <section
          className="bg-card rounded-2xl p-3 ring-1 ring-black/5 select-none"
          onPointerDown={startLP}
          onPointerUp={cancelLP}
          onPointerLeave={cancelLP}
          onPointerCancel={cancelLP}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between px-1 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {selectedDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
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
              const isToday = sameDay(d, new Date());
              const isImportant = importantDates.some((x) => sameDay(x, d));
              return (
                <button
                  key={d.toISOString()}
                  onPointerDown={(e) => e.stopPropagation()}
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
                  {isToday && !isSelected && (
                    <span
                      className={[
                        "size-1 rounded-full mt-0.5",
                        isImportant ? "bg-destructive" : "bg-foreground",
                      ].join(" ")}
                    />
                  )}
                  {isImportant && !isToday && !isSelected && (
                    <span className="size-1 rounded-full bg-destructive mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2 opacity-70">
            Segure para abrir o mês inteiro
          </p>
        </section>

        <div className="flex items-center gap-2 bg-card rounded-xl p-2 ring-1 ring-black/5">
          <Search className="size-4 ml-2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar bloco, tag ou pessoa…"
            className="flex-1 bg-transparent text-sm outline-none py-2 placeholder:text-muted-foreground"
          />
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
              Blocos hoje
            </p>
            <p className="text-3xl font-semibold tabular-nums mt-1">{visibleBlocks.length}</p>
          </div>
          <button className="inline-flex items-center gap-2 bg-foreground text-background px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-transform">
            <Plus className="size-4" /> Novo bloco
          </button>
        </section>

        <section className="space-y-3">
          {visibleBlocks.map((b) => (
            <article key={b.time} className="flex gap-4 items-start">
              <span className="text-xs font-medium text-muted-foreground w-12 pt-1 tabular-nums">
                {b.time}
              </span>
              <button
                type="button"
                aria-label={`Abrir notas de ${b.title}`}
                onClick={() => setEditing(b)}
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
          onSelect={(d) => {
            setSelectedDate(d);
            setCalendarOpen(false);
          }}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </>
  );
}

function FullCalendarModal({
  selected,
  importantDates,
  onSelect,
  onClose,
}: {
  selected: Date;
  importantDates: Date[];
  onSelect: (d: Date) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
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
          modifiers={{ important: importantDates }}
          modifiersClassNames={{ important: "text-destructive font-semibold" }}
          className="pointer-events-auto mx-auto"
        />
      </div>
    </div>
  );
}

function NoteEditor({ block, onClose }: { block: Block; onClose: () => void }) {
  const { notes, setNote } = useNotes();
  const [, setActive] = useActiveTask();
  const ref = useRef<HTMLDivElement>(null);
  const [didInit, setDidInit] = useState(false);

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
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={save} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl ring-1 ring-black/5 shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200"
        style={{ maxHeight: "min(92dvh, 760px)" }}
      >
        {/* Header */}
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

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-secondary/40 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ToolbarBtn onClick={() => exec("formatBlock", "H1")} label="Título 1">
            <Heading1 className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec("formatBlock", "H2")} label="Título 2">
            <Heading2 className="size-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec("formatBlock", "H3")} label="Título 3">
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

        {/* Editor */}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          className="flex-1 overflow-y-auto p-5 text-[15px] leading-relaxed text-foreground outline-none
            [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_strong]:font-semibold
            [&_h1]:text-2xl sm:[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:mt-3 [&_h1]:mb-2
            [&_h2]:text-xl sm:[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-snug [&_h2]:mt-3 [&_h2]:mb-1.5
            [&_h3]:text-lg sm:[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1"
        />

        {/* Footer */}
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

export { blocks as agendaBlocks };
export type { Block as AgendaBlock };
