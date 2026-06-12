import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Home, MessageSquareText, Mic, Timer, User, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAgentConfig } from "@/lib/agent-store";
import { runAgent } from "@/lib/agent";
import { useExecuteActions } from "@/lib/agents/execute";
import { buildProfileContext, useProfile } from "@/lib/profile-store";
import { useAlarmRunner } from "@/lib/alarm-runner";
import { useHermesTracker } from "@/lib/hermes/tracker";
import { useNotificationSystem } from "@/lib/notifications/use-notification-system";
import { markPresenceToday } from "@/lib/activity-log";
import { toast } from "sonner";

const tabs = [
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/timer", label: "Timer", icon: Timer },
  { to: "/", label: "Home", icon: Home },
  { to: "/chat", label: "Chat", icon: MessageSquareText },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onChat = pathname === "/chat";
  const onHome = pathname === "/";
  const [config] = useAgentConfig();
  const [profile] = useProfile();
  const execute = useExecuteActions();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  useAlarmRunner();
  useHermesTracker();
  useNotificationSystem();

  useEffect(() => {
    markPresenceToday();
    const onVisible = () => {
      if (document.visibilityState === "visible") markPresenceToday();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") markPresenceToday();
    }, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    return () => {
      try {
        recogRef.current?.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  const hasKey =
    (config.provider === "gemini" && config.geminiKey) ||
    (config.provider === "deepseek" && config.deepseekKey);

  const handleTranscript = async (text: string) => {
    if (!hasKey) {
      toast.error("Configure sua API key em Perfil → Agente IA");
      return;
    }
    setProcessing(true);
    try {
      const result = await runAgent(
        config,
        [{ role: "user", content: text }],
        buildProfileContext(profile),
      );
      if (result.routed.length === 0) {
        toast(`Nada para executar — "${text}"`);
      } else {
        execute(result.routed);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro do agente";
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const startMic = () => {
    const Ctor = getSpeechCtor();
    if (!Ctor) {
      toast.error("Microfone não suportado neste navegador");
      return;
    }
    if (recording) {
      try {
        recogRef.current?.stop();
      } catch {
        /* noop */
      }
      return;
    }
    const r: SpeechRecognitionLike = new Ctor();
    r.lang = "pt-BR";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.continuous = false;
    r.onstart = () => {
      setRecording(true);
      toast("Ouvindo… fale livremente");
    };
    r.onerror = (e) => {
      setRecording(false);
      toast.error(`Microfone: ${e.error}`);
    };
    r.onend = () => setRecording(false);
    r.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript?.trim();
      if (text) handleTranscript(text);
    };
    recogRef.current = r;
    try {
      r.start();
    } catch {
      setRecording(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-40">
      <Outlet />

      {!onChat && (
        <Link
          to="/chat"
          aria-label="Abrir agente IA"
          className="fixed bottom-28 right-5 z-40 size-14 rounded-full bg-foreground text-background shadow-lg shadow-foreground/20 grid place-items-center transition-transform active:scale-90 [body.modal-open_&]:translate-y-32 [body.modal-open_&]:pointer-events-none"
        >
          <Sparkles className="size-5" />
        </Link>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-50 bg-card/85 backdrop-blur-md border-t border-border px-4 pt-3 pb-6 transition-transform duration-200 [body.modal-open_&]:translate-y-full [body.modal-open_&]:pointer-events-none">
        <ul className="flex justify-between items-center max-w-md mx-auto">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);

            // Slot central: na Home vira microfone (transcrição -> tarefa).
            if (to === "/" && onHome) {
              return (
                <li key="mic" className="flex-1">
                  <button
                    type="button"
                    onClick={startMic}
                    aria-label={recording ? "Parar gravação" : "Ditar tarefa"}
                    className="flex flex-col items-center gap-1 py-1 w-full"
                  >
                    <span
                      className={[
                        "grid place-items-center rounded-full transition-all size-12 -mt-3 shadow-lg",
                        recording
                          ? "bg-destructive text-destructive-foreground ring-4 ring-destructive/30 animate-pulse"
                          : processing
                            ? "bg-accent text-accent-foreground ring-4 ring-background animate-pulse"
                            : "bg-foreground text-background ring-4 ring-background",
                      ].join(" ")}
                    >
                      <Mic className="size-5" />
                    </span>
                    <span className="text-[10px] tracking-wider uppercase font-semibold text-foreground">
                      {recording ? "Ouvindo" : processing ? "Roteando" : "Ditar"}
                    </span>
                  </button>
                </li>
              );
            }

            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  className="flex flex-col items-center gap-1 py-1"
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={[
                      "grid place-items-center rounded-full transition-all",
                      active
                        ? "bg-foreground text-background size-9"
                        : "size-9 text-muted-foreground",
                    ].join(" ")}
                  >
                    <Icon className="size-[18px]" />
                  </span>
                  <span
                    className={[
                      "text-[10px] tracking-wider uppercase",
                      active ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
                    ].join(" ")}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
