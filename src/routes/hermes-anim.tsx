import { createFileRoute } from "@tanstack/react-router";
import { HermesChatAnimation } from "@/components/HermesChatAnimation";

export const Route = createFileRoute("/hermes-anim")({
  head: () => ({
    meta: [
      { title: "Hermes — Animação" },
      { name: "description", content: "Demonstração da animação do agente Hermes." },
    ],
  }),
  component: HermesAnimPage,
});

function HermesAnimPage() {
  return (
    <main className="min-h-screen grid place-items-center px-4 py-10 bg-background">
      <div className="w-full">
        <h1 className="text-center text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-6">
          Hermes · Animação de chat
        </h1>
        <HermesChatAnimation />
      </div>
    </main>
  );
}
