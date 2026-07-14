import { useEffect } from "react";
import { LuCircleAlert, LuCircleCheck, LuInfo, LuX } from "react-icons/lu";
import { useAlerts, type AlertLevel } from "../lib/alerts";
import { useI18n } from "../lib/i18n";

const AUTO_DISMISS_MS: Partial<Record<AlertLevel, number>> = {
  success: 4500,
  info: 4500,
  warning: 6000,
  // errors stay until closed
};

function AlertIcon({ level }: { level: AlertLevel }) {
  switch (level) {
    case "error":
    case "warning":
      return <LuCircleAlert aria-hidden />;
    case "success":
      return <LuCircleCheck aria-hidden />;
    default:
      return <LuInfo aria-hidden />;
  }
}

export function AlertToasts() {
  const { alerts, dismiss } = useAlerts();
  const { t } = useI18n();

  useEffect(() => {
    const timers = alerts
      .map((alert) => {
        const ms = AUTO_DISMISS_MS[alert.level];
        if (!ms) return null;
        return window.setTimeout(() => dismiss(alert.id), ms);
      })
      .filter((id): id is number => id != null);
    return () => timers.forEach(clearTimeout);
  }, [alerts, dismiss]);

  if (!alerts.length) return null;

  return (
    <div className="alert-stack" aria-live="polite" aria-relevant="additions">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`alert-toast alert-toast--${alert.level}`}
          role={alert.level === "error" ? "alert" : "status"}
        >
          <span className="alert-toast-icon">
            <AlertIcon level={alert.level} />
          </span>
          <p className="alert-toast-message">{alert.message}</p>
          <button
            type="button"
            className="alert-toast-close"
            aria-label={t("common.close")}
            onClick={() => dismiss(alert.id)}
          >
            <LuX aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
