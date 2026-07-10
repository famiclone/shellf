import { createPortal } from "react-dom";
import { useEffect } from "react";
import { LuMoon, LuSun, LuX } from "react-icons/lu";
import { useI18n, type Locale } from "../lib/i18n";
import { useTheme, type Theme } from "../lib/theme";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="settings-overlay" role="presentation" onClick={onClose}>
      <div
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-header">
          <h2 id="settings-title">{t("settings.title")}</h2>
          <button
            type="button"
            className="settings-close"
            aria-label={t("common.close")}
            onClick={onClose}
          >
            <LuX aria-hidden />
          </button>
        </header>

        <div className="settings-body">
          <section className="settings-section">
            <h3>{t("settings.language")}</h3>
            <p className="settings-hint">{t("settings.languageHint")}</p>
            <div className="theme-toggle" role="group" aria-label={t("settings.languageAria")}>
              {(["en", "uk"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`theme-toggle-btn ${locale === value ? "active" : ""}`}
                  aria-pressed={locale === value}
                  onClick={() => setLocale(value as Locale)}
                >
                  {value === "en" ? t("settings.langEn") : t("settings.langUk")}
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section">
            <h3>{t("settings.theme")}</h3>
            <p className="settings-hint">{t("settings.themeHint")}</p>
            <div className="theme-toggle" role="group" aria-label={t("settings.themeAria")}>
              {(["dark", "light"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`theme-toggle-btn with-icon ${theme === value ? "active" : ""}`}
                  aria-pressed={theme === value}
                  onClick={() => setTheme(value as Theme)}
                >
                  {value === "dark" ? <LuMoon aria-hidden /> : <LuSun aria-hidden />}
                  {value === "dark" ? t("settings.themeDark") : t("settings.themeLight")}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
