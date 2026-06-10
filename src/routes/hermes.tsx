import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import {
  ArrowLeft,
  BrainCog,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  Terminal,
  Trash2,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useHermesConfig } from "@/lib/hermes/hermes-config";
import {
  CONNECTION_MODE_LABEL,
  INSTALL_STATUS_LABEL,
  type HermesConnectionMode,
} from "@/lib/hermes/hermes-status";
import {
  HERMES_DOCS_URL,
  HERMES_DOCTOR,
  HERMES_MANUAL_INSTALL,
  HERMES_MODEL_SETUP,
  HERMES_QUICK_INSTALL,
  HERMES_RUN,
  HERMES_VERIFY,
} from "@/lib/hermes/hermes-termux-guide";
import { testHermesConnection } from "@/lib/hermes/hermes-adapter";

export const Route = createFileRoute("/hermes")({
  head: () => ({
    meta: [
      { title: "Hermes Agent — Configuração" },
      { name: "description", content: "Configure o Hermes Agent real (Nous Research) rodando no Termux." },
    ],
  }),
  component: HermesPage,
});

function CopyBlock({ label, code }: { label: string; code: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };
  return (
    <div className="bg-secondary/60 rounded-xl ring-1 ring-black/5 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground hover:opacity-70"
        >
          <Copy className="size-3.5" /> Copiar
        </button>
      </div>
      <pre className="text-[11px] leading-relaxed px-3 py-3 overflow-x-auto whitespace-pre font-mono text-foreground">
        {code}
      </pre>
    </div>
  );
}

const MODES: HermesConnectionMode[] = ["local_fallback", "manual_termux", "local_bridge", "remote_api"];

function HermesPage() {
  const [config, update, reset] = useHermesConfig();
  const [testing, setTesting] = useState(false);
  const [doctor, setDoctor] = useState(config.lastDoctorOutput ?? "");

  const handleTest = async () => {
    setTesting(true);
    try {
      const r = await testHermesConnection();
      update({
        lastConnectionTest: `${new Date().toISOString()} — ${r.message}`,
        installStatus: r.ok ? "connected" : config.installStatus,
        lastError: r.ok ? undefined : r.message,
      });
      (r.ok ? toast.success : toast.message)(r.message);
    } finally {
      setTesting(false);
    }
  };

  const modeNotice = (() => {
    if (!config.enabled) return "Hermes Agent desativado. Usando organização local.";
    switch (config.connectionMode) {
      case "local_fallback":
        return "Fallback local (Hermes real não conectado).";
      case "manual_termux":
        return "Hermes instalado manualmente no Termux. Sem bridge automática com o app.";
      case "local_bridge":
        return "Modo bridge local. Configure a URL da ponte HTTP rodando no Termux.";
      case "remote_api":
        return "Modo API remota. Configure a URL de uma API intermediária.";
    }
  })();

  return (
    <>
      <PageHeader eyebrow="Configurações" title="Hermes Agent" />

      <main className="px-6 space-y-4 pb-32">
        <Link
          to="/perfil"
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground"
        >
          <ArrowLeft className="size-3.5" /> Voltar ao Perfil
        </Link>

        {/* Card raiz Hermes — toda a estrutura vive aqui dentro */}
        <section className="bg-card rounded-2xl ring-1 ring-black/5 p-5 space-y-5">
          {/* Status */}
          <div className="flex items-start gap-3">
            <span className="size-10 rounded-xl bg-secondary grid place-items-center shrink-0">
              {config.installStatus === "connected" ? (
                <CheckCircle2 className="size-5 text-foreground" />
              ) : config.installStatus === "not_installed" ? (
                <WifiOff className="size-5 text-muted-foreground" />
              ) : (
                <BrainCog className="size-5 text-foreground" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{INSTALL_STATUS_LABEL[config.installStatus]}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hermes Agent real (Nous Research) roda como CLI no Termux. Este app guia a instalação e prepara a bridge.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-xl py-3 text-sm font-medium active:scale-[0.99] disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${testing ? "animate-spin" : ""}`} /> Testar conexão
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                setDoctor("");
                toast.success("Configuração do Hermes limpa");
              }}
              aria-label="Limpar configuração"
              className="size-11 rounded-xl bg-secondary grid place-items-center"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          <a
            href={HERMES_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <ExternalLink className="size-3.5" /> Documentação oficial do Hermes Agent no Termux
          </a>

          {/* Enable */}
          <div className="rounded-xl bg-secondary/60 ring-1 ring-black/5 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Ativar Hermes Agent</p>
              <p className="text-[11px] text-muted-foreground">
                Quando desativado, o app usa apenas organização local.
              </p>
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

          {/* Modo de conexão */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
              Modo de conexão atual
            </p>
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
              <input
                type="url"
                placeholder="http://127.0.0.1:8765"
                value={config.bridgeUrl ?? ""}
                onChange={(e) => update({ bridgeUrl: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-secondary/60 ring-1 ring-black/5 text-sm outline-none focus:ring-foreground"
              />
            )}
            {config.connectionMode === "remote_api" && (
              <input
                type="url"
                placeholder="https://minha-api.com/hermes"
                value={config.remoteApiUrl ?? ""}
                onChange={(e) => update({ remoteApiUrl: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-secondary/60 ring-1 ring-black/5 text-sm outline-none focus:ring-foreground"
              />
            )}

            <label className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <input
                type="checkbox"
                checked={config.useLocalFallback}
                onChange={(e) => update({ useLocalFallback: e.target.checked })}
                className="size-4 rounded"
              />
              Usar fallback local se a conexão real falhar
            </label>
          </div>

          {/* Instalação no Termux */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Terminal className="size-4" />
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                Instalação no Termux
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Já instalou o Hermes Agent no Termux? Marque abaixo e configure a conexão.
            </p>
            <button
              type="button"
              onClick={() =>
                update({
                  installStatus: "installed_in_termux",
                  connectionMode:
                    config.connectionMode === "local_fallback" ? "manual_termux" : config.connectionMode,
                })
              }
              className="w-full bg-foreground text-background rounded-xl py-3 text-sm font-medium"
            >
              Já instalei no Termux
            </button>

            <CopyBlock label="Instalação rápida" code={HERMES_QUICK_INSTALL} />
            <CopyBlock label="Instalação manual / debug" code={HERMES_MANUAL_INSTALL} />
            <CopyBlock label="Verificação" code={HERMES_VERIFY} />
            <CopyBlock label="Doctor" code={HERMES_DOCTOR} />
            <CopyBlock label="Executar Hermes" code={HERMES_RUN} />
            <CopyBlock label="Configurar modelo / provedor" code={HERMES_MODEL_SETUP} />
          </div>

          {/* Modelo */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
              Modelo configurado
            </p>
            <input
              type="text"
              placeholder="ex.: gpt-5, claude-3-7-sonnet, gemini-2.5-pro"
              value={config.modelName ?? ""}
              onChange={(e) => update({ modelName: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary/60 ring-1 ring-black/5 text-sm outline-none focus:ring-foreground"
            />
            <p className="text-[11px] text-muted-foreground">
              Apenas referência. O modelo real é definido dentro do Hermes via <code>hermes model</code>.
            </p>
          </div>

          {/* Diagnóstico */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
              Diagnóstico Hermes
            </p>
            <p className="text-xs text-muted-foreground">
              Cole aqui o resultado de <code>hermes doctor</code> para registrar o estado da instalação.
            </p>
            <textarea
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              placeholder="Cole a saída do hermes doctor…"
              rows={6}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary/60 ring-1 ring-black/5 text-xs font-mono outline-none focus:ring-foreground"
            />
            <button
              type="button"
              onClick={() => {
                update({ lastDoctorOutput: doctor });
                toast.success("Diagnóstico salvo");
              }}
              className="w-full bg-secondary text-foreground rounded-xl py-2.5 text-sm font-medium ring-1 ring-black/5"
            >
              Salvar diagnóstico
            </button>
          </div>

          {/* Último teste */}
          {(config.lastConnectionTest || config.lastError) && (
            <div className="rounded-xl bg-secondary/60 ring-1 ring-black/5 p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                Último teste
              </p>
              {config.lastConnectionTest && (
                <p className="text-[11px] text-foreground break-words">{config.lastConnectionTest}</p>
              )}
              {config.lastError && (
                <p className="text-[11px] text-destructive break-words">{config.lastError}</p>
              )}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground text-center pt-2">
            Sem bridge configurada, o app é honesto: continua usando o fallback local.
          </p>
        </section>
      </main>
    </>
  );
}
