import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Bell, ChevronRight, LogOut, Moon, Settings, ShieldCheck, Sparkles, UserCog } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCheckins, useProfile, todayKey } from "@/lib/profile-store";
import { useAgentConfig } from "@/lib/agent-store";
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
  { icon: Sparkles, label: "Agente IA", to: "/perfil/editar" },
  { icon: Bell, label: "Lembretes", onClick: () => toast("Lembretes em breve — vamos enviar notificações nos seus horários da agenda.") },
  { icon: Settings, label: "Configurações", to: "/configuracoes" },
  { icon: ShieldCheck, label: "Privacidade", onClick: () => toast("Privacidade — seus dados ficam apenas neste dispositivo (localStorage).") },
  { icon: Moon, label: "Modo silencioso", onClick: () => toast.success("Modo silencioso ativado") },
];

function PerfilPage() {
  const [profile] = useProfile();
  const [agentConfig] = useAgentConfig();
  const { checkins } = useCheckins();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const hasAgentKey =
    (agentConfig.provider === "gemini" && agentConfig.geminiKey.length > 0) ||
    (agentConfig.provider === "deepseek" && agentConfig.deepseekKey.length > 0);

  const checkinStreak = useMemo(() => {
    const dates = Array.from(checkins).sort().reverse();
    if (dates.length === 0) return { days: 0, streak: 0, todayChecked: false };
    const today = todayKey();
    const yesterdayK = todayKey(new Date(Date.now() - 86_400_000));
    const todayChecked = checkins.has(today);
    if (!todayChecked && !checkins.has(yesterdayK)) return { days: dates.length, streak: 0, todayChecked: false };

    let streak = todayChecked ? 1 : 0;
    for (let i = todayChecked ? 1 : 0; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + "T00:00:00");
      const curr = new Date(dates[i] + "T00:00:00");
      const diff = (prev.getTime() - curr.getTime()) / 86_400_000;
      if (Math.abs(diff - 1) < 0.1) streak++;
      else break;
    }
    return { days: dates.length, streak, todayChecked };
  }, [checkins]);

  return (
    <>
      <PageHeader eyebrow={profile.name} title="Perfil" />

      <main className="px-6 space-y-6">
        <section className="flex items-center gap-4 bg-card rounded-2xl p-5 ring-1 ring-black/5">
          <div className="size-14 rounded-full bg-secondary ring-2 ring-foreground/10 grid place-items-center text-sm font-semibold uppercase">
            {profile.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold truncate">{profile.name}</p>
            <p className="text-sm text-muted-foreground truncate">
              {profile.job || (profile.city?.name ?? "Sem profissão definida")}
            </p>
          </div>
          <Link
            to="/perfil/editar"
            className="text-xs font-medium text-accent bg-secondary/60 px-3 py-1.5 rounded-full ring-1 ring-black/5 active:scale-95 transition-transform shrink-0"
          >
            Editar
          </Link>
        </section>

        <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5">
          <Link to="/perfil/editar" className="flex items-center gap-4 active:scale-[0.99] transition-transform">
            <div className="size-10 rounded-xl bg-secondary grid place-items-center shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Agente IA · Hermes</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasAgentKey
                  ? `✓ Chave ${agentConfig.provider === "gemini" ? "Gemini" : "DeepSeek"} configurada`
                  : "⚠️ API key não configurada"}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </Link>
        </section>

        <section className="grid grid-cols-3 gap-2">
          {[
            { label: "Check-ins", value: hydrated ? String(checkinStreak.days) : "—" },
            { label: "Sequência", value: `${checkinStreak.streak} dias` },
            { label: "Hoje", value: checkinStreak.todayChecked ? "✅" : "—" },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-xl p-3 ring-1 ring-black/5 text-center">
              <p className="text-base font-semibold tabular-nums">{s.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                {s.label}
              </p>
            </div>
          ))}
        </section>

        <section className="bg-card rounded-2xl ring-1 ring-black/5 divide-y divide-border">
          {items.map((item) => (
            <Link
              key={item.label}
              to={item.to ?? "#"}
              onClick={item.onClick}
              className="flex items-center gap-4 px-5 py-4 active:scale-[0.99] transition-transform"
            >
              <div className="size-9 rounded-xl bg-secondary grid place-items-center shrink-0">
                <item.icon className="size-4 text-foreground" />
              </div>
              <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </section>

        <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Sobre
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            FocusMind é uma central de produtividade para designers com TDAH.
            Tudo começa com uma nota ou fala bagunçada — o Hermes organiza, gera
            checklist e te mostra o que fazer agora.
          </p>
          <p className="text-[11px] text-muted-foreground mt-3">
            v1.0 · 2025 · Todos os dados ficam no seu navegador.
          </p>
        </section>

        <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5">
          <button
            type="button"
            className="flex items-center gap-3 text-sm text-destructive font-medium active:scale-[0.99] transition-transform"
          >
            <LogOut className="size-4" />
            Sair (apagar dados locais)
          </button>
        </section>

        <div className="h-4" />
      </main>
    </>
  );
}