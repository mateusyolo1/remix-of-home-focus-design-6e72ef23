import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type Phase = "idle" | "user" | "typing" | "reply" | "sparkle" | "done";

export function HermesChatAnimation({
  userText = "Hermes, qual é a previsão para hoje?",
  replyText = "Bom dia! Hoje será ensolarado, 24°C. Bom momento para uma caminhada ☀️",
  loop = true,
  typingMs = 2000,
}: {
  userText?: string;
  replyText?: string;
  loop?: boolean;
  typingMs?: number;
}) {
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    const timers: number[] = [];
    const run = () => {
      setPhase("idle");
      timers.push(window.setTimeout(() => setPhase("user"), 250));
      timers.push(window.setTimeout(() => setPhase("typing"), 900));
      timers.push(window.setTimeout(() => setPhase("reply"), 900 + typingMs));
      timers.push(window.setTimeout(() => setPhase("sparkle"), 900 + typingMs + 700));
      timers.push(window.setTimeout(() => setPhase("done"), 900 + typingMs + 1800));
      if (loop) {
        timers.push(window.setTimeout(run, 900 + typingMs + 3800));
      }
    };
    run();
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [loop, typingMs, userText, replyText]);

  const showUser = phase !== "idle";
  const showTyping = phase === "typing";
  const showReply = phase === "reply" || phase === "sparkle" || phase === "done";
  const showSparkle = phase === "sparkle" || phase === "done";

  return (
    <div className="w-full max-w-md mx-auto p-5 rounded-3xl bg-card ring-1 ring-black/5 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="size-9 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 grid place-items-center text-[11px] font-bold text-amber-950 shadow-sm">
          H
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-amber-600 font-semibold leading-none mb-0.5">
            Agente
          </p>
          <p className="text-sm font-semibold text-foreground leading-none">Hermes IA</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          online
        </span>
      </div>

      {/* Conversation */}
      <div className="flex flex-col gap-3 min-h-[180px]">
        {/* User bubble */}
        {showUser && (
          <div className="flex justify-end animate-[hermes-pop_300ms_ease-out]">
            <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-foreground text-background text-sm leading-relaxed shadow-sm">
              {userText}
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {showTyping && (
          <div className="flex justify-start animate-[hermes-fade_200ms_ease-out]">
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-amber-50 ring-1 ring-amber-200/60 flex items-center gap-1.5">
              <Dot delay="0ms" />
              <Dot delay="160ms" />
              <Dot delay="320ms" />
            </div>
          </div>
        )}

        {/* Hermes reply */}
        {showReply && (
          <div className="flex justify-start animate-[hermes-rise_400ms_cubic-bezier(0.22,1,0.36,1)]">
            <div className="relative max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-sm bg-gradient-to-br from-amber-100 to-amber-200/70 ring-1 ring-amber-300/50 text-sm leading-relaxed text-amber-950 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1 text-[10px] uppercase tracking-widest text-amber-700 font-semibold">
                <Sparkles className="size-3" /> Hermes
              </div>
              {replyText}

              {showSparkle && (
                <>
                  <span
                    className="absolute -top-1.5 -right-1.5 text-amber-500 animate-[hermes-sparkle_900ms_ease-out]"
                    aria-hidden
                  >
                    <Sparkles className="size-4 drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
                  </span>
                  <span
                    className="absolute -bottom-1 right-6 text-amber-400 animate-[hermes-sparkle_900ms_120ms_ease-out]"
                    aria-hidden
                  >
                    <Sparkles className="size-2.5 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]" />
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes hermes-pop {
          0%   { opacity: 0; transform: translateY(8px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes hermes-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hermes-rise {
          0%   { opacity: 0; transform: translateY(10px) scale(0.97); filter: blur(2px); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    filter: blur(0); }
        }
        @keyframes hermes-sparkle {
          0%   { opacity: 0; transform: scale(0.4) rotate(-20deg); }
          50%  { opacity: 1; transform: scale(1.2) rotate(10deg); }
          100% { opacity: 0; transform: scale(1)   rotate(0deg); }
        }
        @keyframes hermes-dot {
          0%, 60%, 100% { transform: translateY(0);    opacity: 0.4; }
          30%           { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="size-2 rounded-full bg-amber-500"
      style={{ animation: `hermes-dot 1.1s ${delay} infinite ease-in-out` }}
    />
  );
}
