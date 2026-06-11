export type Theme = "light" | "dark" | "system";
export type PaletteId = "paper" | "midnight" | "sage" | "noir" | "ocean" | "terracotta" | "rose" | "forest" | "sunset" | "liquid";

export const THEME_KEY = "fm-theme";
export const PALETTE_KEY = "fm-palette";

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function applyPalette(id: PaletteId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-palette", id);
}

export function initAppearance() {
  if (typeof window === "undefined") return;
  const theme = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
  const palette = (localStorage.getItem(PALETTE_KEY) as PaletteId | null) ?? "paper";
  applyTheme(theme);
  applyPalette(palette);
}
