type Props = {
  eyebrow: string;
  title: string;
  streak?: number;
};

export function PageHeader({ eyebrow, title, streak }: Props) {
  return (
    <header className="px-6 pt-10 pb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-secondary ring-1 ring-black/5 grid place-items-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          T
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-accent">
            {eyebrow}
          </p>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        </div>
      </div>
      {typeof streak === "number" && (
        <div className="flex items-center gap-2 bg-secondary/80 px-3 py-1.5 rounded-full ring-1 ring-black/5">
          <span className="size-1.5 rounded-full bg-[var(--streak)]" />
          <span className="text-xs font-medium text-muted-foreground">{streak} dias</span>
        </div>
      )}
    </header>
  );
}