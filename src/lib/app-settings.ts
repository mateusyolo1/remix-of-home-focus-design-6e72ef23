import { useEffect, useState } from "react";

export type ArchiveRetentionDays = 30 | 60 | 90 | 365;

export const ARCHIVE_RETENTION_OPTIONS: { value: ArchiveRetentionDays; label: string }[] = [
  { value: 30, label: "30 dias" },
  { value: 60, label: "60 dias" },
  { value: 90, label: "90 dias" },
  { value: 365, label: "1 ano" },
];

export type AppSettings = {
  /** Após quantos dias uma nota arquivada é deletada automaticamente. */
  archiveRetentionDays: ArchiveRetentionDays;
  /** Após quantas horas uma tarefa sem importância/vínculo expira. */
  taskExpiryHours: number;
  /**
   * Feature flag — quando true, ativa recursos novos do Hermes Agent V2
   * (sugestões proativas, resumo organizado, etc.). Default OFF para
   * manter o fluxo antigo funcionando.
   */
  hermesAgentV2Enabled: boolean;
};

const DEFAULT_SETTINGS: AppSettings = {
  archiveRetentionDays: 30,
  taskExpiryHours: 24,
  hermesAgentV2Enabled: false,
};

const KEY = "fm.app-settings";
const EVT = "fm:app-settings";

function read(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function write(v: AppSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useAppSettings() {
  const [s, setS] = useState<AppSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    setS(read());
    const on = () => setS(read());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(EVT, on);
      window.removeEventListener("storage", on);
    };
  }, []);
  const update = (patch: Partial<AppSettings>) => {
    const next = { ...s, ...patch };
    write(next);
    setS(next);
  };
  return [s, update] as const;
}
