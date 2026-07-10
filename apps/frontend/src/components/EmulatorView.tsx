import { useMemo } from "react";
import { LuCircleStop, LuPlay } from "react-icons/lu";
import type { Locale } from "../lib/i18n";
import { useI18n } from "../lib/i18n";

interface EmulatorViewProps {
  gameId: number;
  core: string;
  patchId?: number;
  saveId?: number;
  locale?: Locale;
  active: boolean;
  canPlay: boolean;
  onToggle: () => void;
}

export function EmulatorView({
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
  const lang = locale ?? currentLocale;

  const src = useMemo(() => {
    const params = new URLSearchParams({
      gameId: String(gameId),
      core,
      lang,
    });
    if (patchId) params.set("patchId", String(patchId));
    if (saveId) params.set("saveId", String(saveId));
    return `/emulator/player.html?${params}`;
  }, [gameId, core, patchId, saveId, lang]);

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
            allowFullScreen
          />
        </div>
      ) : (
        <div className="emulator-frame emulator-frame--idle" />
      )}
    </div>
  );
}
