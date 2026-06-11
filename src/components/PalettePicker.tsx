import { useEffect, useState } from "react";

type PaletteId = "paper" | "midnight" | "sage" | "noir" | "ocean" | "terracotta" | "rose" | "forest" | "sunset" | "liquid";

const KEY = "fm-palette";

type Preset = {
  id: PaletteId;
  name: string;
  swatches: [string, string, string, string];
};

const PRESETS: Preset[] = [
  { id: "paper",      name: "Morning Paper",   swatches: ["#f5f3ee", "#e8e4dd", "#2d2d2d", "#0d0d0d"] },
  { id: "midnight",   name: "Midnight Indigo", swatches: ["#0a0a1a", "#141432", "#1e1e5a", "#4f46e5"] },
  { id: "sage",       name: "Sage & Cream",    swatches: ["#f5f0e8", "#dce5d4", "#a8c0a0", "#7d9b76"] },
  { id: "noir",       name: "Noir & Gold",     swatches: ["#0d0d0d", "#1a1a1a", "#c9a84c", "#f0d78c"] },
  { id: "ocean",      name: "Ocean Deep",      swatches: ["#0c2340", "#1a4a6e", "#2d8a9e", "#5cbdb9"] },
  { id: "terracotta", name: "Terracotta",      swatches: ["#c4654a", "#e8a87c", "#87a878", "#4a6741"] },
  { id: "rose",       name: "Rose Quartz",     swatches: ["#fde8ec", "#f5b8c4", "#e0788e", "#a83a52"] },
  { id: "forest",     name: "Floresta",        swatches: ["#e8efe2", "#a8c79a", "#3e6b3a", "#1f3a1c"] },
  { id: "sunset",     name: "Pôr do Sol",      swatches: ["#fde4cf", "#f5a86a", "#e85a3c", "#8a2a1a"] },
  { id: "liquid",     name: "Liquid Glass",    swatches: ["#a5b4fc", "#f0abfc", "#7dd3fc", "#fbcfe8"] },
];


function apply(id: PaletteId) {
  document.documentElement.setAttribute("data-palette", id);
}

export function PalettePicker() {
  const [palette, setPalette] = useState<PaletteId>("paper");

  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as PaletteId | null) ?? "paper";
    setPalette(stored);
    apply(stored);
  }, []);

  const choose = (id: PaletteId) => {
    setPalette(id);
    localStorage.setItem(KEY, id);
    apply(id);
  };

  return (
    <div className="bg-card rounded-2xl ring-1 ring-black/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Paleta
        </p>
        <span className="text-[10px] uppercase tracking-widest text-accent">
          {PRESETS.find((p) => p.id === palette)?.name}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((p) => {
          const active = palette === p.id;
          return (
            <button
              key={p.id}
              onClick={() => choose(p.id)}
              className={[
                "flex flex-col items-start gap-2 p-3 rounded-xl ring-1 transition-transform active:scale-95 text-left",
                active
                  ? "bg-foreground/5 ring-foreground"
                  : "bg-secondary ring-black/5",
              ].join(" ")}
            >
              <div className="flex -space-x-1.5">
                {p.swatches.map((c, i) => (
                  <span
                    key={i}
                    className="size-5 rounded-full ring-2 ring-card"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <span className="text-[11px] font-medium">{p.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
