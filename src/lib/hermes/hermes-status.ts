export type HermesInstallStatus =
  | "not_installed"
  | "installing_manual"
  | "installed_in_termux"
  | "connection_not_configured"
  | "connected"
  | "error";

export type HermesConnectionMode =
  | "local_fallback"
  | "manual_termux"
  | "local_bridge"
  | "remote_api";

export const INSTALL_STATUS_LABEL: Record<HermesInstallStatus, string> = {
  not_installed: "Não instalado",
  installing_manual: "Instalando (manual)",
  installed_in_termux: "Instalado no Termux",
  connection_not_configured: "Sem conexão configurada",
  connected: "Conectado",
  error: "Erro",
};

export const CONNECTION_MODE_LABEL: Record<HermesConnectionMode, string> = {
  local_fallback: "Fallback local",
  manual_termux: "Manual (Termux)",
  local_bridge: "Bridge local",
  remote_api: "API remota",
};
