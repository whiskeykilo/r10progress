import { useCallback, useEffect, useMemo, useState } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

/** Dispatched when theme changes in this tab (storage events don't fire locally). */
export const THEME_CHANGE_EVENT = "r10-theme-change";

function getSystemDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  return stored ?? "system";
}

function applyTheme(theme: Theme) {
  const isDark = theme === "dark" || (theme === "system" && getSystemDark());
  document.documentElement.classList.toggle("dark", isDark);
}

export function useDarkMode() {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());
  /** Bumps when OS theme changes while preference is `system`, so `resolvedTheme` recalculates. */
  const [systemPreferenceEpoch, setSystemPreferenceEpoch] = useState(0);

  const resolvedTheme = useMemo((): "light" | "dark" => {
    void systemPreferenceEpoch; // re-resolve when OS theme changes while in `system` mode
    if (theme !== "system") return theme;
    return getSystemDark() ? "dark" : "light";
  }, [theme, systemPreferenceEpoch]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Sync all hook instances + external writes (other tabs)
  useEffect(() => {
    const syncFromStorage = () => {
      const next = readStoredTheme();
      setThemeState((prev) => (prev === next ? prev : next));
    };

    const onCustom = () => syncFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) syncFromStorage();
    };

    window.addEventListener(THEME_CHANGE_EVENT, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Keep DOM + resolvedTheme in sync when system preference changes
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      applyTheme("system");
      setSystemPreferenceEpoch((n) => n + 1);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
    applyTheme(next);
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
  }, []);

  return { theme, setTheme, resolvedTheme };
}
