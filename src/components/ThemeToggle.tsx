import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "light" | "dark" | "system";
const KEY = "fm-theme";

function apply(theme: Theme) {
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as Theme | null) ?? "system";
    setTheme(stored);
    apply(stored);
  }, []);

  const choose = (t: Theme) => {
    setTheme(t);
    localStorage.setItem(KEY, t);
    apply(t);
  };

  const opts: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Claro", icon: Sun },
    { id: "dark", label: "Escuro", icon: Moon },
    { id: "system", label: "Sistema", icon: Monitor },
  ];

  return (
    <div className="bg-card rounded-2xl ring-1 ring-black/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Tema
        </p>
        <span className="text-[10px] uppercase tracking-widest text-accent">
          {opts.find((o) => o.id === theme)?.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {opts.map(({ id, label, icon: Icon }) => {
          const active = theme === id;
          return (
            <button
              key={id}
              onClick={() => choose(id)}
              className={[
                "flex flex-col items-center gap-1.5 py-3 rounded-xl ring-1 transition-transform active:scale-95",
                active
                  ? "bg-foreground text-background ring-foreground"
                  : "bg-secondary text-foreground ring-black/5",
              ].join(" ")}
            >
              <Icon className="size-4" />
              <span className="text-[11px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}