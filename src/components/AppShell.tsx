import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Home, MessageSquareText, Mic, Timer, User, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAgentConfig } from "@/lib/agent-store";
import { runAgent } from "@/lib/agent";
import { useExecuteActions } from "@/lib/agents/execute";
import { buildProfileContext, useProfile } from "@/lib/profile-store";
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
  const { add } = useTasks();
  const [recording, setRecording] = useState(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    return () => {
      try {
        recogRef.current?.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

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
      toast("Ouvindo… fale sua tarefa");
    };
    r.onerror = (e) => {
      setRecording(false);
      toast.error(`Microfone: ${e.error}`);
    };
    r.onend = () => setRecording(false);
    r.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript?.trim();
      if (text) {
        add(text);
        toast.success(`Tarefa: ${text}`);
      }
    };
    recogRef.current = r;
    try {
      r.start();
    } catch {
      setRecording(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-28">
      <Outlet />

      {!onChat && (
        <Link
          to="/chat"
          aria-label="Abrir agente IA"
          className="fixed bottom-28 right-5 z-40 size-14 rounded-full bg-foreground text-background shadow-lg shadow-foreground/20 grid place-items-center transition-transform active:scale-90"
        >
          <Sparkles className="size-5" />
        </Link>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-50 bg-card/85 backdrop-blur-md border-t border-border px-4 pt-3 pb-6">
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
                          : "bg-foreground text-background ring-4 ring-background",
                      ].join(" ")}
                    >
                      <Mic className="size-5" />
                    </span>
                    <span className="text-[10px] tracking-wider uppercase font-semibold text-foreground">
                      {recording ? "Ouvindo" : "Ditar"}
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
