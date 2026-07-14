import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useEffect, useState, type FormEvent } from "react";
import {
  LuGamepad2,
  LuMoon,
  LuScanSearch,
  LuSettings2,
  LuSun,
  LuX,
} from "react-icons/lu";
import { api } from "../lib/api";
import { useI18n, type Locale, type MessageKey } from "../lib/i18n";
import { useTheme, type Theme } from "../lib/theme";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

type SettingsSection = "general" | "scraper" | "emulator";

const SECTIONS: Array<{
  id: SettingsSection;
  labelKey: MessageKey;
  icon: typeof LuSettings2;
}> = [
  { id: "general", labelKey: "settings.section.general", icon: LuSettings2 },
  { id: "scraper", labelKey: "settings.section.scraper", icon: LuScanSearch },
  { id: "emulator", labelKey: "settings.section.emulator", icon: LuGamepad2 },
];

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const [section, setSection] = useState<SettingsSection>("general");

  const [softname, setSoftname] = useState("shellf");
  const [devId, setDevId] = useState("");
  const [devPassword, setDevPassword] = useState("");
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [emulatorJson, setEmulatorJson] = useState("{}");
  const [emulatorError, setEmulatorError] = useState<string | null>(null);
  const [scraperError, setScraperError] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
      setTheme(data.theme as Theme);
      setLocale(data.locale as Locale);
      setSoftname(data.screenscraper.softname);
      setDevId(data.screenscraper.devId);
      setPasswordConfigured(data.screenscraper.configured);
      setDevPassword("");
      setEmulatorJson(JSON.stringify(data.emulator ?? {}, null, 2));
      setEmulatorError(null);
      setScraperError(null);
    },
  });

  useEffect(() => {
    if (!settings) return;
    setSoftname(settings.screenscraper.softname);
    setDevId(settings.screenscraper.devId);
    setPasswordConfigured(settings.screenscraper.configured);
    setDevPassword("");
    setEmulatorJson(JSON.stringify(settings.emulator ?? {}, null, 2));
  }, [settings]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setSection("general");
  }, [open]);

  function saveGeneral(patch: { theme?: Theme; locale?: Locale }) {
    if (patch.theme) setTheme(patch.theme);
    if (patch.locale) setLocale(patch.locale);
    saveMutation.mutate(patch);
  }

  function saveScraper(event: FormEvent) {
    event.preventDefault();
    setScraperError(null);
    saveMutation.mutate(
      {
        screenscraper: {
          softname: softname.trim() || "shellf",
          devId: devId.trim(),
          ...(devPassword ? { devPassword } : {}),
        },
      },
      {
        onError: (err) => {
          setScraperError(err instanceof Error ? err.message : t("common.requestError"));
        },
      },
    );
  }

  function saveEmulator(event: FormEvent) {
    event.preventDefault();
    setEmulatorError(null);
    try {
      const parsed = JSON.parse(emulatorJson) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setEmulatorError(t("settings.emulatorInvalidJson"));
        return;
      }
      saveMutation.mutate(
        { emulator: parsed as Record<string, unknown> },
        {
          onError: (err) => {
            setEmulatorError(
              err instanceof Error ? err.message : t("common.requestError"),
            );
          },
        },
      );
    } catch {
      setEmulatorError(t("settings.emulatorInvalidJson"));
    }
  }

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

        <div className="settings-layout">
          <nav className="settings-nav" aria-label={t("settings.title")}>
            {SECTIONS.map(({ id, labelKey, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`settings-nav-item with-icon ${section === id ? "active" : ""}`}
                aria-current={section === id ? "page" : undefined}
                onClick={() => setSection(id)}
              >
                <Icon aria-hidden />
                {t(labelKey)}
              </button>
            ))}
          </nav>

          <div className="settings-body">
            {isLoading && !settings ? (
              <p className="settings-hint">{t("common.loading")}</p>
            ) : null}

            {section === "general" && (
              <>
                <section className="settings-section">
                  <h3>{t("settings.language")}</h3>
                  <p className="settings-hint">{t("settings.languageHint")}</p>
                  <div
                    className="theme-toggle"
                    role="group"
                    aria-label={t("settings.languageAria")}
                  >
                    {(["en", "uk"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`theme-toggle-btn ${locale === value ? "active" : ""}`}
                        aria-pressed={locale === value}
                        disabled={saveMutation.isPending}
                        onClick={() => saveGeneral({ locale: value })}
                      >
                        {value === "en" ? t("settings.langEn") : t("settings.langUk")}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="settings-section">
                  <h3>{t("settings.theme")}</h3>
                  <p className="settings-hint">{t("settings.themeHint")}</p>
                  <div
                    className="theme-toggle"
                    role="group"
                    aria-label={t("settings.themeAria")}
                  >
                    {(["dark", "light"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`theme-toggle-btn with-icon ${theme === value ? "active" : ""}`}
                        aria-pressed={theme === value}
                        disabled={saveMutation.isPending}
                        onClick={() => saveGeneral({ theme: value })}
                      >
                        {value === "dark" ? <LuMoon aria-hidden /> : <LuSun aria-hidden />}
                        {value === "dark"
                          ? t("settings.themeDark")
                          : t("settings.themeLight")}
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            {section === "scraper" && (
              <section className="settings-section settings-section-wide">
                <h3>{t("settings.section.scraper")}</h3>
                <p className="settings-hint">{t("settings.scraperHint")}</p>
                <form className="settings-form" onSubmit={saveScraper}>
                  <label className="settings-field">
                    <span>{t("settings.scraperSoftname")}</span>
                    <input
                      type="text"
                      value={softname}
                      onChange={(e) => setSoftname(e.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  <label className="settings-field">
                    <span>{t("settings.scraperDevId")}</span>
                    <input
                      type="text"
                      value={devId}
                      onChange={(e) => setDevId(e.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  <label className="settings-field">
                    <span>{t("settings.scraperDevPassword")}</span>
                    <input
                      type="password"
                      value={devPassword}
                      onChange={(e) => setDevPassword(e.target.value)}
                      placeholder={
                        passwordConfigured
                          ? t("settings.scraperPasswordConfigured")
                          : undefined
                      }
                      autoComplete="new-password"
                    />
                  </label>
                  {scraperError && <p className="error">{scraperError}</p>}
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? t("common.saving") : t("common.save")}
                  </button>
                </form>
              </section>
            )}

            {section === "emulator" && (
              <section className="settings-section settings-section-wide">
                <h3>{t("settings.section.emulator")}</h3>
                <p className="settings-hint">{t("settings.emulatorHint")}</p>
                <form className="settings-form" onSubmit={saveEmulator}>
                  <label className="settings-field">
                    <span>{t("settings.emulatorJson")}</span>
                    <textarea
                      className="settings-json"
                      value={emulatorJson}
                      onChange={(e) => setEmulatorJson(e.target.value)}
                      spellCheck={false}
                      rows={16}
                    />
                  </label>
                  {emulatorError && <p className="error">{emulatorError}</p>}
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? t("common.saving") : t("common.save")}
                  </button>
                </form>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
