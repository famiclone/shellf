import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AlertLevel = "error" | "success" | "info" | "warning";

export interface AlertItem {
  id: string;
  level: AlertLevel;
  message: string;
  createdAt: number;
}

interface AlertContextValue {
  alerts: AlertItem[];
  notify: (message: string, level?: AlertLevel) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

let alertSeq = 0;

function nextId() {
  alertSeq += 1;
  return `alert-${Date.now()}-${alertSeq}`;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clear = useCallback(() => setAlerts([]), []);

  const notify = useCallback((message: string, level: AlertLevel = "info") => {
    const text = message.trim();
    if (!text) return "";
    let id = "";
    setAlerts((prev) => {
      const existing = prev.find((a) => a.message === text && a.level === level);
      if (existing) {
        id = existing.id;
        return prev;
      }
      id = nextId();
      return [...prev, { id, level, message: text, createdAt: Date.now() }];
    });
    return id;
  }, []);

  const value = useMemo(
    () => ({ alerts, notify, dismiss, clear }),
    [alerts, notify, dismiss, clear],
  );

  return (
    <AlertContext.Provider value={value}>{children}</AlertContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertProvider");
  return ctx;
}
