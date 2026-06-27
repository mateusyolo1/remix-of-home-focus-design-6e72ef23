import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Bell, BellOff, BellRing, ChevronLeft, Plus, Trash2, Volume2, VolumeX, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import {
  describeRepeat,
  useAlarms,
  type Alarm,
  type AlarmRepeat,
  type WeekDay,
} from "@/lib/alarms-store";
import { TimePicker } from "@/components/TimePicker";
import { toast } from "sonner";
import { emitAlarmRing } from "@/lib/alarm-runner";

export const Route = createFileRoute("/alarmes")({
  head: () => ({
    meta: [
      { title: "Alarmes — FocusMind" },
      { name: "description", content: "Crie alarmes e notificações recorrentes." },
    ],
  }),
  component: AlarmesPage,
});

function AlarmesPage() {
  const { list, add, update, remove, toggle } = useAlarms();
  const [open, setOpen] = useState(false);
  const [permLabel, setPermLabel] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermLabel(Notification.permission);
    }
  }, []);

  const requestPerm = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Notificações não suportadas neste navegador");
      return;
    }
    const res = await Notification.requestPermission();
    setPermLabel(res);
    if (res === "granted") toast.success("Notificações habilitadas");
    else toast.error("Permissão negada");
  };

  const testRing = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    emitAlarmRing({
      id: "test-" + now.getTime(),
      label: "Alarme de teste",
      time: `${hh}:${mm}`,
      enabled: true,
      repeat: "once",
      notify: false,
      sound: "beep",
      days: [],
    } as unknown as Alarm);
  };

  return (
    <>
      <PageHeader eyebrow="Lembretes" title="Alarmes" />
      <main className="px-6 space-y-5 pb-10">
        <Link
          to="/perfil"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"
        >
          <ChevronLeft className="size-4" /> Voltar
        </Link>

        <div className="bg-card rounded-2xl p-4 ring-1 ring-black/5 flex items-center gap-3">
          <span className="size-10 rounded-xl bg-accent/15 text-accent grid place-items-center">
            <BellRing className="size-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Notificações do sistema</p>
            <p className="text-[11px] text-muted-foreground">
              Status: {permLabel === "granted" ? "ativadas" : permLabel === "denied" ? "bloqueadas" : "não solicitadas"}
            </p>
          </div>
          {permLabel !== "granted" && (
            <button
              type="button"
              onClick={requestPerm}
              className="text-[11px] uppercase tracking-widest font-semibold text-accent bg-secondary px-3 py-2 rounded-full ring-1 ring-black/5 active:scale-95"
            >
              Permitir
            </button>
          )}
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Seus alarmes
            </h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={testRing}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground px-2 py-1 rounded-md hover:bg-secondary active:scale-95"
              >
                <Zap className="size-3.5" /> Testar
              </button>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent px-2 py-1 rounded-md hover:bg-secondary active:scale-95"
              >
                <Plus className="size-3.5" /> Novo
              </button>
            </div>
          </div>

          {list.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-6">
              Nenhum alarme. Toque em "Novo" para criar.
            </p>
          )}

          <ul className="space-y-2">
            {list.map((a) => (
              <li
                key={a.id}
                className={[
                  "p-4 bg-card rounded-2xl ring-1 ring-black/5 flex items-center gap-3",
                  !a.enabled ? "opacity-60" : "",
                ].join(" ")}
              >
                <button
                  onClick={() => toggle(a.id)}
                  aria-label={a.enabled ? "Desativar" : "Ativar"}
                  className={[
                    "size-10 rounded-xl grid place-items-center transition-colors",
                    a.enabled
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground",
                  ].join(" ")}
                >
                  {a.enabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-medium tabular-nums tracking-tight">{a.time}</span>
                    <span className="text-xs text-muted-foreground truncate">{a.label || "Alarme"}</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                    {describeRepeat(a)}
                    {a.sound ? " · som" : " · silencioso"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => update(a.id, { sound: !a.sound })}
                  aria-label={a.sound ? "Silenciar" : "Ativar som"}
                  className="size-8 rounded-md text-muted-foreground hover:bg-secondary grid place-items-center"
                >
                  {a.sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  aria-label="Remover"
                  className="size-8 rounded-md text-muted-foreground hover:bg-secondary grid place-items-center"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>

      {open && (
        <AlarmEditor
          onClose={() => setOpen(false)}
          onSave={(data) => {
            add(data);
            setOpen(false);
            toast.success("Alarme criado");
          }}
        />
      )}
    </>
  );
}

const REPEAT_OPTIONS: { value: AlarmRepeat; label: string }[] = [
  { value: "once", label: "Uma vez" },
  { value: "daily", label: "Todos os dias" },
  { value: "weekday", label: "Seg a sex" },
  { value: "weekend", label: "Fim de semana" },
  { value: "custom", label: "Personalizado" },
];

const DAY_LABELS: { value: WeekDay; label: string }[] = [
  { value: 0, label: "D" },
  { value: 1, label: "S" },
  { value: 2, label: "T" },
  { value: 3, label: "Q" },
  { value: 4, label: "Q" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
];

function AlarmEditor({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (a: Omit<Alarm, "id" | "enabled">) => void;
}) {
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("07:00");
  const [repeat, setRepeat] = useState<AlarmRepeat>("daily");
  const [days, setDays] = useState<WeekDay[]>([1, 2, 3, 4, 5]);
  const [sound, setSound] = useState(true);
  const [notify, setNotify] = useState(true);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl ring-1 ring-black/5 p-5 pb-7 space-y-4 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Novo alarme</p>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="size-8 rounded-full bg-secondary grid place-items-center"
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Nome</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Acordar, tomar remédio…"
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm outline-none ring-1 ring-black/5 focus:ring-foreground"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Horário</span>
          <TimePicker
            value={time}
            onChange={setTime}
            minuteStep={1}
            className="w-full"
            buttonClassName="w-full inline-flex items-center justify-between gap-2 bg-secondary rounded-lg px-3 py-3 text-2xl font-medium tabular-nums outline-none ring-1 ring-black/5 hover:ring-foreground/30 focus:ring-foreground active:scale-[0.99]"
          />
        </label>


        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Repetir</span>
          <div className="grid grid-cols-2 gap-2">
            {REPEAT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setRepeat(o.value)}
                className={[
                  "py-2 rounded-lg text-xs font-medium ring-1 transition-colors active:scale-95",
                  repeat === o.value
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-secondary text-foreground ring-black/5",
                ].join(" ")}
              >
                {o.label}
              </button>
            ))}
          </div>
          {repeat === "custom" && (
            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {DAY_LABELS.map((d) => {
                const on = days.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() =>
                      setDays((cur) =>
                        cur.includes(d.value) ? cur.filter((x) => x !== d.value) : [...cur, d.value],
                      )
                    }
                    className={[
                      "py-2 rounded-lg text-xs font-semibold ring-1 active:scale-95",
                      on
                        ? "bg-foreground text-background ring-foreground"
                        : "bg-secondary text-muted-foreground ring-black/5",
                    ].join(" ")}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSound((v) => !v)}
            className={[
              "py-2 rounded-lg text-xs font-medium ring-1 inline-flex items-center justify-center gap-2 active:scale-95",
              sound
                ? "bg-foreground text-background ring-foreground"
                : "bg-secondary text-foreground ring-black/5",
            ].join(" ")}
          >
            {sound ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />} Som
          </button>
          <button
            type="button"
            onClick={() => setNotify((v) => !v)}
            className={[
              "py-2 rounded-lg text-xs font-medium ring-1 inline-flex items-center justify-center gap-2 active:scale-95",
              notify
                ? "bg-foreground text-background ring-foreground"
                : "bg-secondary text-foreground ring-black/5",
            ].join(" ")}
          >
            <Bell className="size-3.5" /> Notificar
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            onSave({
              label: label.trim() || "Alarme",
              time,
              repeat,
              days: repeat === "custom" ? days : undefined,
              sound,
              notify,
            })
          }
          className="w-full bg-foreground text-background py-3 rounded-xl font-medium text-sm active:scale-[0.98]"
        >
          Salvar alarme
        </button>
      </div>
    </div>
  );
}
