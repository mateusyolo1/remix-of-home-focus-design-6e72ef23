import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft, BrainCog, CheckCircle2, RefreshCw, ShieldCheck, Trash2, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useHermesConfig, CONNECTION_MODE_LABEL, type HermesConnectionMode } from "@/lib/hermes/hermes-config";
import { testHermesConnection } from "@/lib/hermes/hermes-adapter";
import { checkSicConfig } from "@/lib/sic.functions";

export const Route = createFileRoute("/hermes")({
  head: () => ({
    meta: [
      { title: "Agente SIC — Configuração" },
      { name: "description", content: "Configure o Agente SIC (Hermes-Nous Remote) via API segura no servidor." },
    ],
  }),
  component: HermesPage,
});

const MODES: HermesConnectionMode[] = ["remote_api", "local_bridge", "local_fallback"];

function HermesPage() {
  const [config, update, reset] = useHermesConfig();
  const [testing, setTesting] = useState(false);
  const [serverStatus, setServerStatus] = useState<{ configured: boolean; baseUrlHost: string | null; model: string } | null>(null);

  useEffect(() => {
    checkSicConfig().then(setServerStatus).catch(() => setServerStatus(null));
  }, []);

  const handleTest = async () => {
    setTesting(true);
    try {
      const r = await testHermesConnection();
      update({
        lastConnectionTest: `${new Date().toLocaleString()} — ${r.message}`,
        lastError: r.ok ? undefined : r.message,
      });
      (r.ok ? toast.success : toast.message)(r.message);
    } finally {
      setTesting(false);
    }
  };

  const modeNotice = (() => {
    if (!config.enabled) return "Agente desativado. O app usa organização local.";
    switch (config.connectionMode) {
      case "remote_api":
        return "Chamadas passam por uma server function segura. Token nunca vai ao navegador.";
      case "local_bridge":
        return "Modo avançado: o app chama uma bridge HTTP local (ex.: Hermes-Nous rodando no PC/Termux).";
      case "local_fallback":
        return "Sem chamada externa. Apenas o organizador local.";
    }
  })();

  return (
    <>
      <PageHeader eyebrow="Configurações" title="Agente SIC" />

      <main className="px-6 space-y-4 pb-32">
        <Link
          to="/perfil"
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground"
        >
          <ArrowLeft className="size-3.5" /> Voltar ao Perfil
        </Link>

        <section className="bg-card rounded-2xl ring-1 ring-black/5 p-5 space-y-5">
          {/* Status */}
          <div className="flex items-start gap-3">
            <span className="size-10 rounded-xl bg-secondary grid place-items-center shrink-0">
              {!config.enabled ? (
                <WifiOff className="size-5 text-muted-foreground" />
              ) : serverStatus?.configured ? (
                <CheckCircle2 className="size-5 text-foreground" />
              ) : (
                <BrainCog className="size-5 text-foreground" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                {!config.enabled
                  ? "Desativado"
                  : serverStatus?.configured
                    ? `Servidor configurado (${serverStatus.baseUrlHost ?? "API remota"})`
                    : "Servidor sem credenciais"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Token da API vive como secret no servidor. O navegador chama apenas a server function interna.
              </p>
              {serverStatus?.configured && (
                <p className="text-[11px] text-muted-foreground mt-1">Modelo: <code>{serverStatus.model}</code></p>
              )}
            </div>
          </div>

          {/* Segurança */}
          <div className="rounded-xl bg-secondary/60 ring-1 ring-black/5 p-3 flex items-start gap-2">
            <ShieldCheck className="size-4 mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Seguro por padrão.</strong> Credenciais da VPS (URL, token e modelo) são
              guardadas como secrets do Lovable Cloud e usadas apenas dentro de uma <code>createServerFn</code>. Elas
              nunca aparecem no bundle do navegador, nem em <code>localStorage</code>.
            </p>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !config.enabled}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-xl py-3 text-sm font-medium active:scale-[0.99] disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${testing ? "animate-spin" : ""}`} /> Testar conexão
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                toast.success("Preferências limpas");
              }}
              aria-label="Limpar preferências"
              className="size-11 rounded-xl bg-secondary grid place-items-center"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          {/* Enable */}
          <div className="rounded-xl bg-secondary/60 ring-1 ring-black/5 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Ativar Agente SIC</p>
              <p className="text-[11px] text-muted-foreground">Desativado = só organização local.</p>
            </div>
            <button
              type="button"
              onClick={() => update({ enabled: !config.enabled })}
              className={[
                "w-11 h-6 rounded-full relative transition-colors",
                config.enabled ? "bg-foreground" : "bg-border",
              ].join(" ")}
              aria-pressed={config.enabled}
            >
              <span
                className={[
                  "absolute top-0.5 size-5 rounded-full bg-background transition-all",
                  config.enabled ? "left-[22px]" : "left-0.5",
                ].join(" ")}
              />
            </button>
          </div>

          {/* Modo */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Modo de conexão</p>
            <p className="text-xs text-muted-foreground">{modeNotice}</p>
            <div className="grid gap-2">
              {MODES.map((m) => {
                const active = config.connectionMode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => update({ connectionMode: m })}
                    className={[
                      "text-left px-4 py-3 rounded-xl text-sm font-medium ring-1 transition-colors",
                      active
                        ? "bg-foreground text-background ring-foreground"
                        : "bg-secondary/60 text-foreground ring-black/5 hover:bg-secondary",
                    ].join(" ")}
                  >
                    {CONNECTION_MODE_LABEL[m]}
                  </button>
                );
              })}
            </div>

            {config.connectionMode === "local_bridge" && (
              <div className="space-y-1.5 pt-1">
                <input
                  type="url"
                  placeholder="http://127.0.0.1:8765"
                  value={config.bridgeUrl ?? ""}
                  onChange={(e) => update({ bridgeUrl: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary/60 ring-1 ring-black/5 text-sm outline-none focus:ring-foreground"
                />
                <p className="text-[11px] text-muted-foreground">
                  A bridge precisa expor <code>POST /organize</code> e <code>GET /health</code>.
                </p>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <input
                type="checkbox"
                checked={config.useLocalFallback}
                onChange={(e) => update({ useLocalFallback: e.target.checked })}
                className="size-4 rounded"
              />
              Usar fallback local se a conexão falhar
            </label>
          </div>

          {/* Credenciais do servidor */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
              Credenciais do servidor
            </p>
            <div className="rounded-xl bg-secondary/60 ring-1 ring-black/5 p-3 space-y-1 text-[11px]">
              <p>
                <strong className="text-foreground">SIC_API_BASE_URL</strong> — host da API (ex.: <code>https://api.deepseek.com</code>).
              </p>
              <p>
                <strong className="text-foreground">SIC_API_TOKEN</strong> — chave de acesso (Bearer).
              </p>
              <p>
                <strong className="text-foreground">SIC_API_MODEL</strong> — nome do modelo (ex.: <code>deepseek-v4-flash</code>).
              </p>
              <p className="text-muted-foreground pt-1">
                Gerencie esses valores em <em>Lovable Cloud → Secrets</em>. Para trocar, peça no chat: "atualizar SIC_API_TOKEN".
              </p>
            </div>
          </div>

          {/* Último teste */}
          {(config.lastConnectionTest || config.lastError) && (
            <div className="rounded-xl bg-secondary/60 ring-1 ring-black/5 p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Último teste</p>
              {config.lastConnectionTest && (
                <p className="text-[11px] text-foreground break-words">{config.lastConnectionTest}</p>
              )}
              {config.lastError && (
                <p className="text-[11px] text-destructive break-words">{config.lastError}</p>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
