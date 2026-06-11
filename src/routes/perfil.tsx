import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import {
  Bell,
  BrainCog,
  ChevronRight,
  Download,
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  Trash2,
  UserCog,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCheckins, useProfile, todayKey } from "@/lib/profile-store";
import { useActivityLog, activitiesByDate, ACTIVITY_LABEL, type ActivityEntry } from "@/lib/activity-log";
import { TASK_TAGS, TASK_TAG_LABEL, type TaskTag } from "@/lib/focus-store";


import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { useHermesConfig } from "@/lib/hermes/hermes-config";
import { INSTALL_STATUS_LABEL } from "@/lib/hermes/hermes-status";
import { toast } from "sonner";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — FocusMind" },
      { name: "description", content: "Suas estatísticas, lembretes e configurações." },
    ],
  }),
  component: PerfilPage,
});

type ModalKind = "lembretes" | "privacidade" | "silencioso" | null;
const KEY_SILENT = "fm.silent-mode";
const KEY_REMIND = "fm.reminder-time";

function PerfilPage() {
  const [profile] = useProfile();
  const { checkins } = useCheckins();
  const [modal, setModal] = useState<ModalKind>(null);
  const [silent, setSilent] = useState(false);
  const [tab, setTab] = useState<"historico" | "desempenho">("historico");
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const activity = useActivityLog();
  const activityMap = useMemo(() => activitiesByDate(activity), [activity]);


  useEffect(() => {
    setSilent(localStorage.getItem(KEY_SILENT) === "1");
  }, []);

  const toggleSilent = (v: boolean) => {
    setSilent(v);
    localStorage.setItem(KEY_SILENT, v ? "1" : "0");
    toast.success(v ? "Modo silencioso ativado" : "Modo silencioso desativado");
  };

  const { days, monthLabel, presentCount, missedCount } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const last = new Date(year, month + 1, 0).getDate();
    const todayK = todayKey(now);
    const todayDate = now.getDate();
    let present = 0;
    let missed = 0;
    const days = Array.from({ length: last }, (_, i) => {
      const d = i + 1;
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isToday = key === todayK;
      const isPast = d < todayDate;
      const checked = checkins.has(key);
      let status: "present" | "missed" | "today" | "future" = "future";
      if (checked) {
        status = "present";
        present++;
      } else if (isToday) {
        status = "today";
      } else if (isPast) {
        status = "missed";
        missed++;
      }
      return { d, status, key };
    });
    return {
      days,
      monthLabel: now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),

      presentCount: present,
      missedCount: missed,
    };
  }, [checkins]);

  const stats = [
    { label: "Presença", value: `${presentCount}d` },
    { label: "Faltas", value: `${missedCount}d` },
    { label: "Streak", value: "12d" },
  ];

  const items: {
    icon: typeof UserCog;
    label: string;
    to?: "/perfil/editar" | "/configuracoes";
    onClick?: () => void;
    badge?: string;
  }[] = [
    { icon: UserCog, label: "Editar perfil", to: "/perfil/editar" },
    { icon: Bell, label: "Lembretes", onClick: () => setModal("lembretes") },
    { icon: Settings, label: "Configurações", to: "/configuracoes" },
    { icon: ShieldCheck, label: "Privacidade", onClick: () => setModal("privacidade") },
    {
      icon: Moon,
      label: "Modo silencioso",
      onClick: () => setModal("silencioso"),
      badge: silent ? "Ativo" : undefined,
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Perfil" title={profile.name} streak={12} />
      <main className="px-6 space-y-6">
        <section className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-card rounded-2xl p-4 ring-1 ring-black/5 text-center">
              <p className="text-lg font-semibold tabular-nums">{s.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </section>

        <section className="bg-card rounded-2xl ring-1 ring-black/5 overflow-hidden">
          <div className="flex gap-1 p-1 m-2 bg-secondary rounded-xl">
            {([
              { id: "historico", label: "Histórico" },
              { id: "desempenho", label: "Desempenho" },
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  "flex-1 text-xs font-semibold py-2 rounded-lg transition-colors",
                  tab === t.id
                    ? "bg-card text-foreground ring-1 ring-black/5"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "historico" ? (
            <div className="p-4 pt-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground capitalize">
                  {monthLabel}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-sm bg-foreground" /> Presente
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-sm bg-destructive" /> Faltou
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((d) => {
                  const cls =
                    d.status === "present"
                      ? "bg-foreground text-background"
                      : d.status === "missed"
                      ? "bg-destructive text-destructive-foreground"
                      : d.status === "today"
                      ? "bg-secondary text-foreground ring-1 ring-foreground"
                      : "bg-secondary text-muted-foreground";
                  const count = activityMap.get(d.key)?.length ?? 0;
                  return (
                    <button
                      type="button"
                      key={d.d}
                      onClick={() => setDayOpen(d.key)}
                      className={["relative aspect-square rounded-md grid place-items-center text-[11px] font-medium tabular-nums active:scale-95 transition-transform", cls].join(" ")}
                    >
                      {d.d}
                      {count > 0 && (
                        <span className="absolute bottom-1 size-1 rounded-full bg-accent" />
                      )}
                    </button>
                  );
                })}

              </div>
              <p className="text-[10px] text-muted-foreground mt-3 text-center">
                Reseta automaticamente todo mês
              </p>
            </div>
          ) : (
            <DesempenhoPanel activity={activity} />
          )}
        </section>

        <HermesAgentCard />

        <section className="bg-card rounded-2xl ring-1 ring-black/5 overflow-hidden">
          {items.map(({ icon: Icon, label, to, onClick, badge }, i) => {
            const cls = [
              "flex items-center gap-3 px-4 py-4 text-sm w-full text-left",
              i !== items.length - 1 ? "border-b border-border" : "",
            ].join(" ");
            const inner = (
              <>
                <span className="size-9 rounded-xl bg-secondary grid place-items-center">
                  <Icon className="size-4 text-foreground" />
                </span>
                <span className="flex-1 font-medium">{label}</span>
                {badge && (
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-accent px-2 py-0.5 rounded-full bg-accent/10">
                    {badge}
                  </span>
                )}
                <ChevronRight className="size-4 text-muted-foreground" />
              </>
            );
            if (to) {
              return (
                <Link key={label} to={to} className={cls}>
                  {inner}
                </Link>
              );
            }
            return (
              <button key={label} type="button" onClick={onClick} className={cls}>
                {inner}
              </button>
            );
          })}
        </section>

        <button
          onClick={() => toast("Sessão encerrada (demo)")}
          className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground py-4"
        >
          <LogOut className="size-4" /> Encerrar sessão
        </button>
        <div className="h-4" />
      </main>

      {modal === "lembretes" && <LembretesModal onClose={() => setModal(null)} />}
      {modal === "privacidade" && <PrivacidadeModal onClose={() => setModal(null)} />}
      {modal === "silencioso" && (
        <SilenciosoModal
          enabled={silent}
          onToggle={toggleSilent}
          onClose={() => setModal(null)}
        />
      )}
      {dayOpen && (
        <DiaModal
          dateKey={dayOpen}
          entries={activityMap.get(dayOpen) ?? []}
          onClose={() => setDayOpen(null)}
        />
      )}

    </>
  );
}

function HermesAgentCard() {
  const [config] = useHermesConfig();
  const connected = config.installStatus === "connected";
  return (
    <Link
      to="/hermes"
      className="bg-card rounded-2xl ring-1 ring-black/5 p-4 flex items-center gap-3 hover:bg-secondary/40 transition-colors"
    >
      <span className="size-11 rounded-xl bg-secondary grid place-items-center shrink-0">
        {connected ? (
          <BrainCog className="size-5 text-foreground" />
        ) : (
          <WifiOff className="size-5 text-muted-foreground" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Hermes Agent</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {config.enabled
            ? INSTALL_STATUS_LABEL[config.installStatus]
            : "Configurar instalação no Termux"}
        </p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
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
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl ring-1 ring-black/5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[85dvh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-card flex items-center justify-between p-4 border-b border-border">
          <p className="text-sm font-semibold">{title}</p>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="size-9 rounded-full bg-secondary grid place-items-center active:scale-95"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function TimeWheel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(":");
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
  const setH = (nh: string) => onChange(`${nh}:${m ?? "00"}`);
  const setM = (nm: string) => onChange(`${h ?? "00"}:${nm}`);
  const Col = ({
    items,
    selected,
    onPick,
    label,
  }: {
    items: string[];
    selected: string;
    onPick: (v: string) => void;
    label: string;
  }) => (
    <div className="flex-1 min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center mb-1.5">
        {label}
      </div>
      <div className="h-40 overflow-y-auto rounded-xl bg-secondary ring-1 ring-black/5 p-1 space-y-1 snap-y snap-mandatory">
        {items.map((it) => {
          const active = it === selected;
          return (
            <button
              key={it}
              type="button"
              onClick={() => onPick(it)}
              className={[
                "w-full snap-start rounded-lg py-1.5 text-sm font-semibold tabular-nums transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-foreground/80 hover:bg-foreground/5",
              ].join(" ")}
            >
              {it}
            </button>
          );
        })}
      </div>
    </div>
  );
  return (
    <div className="rounded-2xl bg-card ring-1 ring-black/5 p-3">
      <div className="flex items-center gap-2">
        <Col items={hours} selected={h ?? "00"} onPick={setH} label="Hora" />
        <span className="text-2xl font-light text-muted-foreground -mt-1">:</span>
        <Col items={minutes} selected={m ?? "00"} onPick={setM} label="Min" />
      </div>
      <div className="mt-3 text-center text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </div>
    </div>
  );
}

function LembretesModal({ onClose }: { onClose: () => void }) {
  const [time, setTime] = useState(() => localStorage.getItem(KEY_REMIND) || "08:30");
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );

  const inIframe = typeof window !== "undefined" && window.self !== window.top;

  const request = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Este navegador não suporta notificações.");
      return;
    }
    if (inIframe) {
      toast.error("Abra o app em uma aba própria para permitir notificações.");
      window.open(window.location.href, "_blank", "noopener");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPerm(result);
      if (result === "granted") {
        toast.success("Notificações ativadas");
        new Notification("FocusMind", { body: `Lembrete diário às ${time} configurado.` });
      } else if (result === "denied") {
        toast.error("Permissão negada — habilite no ícone do cadeado do navegador.");
      } else {
        toast("Permissão não concedida");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao solicitar permissão");
    }
  };

  const save = () => {
    localStorage.setItem(KEY_REMIND, time);
    toast.success(`Lembrete diário salvo para ${time}`);
    onClose();
  };

  return (
    <ModalShell title="Lembretes diários" onClose={onClose}>
      <p className="text-xs text-muted-foreground">
        Defina um horário para receber um aviso diário. Usa notificações do navegador.
      </p>
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Horário
        </span>
        <TimeWheel value={time} onChange={setTime} />
      </div>

      <div className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
        Permissão de notificações:{" "}
        <strong className="text-foreground">
          {perm === "granted"
            ? "concedida"
            : perm === "denied"
              ? "negada"
              : perm === "unsupported"
                ? "indisponível"
                : "não solicitada"}
        </strong>
      </div>
      <div className="flex gap-2">
        {perm !== "granted" && perm !== "unsupported" && (
          <button
            type="button"
            onClick={request}
            className="flex-1 bg-secondary text-foreground rounded-lg py-2.5 text-sm font-semibold ring-1 ring-black/5 active:scale-[0.99]"
          >
            Permitir notificações
          </button>
        )}
        <button
          type="button"
          onClick={save}
          className="flex-1 bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold active:scale-[0.99]"
        >
          Salvar horário
        </button>
      </div>
    </ModalShell>
  );
}

function PrivacidadeModal({ onClose }: { onClose: () => void }) {
  const totalKb = useMemo(() => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("fm.")) {
        total += (localStorage.getItem(k) ?? "").length;
      }
    }
    return (total / 1024).toFixed(1);
  }, []);

  const exportData = () => {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("fm.")) {
        try {
          data[k] = JSON.parse(localStorage.getItem(k) ?? "null");
        } catch {
          data[k] = localStorage.getItem(k);
        }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `focusmind-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado");
  };

  const wipe = () => {
    if (!confirm("Apagar TODOS os dados deste app neste dispositivo?")) return;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("fm.")) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    toast.success("Dados locais apagados. Recarregando…");
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <ModalShell title="Privacidade" onClose={onClose}>
      <p className="text-xs text-muted-foreground">
        Seus dados ficam <strong className="text-foreground">apenas neste dispositivo</strong>{" "}
        (localStorage do navegador). Nada é enviado para servidores sem você pedir explicitamente.
      </p>
      <ul className="text-xs space-y-2">
        <li className="flex justify-between">
          <span className="text-muted-foreground">Perfil, escala e dossiê</span>
          <span className="font-medium">local</span>
        </li>
        <li className="flex justify-between">
          <span className="text-muted-foreground">Tarefas, blocos, listas e notas</span>
          <span className="font-medium">local</span>
        </li>
        <li className="flex justify-between">
          <span className="text-muted-foreground">Chaves de API (Gemini/DeepSeek)</span>
          <span className="font-medium">local</span>
        </li>
        <li className="flex justify-between">
          <span className="text-muted-foreground">Total armazenado</span>
          <span className="font-medium tabular-nums">{totalKb} KB</span>
        </li>
      </ul>
      <div className="flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={exportData}
          className="inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold active:scale-[0.99]"
        >
          <Download className="size-4" /> Exportar meus dados (JSON)
        </button>
        <button
          type="button"
          onClick={wipe}
          className="inline-flex items-center justify-center gap-2 bg-destructive text-destructive-foreground rounded-lg py-2.5 text-sm font-semibold active:scale-[0.99]"
        >
          <Trash2 className="size-4" /> Apagar todos os dados locais
        </button>
      </div>
    </ModalShell>
  );
}

function SilenciosoModal({
  enabled,
  onToggle,
  onClose,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell title="Modo silencioso" onClose={onClose}>
      <p className="text-xs text-muted-foreground">
        Pausa lembretes e sons do Hermes. Pode ser ativado durante reuniões ou foco profundo.
      </p>
      <div className="flex items-center gap-3 bg-secondary rounded-xl p-4 ring-1 ring-black/5">
        <Moon className="size-5 text-foreground" />
        <span className="text-sm font-semibold flex-1">
          {enabled ? "Silencioso ativo" : "Silencioso desligado"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={[
            "relative w-11 h-6 rounded-full transition-colors shrink-0",
            enabled ? "bg-destructive" : "bg-background ring-1 ring-border",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform",
              enabled ? "translate-x-5" : "translate-x-0.5",
            ].join(" ")}
          />
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Dica: ative antes de uma sessão de foco e desative ao final do dia.
      </p>
    </ModalShell>
  );
}

function DesempenhoPanel({ activity }: { activity: ActivityEntry[] }) {
  const { byTag, last14, totalCreated, totalDone, doneRate } = useMemo(() => {
    const now = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    // Agrega criadas vs concluídas por tag
    const created: Record<string, number> = {};
    const done: Record<string, number> = {};
    let totalCreated = 0;
    let totalDone = 0;
    for (const e of activity) {
      const tag = (e.tag as TaskTag | undefined) ?? "outro";
      if (e.kind === "task") {
        created[tag] = (created[tag] ?? 0) + 1;
        totalCreated++;
      } else if (e.kind === "task_done") {
        done[tag] = (done[tag] ?? 0) + 1;
        totalDone++;
      }
    }
    const byTag = TASK_TAGS.map((t) => ({
      tag: t,
      label: TASK_TAG_LABEL[t],
      criadas: created[t] ?? 0,
      concluidas: done[t] ?? 0,
    })).filter((r) => r.criadas + r.concluidas > 0);

    // Últimos 14 dias: tarefas concluídas por dia
    const last14 = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (13 - i));
      const key = fmt(d);
      const concluidas = activity.filter(
        (e) => e.kind === "task_done" && e.date === key,
      ).length;
      return { label: String(d.getDate()).padStart(2, "0"), concluidas };
    });

    const doneRate = totalCreated > 0 ? Math.round((totalDone / totalCreated) * 100) : 0;

    return { byTag, last14, totalCreated, totalDone, doneRate };
  }, [activity]);

  return (
    <div className="p-4 pt-2 space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Criadas" value={String(totalCreated)} />
        <Metric label="Concluídas" value={String(totalDone)} />
        <Metric label="Taxa" value={`${doneRate}%`} />
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Por categoria
        </p>
        {byTag.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nenhuma tarefa registrada ainda. Adicione tarefas com uma categoria para ver estatísticas.
          </p>
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byTag} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--secondary))" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="criadas" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Criadas" />
                <Bar dataKey="concluidas" fill="currentColor" className="text-foreground" radius={[4, 4, 0, 0]} name="Concluídas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Concluídas — últimos 14 dias
        </p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={last14} margin={{ top: 4, right: 8, bottom: 0, left: -28 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="concluidas"
                stroke="currentColor"
                className="text-foreground"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}


function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary rounded-xl p-3 text-center ring-1 ring-black/5">
      <p className="text-base font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function DiaModal({
  dateKey,
  entries,
  onClose,
}: {
  dateKey: string;
  entries: ActivityEntry[];
  onClose: () => void;
}) {
  const label = useMemo(() => {
    const [y, m, d] = dateKey.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, [dateKey]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    for (const e of entries) {
      const arr = map.get(e.kind) ?? [];
      arr.push(e);
      map.set(e.kind, arr);
    }
    return map;
  }, [entries]);

  return (
    <ModalShell title={label} onClose={onClose}>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Sem registros neste dia. Tarefas, notas, listas e blocos criados aparecem aqui.
        </p>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([kind, list]) => (
            <div key={kind}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                {ACTIVITY_LABEL[kind as keyof typeof ACTIVITY_LABEL]} · {list.length}
              </p>
              <ul className="space-y-1.5">
                {list.map((e) => {
                  const time = new Date(e.at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <li
                      key={e.id}
                      className="flex items-start gap-2 bg-secondary rounded-lg px-3 py-2 text-xs"
                    >
                      <span className="text-muted-foreground tabular-nums shrink-0">{time}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{e.title}</p>
                        {e.detail && (
                          <p className="text-muted-foreground truncate">{e.detail}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}
