import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PalettePicker } from "@/components/PalettePicker";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — FocusMind" },
      { name: "description", content: "Ajuste tema e paleta de cores do aplicativo." },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
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
        <div className="h-4" />
      </main>
    </>
  );
}
