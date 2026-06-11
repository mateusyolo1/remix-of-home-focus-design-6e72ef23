import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PalettePicker } from "@/components/PalettePicker";
import { Bell, BellOff, ChevronLeft } from "lucide-react";
import { useAppSettings, ARCHIVE_RETENTION_OPTIONS } from "@/lib/app-settings";
import { useEffect, useState } from "react";
import {
  getNotificationPermission,
  permissionLabel,
  requestNotificationPermission,
} from "@/lib/notifications/notification-permissions";
import {
  showNotificationNow,
  useNotificationSettings,
} from "@/lib/notifications/notification-service";
import type { NotificationPermissionState } from "@/lib/notifications/notification-types";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — FocusMind" },
      { name: "description", content: "Ajuste tema, paleta, notificações e arquivamento." },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const [settings, update] = useAppSettings();
  const [notif, updateNotif] = useNotificationSettings();
  const [perm, setPerm] = useState<NotificationPermissionState>("default");

  useEffect(() => {
    setPerm(getNotificationPermission());
  }, []);

  const askPermission = async () => {
    const next = await requestNotificationPermission();
    setPerm(next);
    if (next === "granted") toast.success("Notificações ativadas");
    if (next === "denied") toast.error("Ative manualmente nas configurações do navegador/sistema");
  };

  const testNotification = async () => {
    const ok = await showNotificationNow({
      title: "Notificação de teste",
      body: "Tudo funcionando — esta é uma notificação de exemplo.",
      kind: "test",
    });
    if (!ok) toast.error("Não foi possível mostrar a notificação");
  };

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

        <section className="bg-card rounded-2xl p-5 ring-1 ring-black/5 space-y-4">
          <div className="flex items-center gap-2">
            {notif.enabled ? <Bell className="size-4" /> : <BellOff className="size-4 text-muted-foreground" />}
            <h3 className="text-sm font-semibold">Notificações e alarmes</h3>
          </div>

          <div className="text-xs text-muted-foreground">
            Permissão: <span className="text-foreground font-medium">{permissionLabel(perm)}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={askPermission}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground text-background active:scale-95 transition-transform"
            >
              Ativar notificações
            </button>
            <button
              type="button"
              onClick={testNotification}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary ring-1 ring-black/5 active:scale-95 transition-transform"
            >
              Testar notificação
            </button>
          </div>

          <ToggleRow label="Ativar notificações" value={notif.enabled} onChange={(v) => updateNotif({ enabled: v })} />
          <ToggleRow label="Som do timer" value={notif.soundEnabled} onChange={(v) => updateNotif({ soundEnabled: v })} />
          <ToggleRow label="Vibração" value={notif.vibrationEnabled} onChange={(v) => updateNotif({ vibrationEnabled: v })} />
          <ToggleRow
            label="Repetir alerta até interagir"
            value={notif.repeatUntilDismissed}
            onChange={(v) => updateNotif({ repeatUntilDismissed: v })}
          />
          <ToggleRow
            label="Lembrar tarefas com prazo"
            value={notif.taskRemindersEnabled}
            onChange={(v) => updateNotif({ taskRemindersEnabled: v })}
          />
          <ToggleRow
            label="Lembrar tarefas atrasadas"
            value={notif.remindOverdue}
            onChange={(v) => updateNotif({ remindOverdue: v })}
          />
          <ToggleRow
            label="Horário silencioso (22h–7h)"
            value={notif.quietHoursEnabled}
            onChange={(v) => updateNotif({ quietHoursEnabled: v })}
          />
        </section>

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

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={[
          "relative w-10 h-6 rounded-full transition-colors",
          value ? "bg-foreground" : "bg-secondary ring-1 ring-black/10",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 size-5 rounded-full bg-background transition-transform",
            value ? "translate-x-[18px]" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
    </label>
  );
}
