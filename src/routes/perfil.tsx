import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Bell, ChevronRight, LogOut, Moon, Settings, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — FocusMind" },
      { name: "description", content: "Suas estatísticas, lembretes e configurações." },
    ],
  }),
  component: PerfilPage,
});

const stats = [
  { label: "Foco hoje", value: "2h 15m" },
  { label: "Sessões", value: "5" },
  { label: "Streak", value: "12d" },
];

const items = [
  { icon: Bell, label: "Lembretes", to: "/perfil" },
  { icon: Settings, label: "Configurações", to: "/perfil" },
  { icon: ShieldCheck, label: "Privacidade", to: "/perfil" },
  { icon: Moon, label: "Modo silencioso", to: "/perfil" },
] as const;

function PerfilPage() {
  return (
    <>
      <PageHeader eyebrow="Perfil" title="Tiago Almeida" streak={12} />
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
          {items.map(({ icon: Icon, label, to }, i) => (
            <Link
              key={label}
              to={to}
              className={[
                "flex items-center gap-3 px-4 py-4 text-sm",
                i !== items.length - 1 ? "border-b border-border" : "",
              ].join(" ")}
            >
              <span className="size-9 rounded-xl bg-secondary grid place-items-center">
                <Icon className="size-4 text-foreground" />
              </span>
              <span className="flex-1 font-medium">{label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </section>

        <button className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground py-4">
          <LogOut className="size-4" /> Encerrar sessão
        </button>
        <div className="h-4" />
      </main>
    </>
  );
}