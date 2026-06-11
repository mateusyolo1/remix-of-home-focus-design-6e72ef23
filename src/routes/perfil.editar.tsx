import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import {
  ArrowLeft,
  Download,
  Eye,
  EyeOff,
  Locate,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  dayTotalHours,
  useProfile,
  weekTotalHours,
  type Schedule,
  type Shift,
} from "@/lib/profile-store";
import { useAgentConfig, MODEL_OPTIONS, type AgentProvider, type AgentsConfig, type SubAgentConfig } from "@/lib/agent-store";
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
      { name: "description", content: "Atualize seu nome, bio, escala de trabalho e localização." },
    ],
  }),
  component: EditarPerfil,
});

const DAYS: { key: keyof Schedule; label: string }[] = [
  { key: "seg", label: "Segunda-feira" },
  { key: "ter", label: "Terça-feira" },
  { key: "qua", label: "Quarta-feira" },
  { key: "qui", label: "Quinta-feira" },
  { key: "sex", label: "Sexta-feira" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

function EditarPerfil() {
  const [profile, setProfile] = useProfile();
  const [agent, setAgent] = useAgentConfig();
  const [draft, setDraft] = useState(profile);
  const [cityOpen, setCityOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
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
    toast.success("Perfil atualizado");
    navigate({ to: "/perfil" });
  };

  const patchDay = (key: keyof Schedule, patch: Partial<{ enabled: boolean; shifts: Shift[] }>) => {
    const cur = draft.schedule[key];
    setDraft({
      ...draft,
      schedule: { ...draft.schedule, [key]: { ...cur, ...patch } },
    });
  };

  const updateShift = (key: keyof Schedule, idx: number, patch: Partial<Shift>) => {
    const shifts = draft.schedule[key].shifts.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    patchDay(key, { shifts });
  };

  const addShift = (key: keyof Schedule) => {
    const cur = draft.schedule[key].shifts;
    const next: Shift = cur.length === 0 ? { start: "08:00", end: "12:00" } : { start: "13:00", end: "17:00" };
    patchDay(key, { shifts: [...cur, next], enabled: true });
  };

  const removeShift = (key: keyof Schedule, idx: number) => {
    patchDay(key, { shifts: draft.schedule[key].shifts.filter((_, i) => i !== idx) });
  };

  const requestGps = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Seu dispositivo não suporta GPS.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let name = "Localização atual";
        let state: string | undefined;
        let country: string | undefined;
        try {
          const r = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=pt&format=json`,
          );
          const data = await r.json();
          const first = data?.results?.[0];
          if (first) {
            name = first.name ?? name;
            state = first.admin1;
            country = first.country;
          }
        } catch {
          // ignore reverse-geocode failure; coords still saved
        }
        setDraft((d) => ({
          ...d,
          city: { name, state, country, latitude, longitude, fromGps: true },
        }));
        setGpsLoading(false);
        toast.success(`Localização: ${name}`);
      },
      (err) => {
        setGpsLoading(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Permissão negada. Habilite o GPS para o navegador."
            : "Não foi possível obter o GPS.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const total = weekTotalHours(draft.schedule);

  return (
    <>
      <PageHeader eyebrow="Perfil" title="Editar" />
      <main className="px-6 space-y-6 pb-32">
        <Link
          to="/perfil"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground font-medium"
        >
          <ArrowLeft className="size-3.5" /> Voltar
        </Link>

        {/* Atalhos de navegação dentro da página */}
        <nav className="-mx-6 px-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex gap-2 w-max">
            {[
              { href: "#identidade", label: "Identidade" },
              { href: "#escala", label: "Escala" },
              { href: "#local", label: "Localização" },
              { href: "#trabalho", label: "Trabalho" },
              { href: "#sobre", label: "Sobre você" },
              { href: "#agentes", label: "Agentes" },
            ].map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  className="inline-block px-3 py-1.5 rounded-full text-[11px] font-semibold bg-secondary text-foreground ring-1 ring-black/5"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>


        {/* Identidade */}
        <section id="identidade" className="bg-card rounded-2xl p-5 ring-1 ring-black/5 space-y-4">
          <SectionLabel>Identidade</SectionLabel>
          <Field label="Nome completo">
            <Input value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="Seu nome" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Idade">
              <Input
                type="number"
                value={draft.age ?? ""}
                onChange={(v) => setDraft({ ...draft, age: v === "" ? null : Number(v) })}
                placeholder="—"
              />
            </Field>
            <Field label="Pronomes">
              <Input
                value={draft.pronouns}
                onChange={(v) => setDraft({ ...draft, pronouns: v })}
                placeholder="ele/dele, ela/dela…"
              />
            </Field>
          </div>
        </section>

        {/* Localização */}
        <section id="local" className="bg-card rounded-2xl p-5 ring-1 ring-black/5 space-y-3">
          <SectionLabel>Localização (clima e fuso)</SectionLabel>
          <button
            type="button"
            onClick={() => setCityOpen(true)}
            className="w-full flex items-center gap-3 bg-secondary rounded-lg px-3 py-3 ring-1 ring-black/5 active:scale-[0.99] transition-transform"
          >
            <MapPin className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium flex-1 text-left">
              {draft.city
                ? `${draft.city.name}${draft.city.state ? " · " + draft.city.state : ""}${draft.city.country ? " · " + draft.city.country : ""}`
                : "Buscar cidade ou CEP"}
            </span>
            <Search className="size-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            disabled={gpsLoading}
            onClick={requestGps}
            className="w-full inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold active:scale-[0.99] transition-transform disabled:opacity-60"
          >
            <Locate className="size-4" />
            {gpsLoading ? "Buscando GPS…" : "Usar minha localização (GPS)"}
          </button>
          {draft.city?.fromGps && (
            <p className="text-[11px] text-muted-foreground">
              Localização obtida via GPS — lat {draft.city.latitude.toFixed(3)}, lon {draft.city.longitude.toFixed(3)}.
            </p>
          )}
        </section>

        {/* Trabalho */}
        <section id="trabalho" className="bg-card rounded-2xl p-5 ring-1 ring-black/5 space-y-4">
          <SectionLabel>Trabalho</SectionLabel>
          <Field label="Função / cargo">
            <Input
              value={draft.work.role}
              onChange={(v) => setDraft({ ...draft, work: { ...draft.work, role: v } })}
              placeholder="Ex.: Designer de produto"
            />
          </Field>
          <Field label="Empresa / contexto">
            <Input
              value={draft.work.company}
              onChange={(v) => setDraft({ ...draft, work: { ...draft.work, company: v } })}
              placeholder="Empresa, freelance, estudante…"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Modalidade">
              <select
                value={draft.work.mode}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    work: { ...draft.work, mode: e.target.value as typeof draft.work.mode },
                  })
                }
                className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none ring-1 ring-black/5 focus:ring-foreground"
              >
                <option value="">—</option>
                <option value="presencial">Presencial</option>
                <option value="remoto">Remoto</option>
                <option value="híbrido">Híbrido</option>
              </select>
            </Field>
            <Field label="Local de trabalho">
              <Input
                value={draft.work.location}
                onChange={(v) => setDraft({ ...draft, work: { ...draft.work, location: v } })}
                placeholder="Bairro, escritório, home…"
              />
            </Field>
          </div>
          <Field label="O que faz no dia a dia">
            <Textarea
              value={draft.work.description}
              onChange={(v) => setDraft({ ...draft, work: { ...draft.work, description: v } })}
              placeholder="Descreva suas responsabilidades, projetos, ferramentas…"
              rows={3}
            />
          </Field>
        </section>

        {/* Escala de trabalho */}
        <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Escala de trabalho</SectionLabel>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {total.toFixed(1)}h por semana
            </p>
          </div>
          <ul className="space-y-3">
            {DAYS.map(({ key, label }) => {
              const day = draft.schedule[key];
              const totalDay = dayTotalHours(day);
              return (
                <li key={key} className="bg-secondary/60 rounded-xl p-3 ring-1 ring-black/5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold flex-1">{label}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {day.enabled ? `${totalDay.toFixed(1)}h` : "folga"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={day.enabled}
                      onClick={() => patchDay(key, { enabled: !day.enabled })}
                      className={[
                        "relative w-11 h-6 rounded-full transition-colors shrink-0",
                        day.enabled ? "bg-destructive" : "bg-background ring-1 ring-border",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform",
                          day.enabled ? "translate-x-5" : "translate-x-0.5",
                        ].join(" ")}
                      />
                    </button>
                  </div>
                  {day.enabled && (
                    <div className="mt-3 space-y-2">
                      {day.shifts.length === 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          Nenhum turno. Adicione um abaixo.
                        </p>
                      )}
                      {day.shifts.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={s.start}
                            onChange={(e) => updateShift(key, idx, { start: e.target.value })}
                            className="bg-background rounded-md px-2 py-1.5 text-sm ring-1 ring-black/5 focus:ring-foreground tabular-nums"
                          />
                          <span className="text-xs text-muted-foreground">—</span>
                          <input
                            type="time"
                            value={s.end}
                            onChange={(e) => updateShift(key, idx, { end: e.target.value })}
                            className="bg-background rounded-md px-2 py-1.5 text-sm ring-1 ring-black/5 focus:ring-foreground tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() => removeShift(key, idx)}
                            aria-label="Remover turno"
                            className="ml-auto size-8 rounded-md grid place-items-center text-muted-foreground hover:bg-background"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addShift(key)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent"
                      >
                        <Plus className="size-3.5" /> Adicionar turno
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Sobre você (dossiê IA) */}
        <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5 space-y-4">
          <div className="flex items-start gap-2">
            <Sparkles className="size-4 text-accent mt-0.5" />
            <div>
              <SectionLabel>Sobre você (para a IA)</SectionLabel>
              <p className="text-xs text-muted-foreground mt-1">
                Quanto mais detalhe, melhor a IA personaliza sugestões, horários e tom.
              </p>
            </div>
          </div>

          <Field label="Mini biografia">
            <Textarea
              value={draft.personal.bio}
              onChange={(v) => setDraft({ ...draft, personal: { ...draft.personal, bio: v } })}
              placeholder="Conte em poucas linhas quem você é, sua história, o que te move…"
              rows={4}
            />
          </Field>
          <Field label="Personalidade / temperamento">
            <Textarea
              value={draft.personal.personality}
              onChange={(v) => setDraft({ ...draft, personal: { ...draft.personal, personality: v } })}
              placeholder="Ex.: introvertido, foco profundo de manhã, distrai fácil à tarde…"
              rows={2}
            />
          </Field>
          <Field label="Hobbies">
            <Textarea
              value={draft.personal.hobbies}
              onChange={(v) => setDraft({ ...draft, personal: { ...draft.personal, hobbies: v } })}
              placeholder="Ex.: violão, corrida, ler ficção científica…"
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Gostos">
              <Textarea
                value={draft.personal.likes}
                onChange={(v) => setDraft({ ...draft, personal: { ...draft.personal, likes: v } })}
                placeholder="Música, comida, lugares, estilo…"
                rows={2}
              />
            </Field>
            <Field label="Não curte">
              <Textarea
                value={draft.personal.dislikes}
                onChange={(v) => setDraft({ ...draft, personal: { ...draft.personal, dislikes: v } })}
                placeholder="O que evitar nas sugestões"
                rows={2}
              />
            </Field>
          </div>
          <Field label="Objetivos atuais">
            <Textarea
              value={draft.personal.goals}
              onChange={(v) => setDraft({ ...draft, personal: { ...draft.personal, goals: v } })}
              placeholder="O que está perseguindo nos próximos meses"
              rows={2}
            />
          </Field>
          <Field label="Rotina típica">
            <Textarea
              value={draft.personal.routine}
              onChange={(v) => setDraft({ ...draft, personal: { ...draft.personal, routine: v } })}
              placeholder="Como costuma ser seu dia"
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Sono">
              <Input
                value={draft.personal.sleep}
                onChange={(v) => setDraft({ ...draft, personal: { ...draft.personal, sleep: v } })}
                placeholder="Ex.: dorme 23h, acorda 6h"
              />
            </Field>
            <Field label="Alimentação">
              <Input
                value={draft.personal.diet}
                onChange={(v) => setDraft({ ...draft, personal: { ...draft.personal, diet: v } })}
                placeholder="Ex.: vegetariano, sem lactose…"
              />
            </Field>
            <Field label="Saúde / restrições">
              <Input
                value={draft.personal.health}
                onChange={(v) => setDraft({ ...draft, personal: { ...draft.personal, health: v } })}
                placeholder="Algo relevante que a IA deve respeitar"
              />
            </Field>
          </div>
          <Field label="Outras notas">
            <Textarea
              value={draft.personal.notes}
              onChange={(v) => setDraft({ ...draft, personal: { ...draft.personal, notes: v } })}
              placeholder="Qualquer coisa extra que ajude a IA a te entender melhor"
              rows={3}
            />
          </Field>
        </section>

        {/* Agente IA — Hermes */}
        <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" />
            <SectionLabel>Agente IA · Hermes</SectionLabel>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Suas chaves ficam só no navegador (localStorage).
          </p>

          <Field label="Provedor">
            <div className="grid grid-cols-2 gap-2">
              {(["gemini", "deepseek"] as AgentProvider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAgent({ ...agent, provider: p, model: MODEL_OPTIONS[p][0].value })}
                  className={[
                    "py-2 rounded-lg text-sm font-medium ring-1 transition-colors",
                    agent.provider === p
                      ? "bg-foreground text-background ring-foreground"
                      : "bg-secondary text-foreground ring-black/5",
                  ].join(" ")}
                >
                  {p === "gemini" ? "Gemini" : "DeepSeek"}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Modelo">
            <select
              value={agent.model}
              onChange={(e) => setAgent({ ...agent, model: e.target.value })}
              className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none ring-1 ring-black/5 focus:ring-foreground"
            >
              {MODEL_OPTIONS[agent.provider].map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Gemini API key">
            <div className="flex items-center gap-2 bg-secondary rounded-lg ring-1 ring-black/5 focus-within:ring-foreground">
              <input
                type={showGem ? "text" : "password"}
                value={agent.geminiKey}
                onChange={(e) => setAgent({ ...agent, geminiKey: e.target.value })}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                placeholder="AIza…"
                autoComplete="off"
              />
              <button type="button" onClick={() => setShowGem((v) => !v)} className="px-3 text-muted-foreground" aria-label="Mostrar/ocultar">
                {showGem ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>

          <Field label="DeepSeek API key">
            <div className="flex items-center gap-2 bg-secondary rounded-lg ring-1 ring-black/5 focus-within:ring-foreground">
              <input
                type={showDs ? "text" : "password"}
                value={agent.deepseekKey}
                onChange={(e) => setAgent({ ...agent, deepseekKey: e.target.value })}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                placeholder="sk-…"
                autoComplete="off"
              />
              <button type="button" onClick={() => setShowDs((v) => !v)} className="px-3 text-muted-foreground" aria-label="Mostrar/ocultar">
                {showDs ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>

          <Link
            to="/chat"
            className="block text-center bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold active:scale-[0.99] transition-transform"
          >
            Abrir Hermes
          </Link>
        </section>

        {/* Meus Agentes — router */}
        <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5 space-y-4">
          <div className="flex items-start gap-2">
            <Sparkles className="size-4 text-accent mt-0.5" />
            <div>
              <SectionLabel>Meus Agentes (router por aba)</SectionLabel>
              <p className="text-xs text-muted-foreground mt-1">
                O Hermes divide sua fala e envia cada parte para o agente da aba. Ative, escreva instruções e dê palavras-chave para cada um.
              </p>
            </div>
          </div>

          {(["agenda", "timer", "home"] as const).map((key) => {
            const sub = agent.agents[key];
            const title =
              key === "agenda" ? "🗓️ Agente Agenda" : key === "timer" ? "⏱️ Agente Timer" : "🏠 Agente Home";
            const hint =
              key === "agenda"
                ? "Cria blocos com horário/data (reuniões, compromissos)."
                : key === "timer"
                  ? "Inicia cronômetros (pomodoro, foco, descansos)."
                  : "Cria tarefas, listas e notas livres.";
            const update = (patch: Partial<SubAgentConfig>) => {
              const next: AgentsConfig = {
                ...agent.agents,
                [key]: { ...sub, ...patch },
              };
              setAgent({ ...agent, agents: next });
            };
            return (
              <div key={key} className="bg-secondary/60 rounded-xl p-4 ring-1 ring-black/5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={sub.enabled}
                    onClick={() => update({ enabled: !sub.enabled })}
                    className={[
                      "relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5",
                      sub.enabled ? "bg-destructive" : "bg-background ring-1 ring-border",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform",
                        sub.enabled ? "translate-x-5" : "translate-x-0.5",
                      ].join(" ")}
                    />
                  </button>
                </div>
                {sub.enabled && (
                  <>
                    <Field label="Instruções pessoais (personalidade, regras, exemplos)">
                      <Textarea
                        value={sub.prompt}
                        onChange={(v) => update({ prompt: v })}
                        placeholder={
                          key === "agenda"
                            ? "Ex.: nunca agende depois das 20h; reuniões padrão = 30min…"
                            : key === "timer"
                              ? "Ex.: meu pomodoro é 50/10; foco profundo só de manhã…"
                              : "Ex.: anote ideias com tags; listas de mercado por categoria…"
                        }
                        rows={3}
                      />
                    </Field>
                    <Field label="Palavras-chave de roteamento">
                      <Input
                        value={sub.keywords}
                        onChange={(v) => update({ keywords: v })}
                        placeholder="separadas por vírgula"
                      />
                    </Field>
                  </>
                )}
              </div>
            );
          })}
        </section>



        {/* Instalar app */}
        <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5 space-y-3">
          <div className="flex items-center gap-2">
            <Download className="size-4 text-accent" />
            <SectionLabel>Instalar o app</SectionLabel>
          </div>
          <p className="text-xs text-muted-foreground">
            Instale como aplicativo no seu celular ou computador. Funciona offline depois de aberto.
          </p>
          <button
            type="button"
            onClick={async () => {
              if (!installEvt) {
                toast("Abra o menu do navegador → \"Instalar app\" ou \"Adicionar à tela inicial\".");
                return;
              }
              await installEvt.prompt();
              const { outcome } = await installEvt.userChoice;
              if (outcome === "accepted") toast.success("App instalado!");
              setInstallEvt(null);
            }}
            className="w-full bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold active:scale-[0.99] transition-transform"
          >
            {installEvt ? "Instalar agora" : "Como instalar"}
          </button>
          <div className="text-[11px] text-muted-foreground space-y-1 pt-1">
            <p><strong className="text-foreground">Android/Chrome:</strong> menu ⋮ → "Instalar app".</p>
            <p><strong className="text-foreground">iPhone/Safari:</strong> compartilhar ↑ → "Adicionar à Tela de Início".</p>
            <p className="break-all"><strong className="text-foreground">URL:</strong> {typeof window !== "undefined" ? window.location.origin : ""}</p>
          </div>
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
                fromGps: false,
              },
            });
            setCityOpen(false);
          }}
        />
      )}
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
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

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none ring-1 ring-black/5 focus:ring-foreground"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none ring-1 ring-black/5 focus:ring-foreground resize-y"
    />
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
