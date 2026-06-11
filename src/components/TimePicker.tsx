import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  /** Minute step (default 5). Use 1 for arbitrary minutes. */
  minuteStep?: number;
};

/**
 * Compact time picker styled to match the app (no native system UI).
 * Renders as a button showing HH:MM with a clock icon; click opens a popover
 * with two scrollable columns of hour / minute chips.
 */
export function TimePicker({ value, onChange, className, minuteStep = 5 }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [h, m] = (value || "00:00").split(":");

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) =>
    String(i * minuteStep).padStart(2, "0"),
  );


  return (
    <div ref={wrapRef} className={["relative inline-block", className ?? ""].join(" ")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-between gap-2 bg-secondary rounded-lg px-3 py-1.5 text-sm tabular-nums ring-1 ring-black/5 hover:ring-foreground/30 active:scale-[0.99]"
      >
        <span>{value || "—"}</span>
        <Clock className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 right-0 w-40 rounded-xl bg-card ring-1 ring-black/10 shadow-lg p-2 [&_*::-webkit-scrollbar]:!w-1 [&_*]:[scrollbar-width:thin]">
          <div className="flex gap-2">
            <Column
              items={hours}
              selected={h ?? "00"}
              onPick={(v) => onChange(`${v}:${m ?? "00"}`)}
              label="H"
            />
            <Column
              items={minutes}
              selected={m ?? "00"}
              onPick={(v) => onChange(`${h ?? "00"}:${v}`)}
              label="M"
            />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 w-full bg-foreground text-background rounded-lg py-1.5 text-xs font-semibold active:scale-[0.99]"
          >
            Pronto
          </button>
        </div>
      )}
    </div>
  );
}



function Column({
  items,
  selected,
  onPick,
  label,
}: {
  items: string[];
  selected: string;
  onPick: (v: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLButtonElement>("[data-active='true']");
    el?.scrollIntoView({ block: "center" });
  }, []);
  return (
    <div className="flex-1 min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center mb-1">
        {label}
      </div>
      <div
        ref={ref}
        className="h-40 overflow-y-auto rounded-lg bg-secondary ring-1 ring-black/5 p-1 space-y-1"
      >
        {items.map((it) => {
          const active = it === selected;
          return (
            <button
              key={it}
              type="button"
              data-active={active}
              onClick={() => onPick(it)}
              className={[
                "w-full rounded-md py-1 text-sm font-semibold tabular-nums transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-foreground/80 hover:bg-foreground/5",
              ].join(" ")}
            >
              {it}
            </button>
          );
        })}
      </div>
    </div>
  );
}
