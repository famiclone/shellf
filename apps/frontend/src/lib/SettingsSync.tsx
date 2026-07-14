import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "./api";
import { useI18n, type Locale } from "./i18n";
import { useTheme, type Theme } from "./theme";

/** Loads settings from the API and syncs theme/locale (DB is source of truth). */
export function SettingsSync() {
  const { setTheme } = useTheme();
  const { setLocale } = useI18n();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!data) return;
    setTheme(data.theme as Theme);
    setLocale(data.locale as Locale);
  }, [data, setTheme, setLocale]);

  return null;
}
