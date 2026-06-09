import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ArrowUpRight, Check, CloudSun, Link2, Mic, Plus, Target, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useActiveTask, useBlocks, useNotes, useTasks } from "@/lib/focus-store";
import { useProfile, useCheckins } from "@/lib/profile-store";
import { fetchWeather, type CurrentWeather } from "@/lib/weather";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FocusMind — Foco do dia" },
      { name: "description", content: "Seu painel diário de foco, tarefas, agenda e notas." },
      { property: "og:title", content: "FocusMind — Foco do dia" },
      { property: "og:description", content: "Seu painel diário de foco, tarefas, agenda e notas." },
    ],
  }),
  component: Index,
});

type Filter = "Hoje" | "Semana" | "Todas";

function Index() {
  const [active, setActive] = useActiveTask();
  const [profile, setProfile] = useProfile();
  const { mark } = useCheckins();
  const { blocks } = useBlocks();
  const { tasks, add, toggle, remove, update } = useTasks();
  const { notes: noteMap } = useNotes();
  const navigate = useNavigate();
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("Hoje");
  const [newTask, setNewTask] = useState("");
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [quickNote, setQuickNote] = useState("");
  const [quickNotes, setQuickNotes] = useState<string[]>([]);

  useEffect(() => {
    mark();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWeather = async (lat: number, lon: number) => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const w = await fetchWeather(lat, lon);
      if (w) setWeather(w);
      else setWeatherError("Sem dados de clima");
    } catch {
      setWeatherError("Falha ao buscar clima");
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    if (!profile.city) {
      setWeather(null);
      return;
    }
    loadWeather(profile.city.latitude, profile.city.longitude);
  }, [profile.city?.latitude, profile.city?.longitude]);

  const useGeolocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocalização indisponível");
      return;
    }
    setWeatherLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setProfile({
          ...profile,
          city: {
            name: "Minha localização",
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          },
        });
        toast.success("Localização atualizada");
      },
      (err) => {
        setWeatherLoading(false);
        toast.error(`Localização: ${err.message}`);
      },
      { timeout: 8000 }
    );
  };

  const cityLabel = profile.city
    ? `${profile.city.name}${profile.city.state ? " · " + profile.city.state : ""}`
    : "Defina sua cidade";


  const filteredTasks = useMemo(() => {
    if (filter === "Todas") return tasks;
    // Para hoje / semana, sem datas reais, mostramos todas as não concluídas como "Hoje" e todas como "Semana"
    if (filter === "Hoje") return tasks.filter((t) => !t.done || tasks.length <= 5);
    return tasks;
  }, [tasks, filter]);

  const todayBlocks = blocks.slice(0, 3);
  const recentNotes = useMemo(() => {
    const fromBlocks = Object.entries(noteMap)
      .map(([time, html]) => ({
        time,
        text: html.replace(/<[^>]+>/g, "").trim(),
      }))
      .filter((x) => x.text)
      .slice(-2)
      .reverse()
      .map((x) => x.text.slice(0, 80));
    return [...quickNotes.slice(-2).reverse(), ...fromBlocks].slice(0, 3);
  }, [noteMap, quickNotes]);

  const addQuickNote = () => {
    const v = quickNote.trim();
    if (!v) return;
    setQuickNotes((arr) => [...arr, v]);
    setQuickNote("");
    toast.success("Nota salva");
  };

  const addNewTask = () => {
    const v = newTask.trim();
    if (!v) return;
    add(v);
    setNewTask("");
  };

  const submitTimerStart = (m: number) => {
    if (active) setActive({ ...active, minutes: m });
    navigate({ to: "/timer" });
  };

  return (
    <>
      <PageHeader eyebrow="14 de Outubro" title={`Olá, ${profile.name.split(" ")[0]}`} streak={12} />

      <main className="px-6 space-y-8">
        <section className="grid grid-cols-3 gap-2">
          {[
            { label: "Foco", value: "2h 15m" },
            { label: "Tarefas", value: `${tasks.filter((t) => t.done).length}/${tasks.length}` },
            { label: "Blocos", value: String(blocks.length) },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-xl p-3 ring-1 ring-black/5 text-center">
              <p className="text-base font-semibold tabular-nums">{s.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                {s.label}
              </p>
            </div>
          ))}
        </section>

        <div className="flex items-center gap-2 bg-secondary/60 rounded-xl px-3 py-2 ring-1 ring-black/5">
          <CloudSun className="size-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0 text-xs text-muted-foreground">
            <span className="block truncate">
              {cityLabel}
              {weather
                ? ` · ${weather.temperature}°C · ${weather.label}`
                : weatherLoading
                  ? " · carregando…"
                  : weatherError
                    ? ` · ${weatherError}`
                    : profile.city
                      ? ""
                      : " — toque para definir"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => profile.city && loadWeather(profile.city.latitude, profile.city.longitude)}
            disabled={!profile.city || weatherLoading}
            className="text-[10px] uppercase tracking-widest text-accent px-2 py-1 rounded-md hover:bg-card disabled:opacity-40 active:scale-95"
            aria-label="Atualizar clima"
          >
            ↻
          </button>
          <button
            type="button"
            onClick={useGeolocation}
            className="text-[10px] uppercase tracking-widest text-accent px-2 py-1 rounded-md hover:bg-card active:scale-95"
            aria-label="Usar minha localização"
          >
            GPS
          </button>
          <Link
            to="/perfil/editar"
            className="text-[10px] uppercase tracking-widest text-accent px-2 py-1 rounded-md hover:bg-card active:scale-95"
          >
            Editar
          </Link>
        </div>


        {/* Tarefas */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Tarefas
            </h3>
            <div className="flex gap-1.5">
              {(["Hoje", "Semana", "Todas"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={[
                    "px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ring-1 transition-transform active:scale-95",
                    filter === f
                      ? "bg-foreground text-background ring-foreground"
                      : "bg-card text-muted-foreground ring-black/5",
                  ].join(" ")}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <Link
            to={active ? "/foco" : "/agenda"}
            className="block bg-zinc-900 text-background p-5 rounded-2xl ring-1 ring-black/5 active:scale-[0.99] transition-transform"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-xs text-zinc-400 font-medium inline-flex items-center gap-1.5">
                  <Target className="size-3" />
                  {active ? `Foco · ${active.tag}` : "Próxima ação"}
                </p>
                <h4 className="text-lg font-medium leading-tight text-balance">
                  {active?.title ?? "Escolha um bloco na Agenda para focar"}
                </h4>
                {active?.goal && (
                  <p className="text-xs text-zinc-400 italic mt-1">“{active.goal}”</p>
                )}
              </div>
              <ArrowUpRight className="size-5 text-zinc-400 shrink-0 mt-0.5" />
            </div>
          </Link>

          <ul className="space-y-2">
            {filteredTasks.length === 0 && (
              <li className="text-center text-xs text-muted-foreground py-4">
                Sem tarefas. Adicione abaixo.
              </li>
            )}
            {filteredTasks.map((t) => {
              const linkedBlock = t.blockTime
                ? blocks.find((b) => b.time === t.blockTime)
                : null;
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl ring-1 ring-black/5"
                >
                  <button
                    onClick={() => toggle(t.id)}
                    aria-label="Concluir"
                    className={[
                      "size-5 shrink-0 rounded-md grid place-items-center ring-1 transition-colors",
                      t.done ? "bg-foreground text-background ring-foreground" : "bg-background ring-border",
                    ].join(" ")}
                  >
                    {t.done && <Check className="size-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={[
                        "text-sm truncate",
                        t.done ? "line-through text-muted-foreground" : "text-foreground",
                      ].join(" ")}
                    >
                      {t.title}
                    </p>
                    {linkedBlock && (
                      <p className="text-[10px] text-accent mt-0.5 truncate">
                        {linkedBlock.time} · {linkedBlock.title}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setLinkingId(t.id)}
                    aria-label="Vincular a bloco"
                    className={[
                      "size-8 rounded-md grid place-items-center transition-colors",
                      linkedBlock ? "text-accent" : "text-muted-foreground hover:bg-secondary",
                    ].join(" ")}
                  >
                    <Link2 className="size-4" />
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    aria-label="Remover"
                    className="size-8 rounded-md text-muted-foreground hover:bg-secondary grid place-items-center"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2 bg-card rounded-xl p-2 ring-1 ring-black/5">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNewTask()}
              placeholder="Adicionar tarefa…"
              className="flex-1 bg-transparent text-sm outline-none px-2 py-2 placeholder:text-muted-foreground"
            />
            <button
              onClick={addNewTask}
              aria-label="Adicionar"
              className="size-9 rounded-lg bg-foreground text-background grid place-items-center active:scale-95"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </section>

        {/* Agenda */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Agenda
            </h3>
            <Link to="/agenda" className="text-xs font-medium text-accent">
              Ver tudo
            </Link>
          </div>
          <ul className="space-y-3">
            {todayBlocks.map((b) => (
              <li key={b.time} className="flex gap-4 items-start">
                <span className="text-xs font-medium text-muted-foreground w-10 pt-0.5 tabular-nums">
                  {b.time}
                </span>
                <div className="flex-1 p-3 bg-secondary/60 rounded-lg border-l-2 border-border">
                  <p className="text-sm font-medium text-foreground">{b.title}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Nota Rápida */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">
            Nota Rápida
          </h3>
          <div className="bg-card rounded-2xl p-5 ring-1 ring-black/5">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addQuickNote()}
                placeholder="O que está na sua mente?"
                className="flex-1 text-sm bg-secondary p-3 rounded-lg ring-1 ring-black/5 focus:ring-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={() => toast("Gravação por voz em breve")}
                aria-label="Gravar nota"
                className="size-11 rounded-lg bg-foreground text-background grid place-items-center transition-transform active:scale-95"
              >
                <Mic className="size-4" />
              </button>
            </div>
            <ul className="space-y-3">
              {recentNotes.length === 0 && (
                <li className="text-xs text-muted-foreground">Nenhuma nota ainda.</li>
              )}
              {recentNotes.map((n, i) => (
                <li key={`${i}-${n}`} className="flex gap-3 items-center">
                  <span className="size-1 bg-border rounded-full" />
                  <p className="text-xs text-muted-foreground">{n}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Cronômetro (FINAL) */}
        <section className="bg-card rounded-2xl p-6 ring-1 ring-black/5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Foco Atual
            </h3>
            <Link to="/timer" className="text-xs font-medium text-accent inline-flex items-center gap-1">
              Ajustar <ArrowUpRight className="size-3" />
            </Link>
          </div>

          <div className="flex flex-col items-center py-2">
            <span className="text-6xl font-medium tracking-tighter tabular-nums mb-8 text-foreground">
              {active ? `${String(active.minutes).padStart(2, "0")}:00` : "25:00"}
            </span>

            <div className="flex gap-2 mb-8">
              {[25, 45, 90].map((d, i) => {
                const isActive = (active?.minutes ?? 25) === d || (!active && i === 0);
                return (
                  <button
                    key={d}
                    onClick={() => submitTimerStart(d)}
                    className={[
                      "px-4 py-2 rounded-full text-xs font-medium ring-1 ring-black/5 active:scale-95 transition-transform",
                      isActive ? "bg-foreground text-background" : "bg-secondary text-foreground",
                    ].join(" ")}
                  >
                    {d}m
                  </button>
                );
              })}
            </div>

            <Link
              to="/timer"
              className="w-full text-center bg-foreground text-background py-4 rounded-xl font-medium text-base ring-1 ring-black/10 transition-transform active:scale-[0.98] shadow-sm"
            >
              Iniciar Sessão
            </Link>
          </div>
        </section>

        <div className="h-4" />
      </main>

      {linkingId && (
        <LinkBlockSheet
          currentBlockTime={tasks.find((t) => t.id === linkingId)?.blockTime}
          onClose={() => setLinkingId(null)}
          onPick={(time) => {
            update(linkingId, { blockTime: time });
            setLinkingId(null);
            toast.success(time ? "Tarefa vinculada ao bloco" : "Vínculo removido");
          }}
        />
      )}
    </>
  );
}

function LinkBlockSheet({
  currentBlockTime,
  onClose,
  onPick,
}: {
  currentBlockTime?: string;
  onClose: () => void;
  onPick: (time: string | undefined) => void;
}) {
  const { blocks } = useBlocks();
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl ring-1 ring-black/5 p-5 pb-7 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Vincular a um bloco</p>
          <button onClick={onClose} aria-label="Fechar" className="size-8 rounded-full bg-secondary grid place-items-center">
            <X className="size-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Opcional. Tarefas vinculadas aparecem no Timer e no Foco quando o bloco está ativo.
        </p>
        <ul className="space-y-2 max-h-[55dvh] overflow-y-auto">
          <li>
            <button
              onClick={() => onPick(undefined)}
              className="w-full text-left p-3 rounded-xl bg-secondary/50 hover:bg-secondary text-sm font-medium"
            >
              Sem vínculo
            </button>
          </li>
          {blocks.map((b) => {
            const active = b.time === currentBlockTime;
            return (
              <li key={b.time}>
                <button
                  onClick={() => onPick(b.time)}
                  className={[
                    "w-full text-left flex items-center gap-3 p-3 rounded-xl transition-colors",
                    active ? "bg-foreground text-background" : "bg-secondary/50 hover:bg-secondary",
                  ].join(" ")}
                >
                  <span className="text-xs font-medium w-12 tabular-nums opacity-80">{b.time}</span>
                  <span className="text-sm font-medium truncate">{b.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
