import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PalettePicker } from "@/components/PalettePicker";
import { ChevronLeft } from "lucide-react";
import { useAppSettings, ARCHIVE_RETENTION_OPTIONS } from "@/lib/app-settings";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — FocusMind" },
      { name: "description", content: "Ajuste tema, paleta e regras de arquivamento." },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const [settings, update] = useAppSettings();
  return (
    <>
      <PageHeader eyebrow="Perfil" title="Configurações" />
      <main className="px-6 space-y-6">
        <Link
          to="/perfil"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"
        >
          <ChevronLeft className="size-4" /> Voltar
        </Link>
        <ThemeToggle />
        <PalettePicker />

        <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Arquivamento de notas</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Notas arquivadas são deletadas automaticamente após o período escolhido.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {ARCHIVE_RETENTION_OPTIONS.map((opt) => {
              const active = settings.archiveRetentionDays === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ archiveRetentionDays: opt.value })}
                  className={[
                    "py-2 rounded-lg text-xs font-medium ring-1 transition-colors active:scale-95",
                    active
                      ? "bg-foreground text-background ring-foreground"
                      : "bg-secondary text-foreground ring-black/5",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        <div className="h-4" />
      </main>
    </>
  );
}
