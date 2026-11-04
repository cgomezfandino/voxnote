import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import ConfigPanel from "@/components/ConfigPanel";
import ModelManager from "@/components/ModelManager";
import { useConfig } from "@/hooks/useConfig";
import type { AppConfig } from "@/types";

export const Route = createFileRoute("/settings")({
  ssr: false,
  component: SettingsPage,
});

const KEY_FIELDS: Record<string, keyof AppConfig> = {
  openai: "api_key_openai",
  anthropic: "api_key_anthropic",
  google: "api_key_google",
  zai: "api_key_zai",
  kimi: "api_key_kimi",
  ollama: "api_key_ollama",
};

function ReadyChecklist({ config }: { config: AppConfig }) {
  const isChrome = config.llm_provider === "chrome";
  const keyField = KEY_FIELDS[config.llm_provider];
  const hasKey = isChrome || (!!keyField && !!String(config[keyField]).trim());
  const items = [
    {
      ok: true,
      label: `Transcription model: ${config.whisper_model} (downloads once, then offline)`,
    },
    {
      ok: true,
      label: isChrome
        ? "Note AI: Chrome built-in AI on this device (no key needed)"
        : `Note AI provider: ${config.llm_provider}`,
    },
    {
      ok: hasKey,
      label: isChrome
        ? "No API key needed"
        : hasKey
          ? "API key saved in this browser"
          : "Add your API key below so notes can be created",
    },
  ];
  return (
    <div className="card">
      <h3 className="text-base font-semibold mb-3">Before you start</h3>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2.5 text-sm">
            {item.ok ? (
              <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-danger shrink-0" />
            )}
            <span className={item.ok ? "text-foreground" : "font-medium text-foreground"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsPage() {
  const { config, updateField, isSyncing } = useConfig();
  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="text-center">
        <h2 className="text-xl lg:text-2xl font-semibold text-foreground mb-2">Settings</h2>
        <p className="text-muted-foreground">
          Settings and API keys stay in this browser. Transcription is always local.
        </p>
      </div>
      <ReadyChecklist config={config} />
      <div className="card">
        <ConfigPanel config={config} onUpdate={updateField} isSyncing={isSyncing} />
      </div>
      <ModelManager />
    </div>
  );
}
