import { useEffect, useMemo } from "react";
import { LuCircleStop, LuPlay } from "react-icons/lu";
import { useAlerts } from "../lib/alerts";
import type { Locale } from "../lib/i18n";
import { useI18n } from "../lib/i18n";

interface EmulatorViewProps {
  itemId?: number;
  /** @deprecated Use itemId */
  gameId?: number;
  core: string;
  patchId?: number;
  saveId?: number;
  locale?: Locale;
  active: boolean;
  canPlay: boolean;
  onToggle: () => void;
}

const EMULATOR_ALERT = "shellf:emulator-alert";

export function EmulatorView({
  itemId,
  gameId,
  core,
  patchId,
  saveId,
  locale,
  active,
  canPlay,
  onToggle,
}: EmulatorViewProps) {
  const { t, locale: currentLocale } = useI18n();
  const { notify } = useAlerts();
  const lang = locale ?? currentLocale;
  const resolvedItemId = itemId ?? gameId!;

  const src = useMemo(() => {
    const params = new URLSearchParams({
      itemId: String(resolvedItemId),
      core,
      lang,
    });
    if (patchId) params.set("patchId", String(patchId));
    if (saveId) params.set("saveId", String(saveId));
    return `/emulator/player.html?${params}`;
  }, [resolvedItemId, core, patchId, saveId, lang]);

  useEffect(() => {
    if (!active) return;

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== EMULATOR_ALERT) return;
      const message = typeof data.message === "string" ? data.message.trim() : "";
      if (!message) return;
      const level =
        data.level === "warning" ||
        data.level === "success" ||
        data.level === "info"
          ? data.level
          : "error";
      notify(message, level);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [active, notify]);

  return (
    <div className="card">
      <div className="section-card-header">
        <h3>{t("game.emulator")}</h3>
        {canPlay && (
          <button className="btn-primary with-icon" onClick={onToggle}>
            {active ? <LuCircleStop aria-hidden /> : <LuPlay aria-hidden />}
            {active ? t("game.hideEmulator") : t("game.play")}
          </button>
        )}
      </div>
      {active && canPlay ? (
        <div className="emulator-frame">
          <iframe
            key={src}
            src={src}
            title={t("game.emulator")}
            allow="autoplay; gamepad; fullscreen; clipboard-read; clipboard-write"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="emulator-frame emulator-frame--idle" />
      )}
    </div>
  );
}
