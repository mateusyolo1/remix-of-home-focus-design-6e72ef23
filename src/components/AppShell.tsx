import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Home, MessageSquareText, Timer, User } from "lucide-react";

const tabs = [
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/timer", label: "Timer", icon: Timer },
  { to: "/", label: "Home", icon: Home },
  { to: "/chat", label: "Chat", icon: MessageSquareText },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onChat = pathname === "/chat";
  const onFoco = pathname === "/foco";

  return (
    <div className="min-h-screen text-foreground font-sans pb-28">
      <Outlet />

      {!onChat && !onFoco && (
        <Link
          to="/chat"
          aria-label="Abrir agente IA"
          className="fixed bottom-28 right-5 z-40 size-14 rounded-full glass-strong glow-accent grid place-items-center active:scale-90"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.78 0.16 280 / 0.9), oklch(0.65 0.2 240 / 0.85))",
          }}
        >
          <MessageSquareText className="size-5 text-white" />
        </Link>
      )}

      {!onFoco && (
        <nav className="fixed bottom-0 inset-x-0 z-50 px-3 pb-5 pt-3">
          <ul
            className="flex justify-between items-center max-w-md mx-auto rounded-3xl px-3 py-2 glass-strong"
          >
            {tabs.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <li key={to} className="flex-1">
                  <Link
                    to={to}
                    className="flex flex-col items-center gap-1 py-1.5 active:scale-90"
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      className={[
                        "grid place-items-center rounded-2xl transition-all size-9",
                        active
                          ? "bg-foreground text-background shadow-[0_8px_24px_-8px_oklch(1_0_0/0.4)]"
                          : "text-muted-foreground",
                      ].join(" ")}
                    >
                      <Icon className="size-[18px]" />
                    </span>
                    <span
                      className={[
                        "text-[9px] tracking-widest uppercase",
                        active ? "font-semibold text-foreground" : "font-medium text-muted-foreground/80",
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
      )}
    </div>
  );
}
