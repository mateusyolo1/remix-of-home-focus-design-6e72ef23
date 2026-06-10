import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Bell, ChevronRight, LogOut, Moon, Settings, ShieldCheck, Sparkles, UserCog } from "lucide-react";
import { useMemo } from "react";
import { useCheckins, useProfile, todayKey } from "@/lib/profile-store";
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
  const { checkins } = useCheckins();

  // ... rest of the component remains exactly the same