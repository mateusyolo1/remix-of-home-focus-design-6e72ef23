import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft, Download, Eye, EyeOff, MapPin, Search, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useProfile, type Schedule } from "@/lib/profile-store";
import { useAgentConfig, MODEL_OPTIONS, type AgentProvider } from "@/lib/agent-store";
import { searchCity, type GeoResult } from "@/lib/weather";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const Route = createFileRoute("/perfil/editar")({
  head: () => ({
    meta: [
      { title: "Editar perfil — FocusMind" },
      { name: "description", content: "Atualize seu nome, idade, profissão, escala de trabalho e cidade." },
    ],
  }),
  component: EditarPerfil,
});

const DAYS: { key: keyof Schedule; label: string }[] = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
];

function EditarPerfil() {
  const [profile, setProfile] = useProfile();
  const [agent, setAgent] = useAgentConfig();
  const [draft, setDraft] = useState(profile);
  const [cityOpen, setCityOpen] = useState(false);
  const [showGem, setShowGem] = useState(false);
  const [showDs, setShowDs] = useState(false);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    setDraft(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = () => {
    setProfile(draft);
    navigate({ to: "/perfil" });
  };

  const setDay = (key: keyof Schedule, patch: Partial<Schedule[keyof Schedule]>) => {
    setDraft({
      ...draft,
      schedule: { ...draft.schedule, [key]: { ...draft.schedule[key], ...patch } },
    });
  };

  const totalHours = DAYS.reduce(
    (acc, { key }) => acc + (draft.schedule[key].enabled ? draft.schedule[key].hours : 0),
    0,
  );

  return (
    <>
      <PageHeader eyebrow="Perfil" title="Editar" />
      <main className="px-6 space-y-6 pb-28">
        <Link
          to="/perfil"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground font-medium"
        >
          <ArrowLeft className="size-3.5" /> Voltar
        </Link>

        <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5 space-y-4">
          <Field label="Nome">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none ring-1 ring-black/5 focus:ring-foreground"
              placeholder="Seu nome"
            />
          </Field>
          <Field label="Idade">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={120}
              value={draft.age ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, age: e.target.value === "" ? null : Number(e.target.value) })
              }
              className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none ring-1 ring-black/5 focus:ring-foreground"
              placeholder="—"
            />
          </Field>
          <Field label="No que você trabalha">
            <input
              value={draft.job}
              onChange={(e) => setDraft({ ...draft, job: e.target.value })}
              className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none ring-1 ring-black/5 focus:ring-foreground"
              placeholder="Ex.: Designer de produto"
            />
          </Field>
        </section>

        <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Cidade (para o clima)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCityOpen(true)}
            className="w-full flex items-center gap-3 bg-secondary rounded-lg px-3 py-3 ring-1 ring-black/5 active:scale-[0.99] transition-transform"
          >
            <MapPin className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium flex-1 text-left">
              {draft.city
                ? `${draft.city.name}${draft.city.state ? " · " + draft.city.state : ""}${
                    draft.city.country ? " · " + draft.city.country : ""
                  }`
                : "Buscar cidade ou CEP"}
            </span>
            <Search className="size-4 text-muted-foreground" />
          </button>
        </section>

        <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Escala de trabalho
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {totalHours}h por semana
            </p>
          </div>
          <ul className="divide-y divide-border">
            {DAYS.map(({ key, label }) => {
              const day = draft.schedule[key];
              return (
                <li key={key} className="flex items-center gap-3 py-3">
                  <span className="w-10 text-sm font-medium">{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={day.enabled}
                    onClick={() => setDay(key, { enabled: !day.enabled })}
                    className={[
                      "relative w-11 h-6 rounded-full transition-colors shrink-0",
                      day.enabled ? "bg-foreground" : "bg-secondary ring-1 ring-border",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform",
                        day.enabled ? "translate-x-5" : "translate-x-0.5",
                      ].join(" ")}
                    />
                  </button>
                  <div className="flex-1 flex items-center justify-end gap-2">
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      disabled={!day.enabled}
                      value={day.hours}
                      onChange={(e) =>
                        setDay(key, { hours: Math.max(0, Math.min(24, Number(e.target.value) || 0)) })
                      }
                      className={[
                        "w-16 text-right bg-secondary rounded-md px-2 py-1.5 text-sm outline-none ring-1 ring-black/5 focus:ring-foreground tabular-nums",
                        !day.enabled && "opacity-40",
                      ].join(" ")}
                    />
                    <span className="text-xs text-muted-foreground">h</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>

      <div className="fixed bottom-20 left-0 right-0 px-6 z-40">
        <button
          onClick={save}
          className="w-full max-w-md mx-auto block bg-foreground text-background rounded-xl py-3.5 text-sm font-semibold shadow-lg active:scale-[0.99] transition-transform"
        >
          Salvar alterações
        </button>
      </div>

      {cityOpen && (
        <CityPicker
          onClose={() => setCityOpen(false)}
          onPick={(g) => {
            setDraft({
              ...draft,
              city: {
                name: g.name,
                state: g.admin1,
                country: g.country,
                latitude: g.latitude,
                longitude: g.longitude,
              },
            });
            setCityOpen(false);
          }}
        />
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function CityPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (g: GeoResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = window.setTimeout(async () => {
      const r = await searchCity(q);
      if (!cancelled) {
        setResults(r);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl ring-1 ring-black/5 shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200"
        style={{ maxHeight: "min(85dvh, 720px)" }}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <p className="text-sm font-semibold">Buscar cidade ou CEP</p>
          <button onClick={onClose} aria-label="Fechar" className="size-9 rounded-full bg-secondary grid place-items-center">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 ring-1 ring-black/5 focus-within:ring-foreground">
            <Search className="size-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex.: Curitiba, 80010, Lisboa…"
              className="flex-1 bg-transparent text-sm py-2.5 outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading && (
            <p className="text-xs text-muted-foreground text-center py-4">Buscando…</p>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum resultado. Tente outra busca.
            </p>
          )}
          {!loading && query.trim().length < 2 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Digite ao menos 2 letras para buscar.
            </p>
          )}
          <ul className="space-y-1">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onPick(r)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-secondary active:scale-[0.99] transition-transform"
                >
                  <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {r.name}
                      {r.admin1 ? `, ${r.admin1}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.country}
                      {r.postcodes?.length ? ` · ${r.postcodes[0]}` : ""}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
