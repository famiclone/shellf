import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import {
  LocaleProvider,
  applyLocale,
  getStoredLocale,
} from "./lib/i18n";
import { ThemeProvider, applyTheme, getStoredTheme } from "./lib/theme";
import "./index.css";

applyTheme(getStoredTheme());
applyLocale(getStoredLocale());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocaleProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </LocaleProvider>
  </StrictMode>,
);
