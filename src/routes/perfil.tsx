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
      return { d, status };
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

        <section className="bg-card rounded-2xl p-4 ring-1 ring-black/5">
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
              return (
                <div
                  key={d.d}
                  className={["aspect-square rounded-md grid place-items-center text-[11px] font-medium tabular-nums", cls].join(" ")}
                >
                  {d.d}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 text-center">
            Reseta automaticamente todo mês
          </p>
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
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
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

function LembretesModal({ onClose }: { onClose: () => void }) {
  const [time, setTime] = useState(() => localStorage.getItem(KEY_REMIND) || "08:30");
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );

  const request = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Este navegador não suporta notificações.");
      return;
    }
    const result = await Notification.requestPermission();
    setPerm(result);
    if (result === "granted") {
      toast.success("Notificações ativadas");
      new Notification("FocusMind", { body: `Lembrete diário às ${time} configurado.` });
    } else {
      toast.error("Permissão negada");
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
      <label className="block space-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Horário
        </span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none ring-1 ring-black/5 focus:ring-foreground tabular-nums"
        />
      </label>
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
