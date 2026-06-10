import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Bell, BrainCog, ChevronRight, LogOut, Moon, Settings, ShieldCheck, UserCog, WifiOff } from "lucide-react";
import { useMemo } from "react";
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

type Item = {
  icon: typeof UserCog;
  label: string;
  to?: "/perfil/editar" | "/configuracoes";
  onClick?: () => void;
};

const items: Item[] = [
  { icon: UserCog, label: "Editar perfil", to: "/perfil/editar" },
  { icon: Bell, label: "Lembretes", onClick: () => toast("Lembretes em breve — vamos enviar notificações nos seus horários da agenda.") },
  { icon: Settings, label: "Configurações", to: "/configuracoes" },
  { icon: ShieldCheck, label: "Privacidade", onClick: () => toast("Privacidade — seus dados ficam apenas neste dispositivo (localStorage).") },
  { icon: Moon, label: "Modo silencioso", onClick: () => toast.success("Modo silencioso ativado") },
];

function PerfilPage() {
  const [profile] = useProfile();
  const { checkins } = useCheckins();

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

        {/* Check-in mensal */}
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

          {items.map(({ icon: Icon, label, to, onClick }, i) => {
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
    </>
  );
}
