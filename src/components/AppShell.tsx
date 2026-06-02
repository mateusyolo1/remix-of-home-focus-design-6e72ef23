import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Home, MessageSquareText, Timer, User, Sparkles } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/timer", label: "Timer", icon: Timer },
  { to: "/chat", label: "Chat", icon: MessageSquareText },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onChat = pathname === "/chat";

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