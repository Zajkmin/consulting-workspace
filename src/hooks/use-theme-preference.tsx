"use client";

import { useEffect, useSyncExternalStore } from "react";
import { parseThemePreference, resolveTheme, SYSTEM_THEME_QUERY, THEME_STORAGE_KEY, type ThemeOption } from "@/lib/theme";

const themeChanged = "consulting-theme-changed";
let sessionPreference: ThemeOption | undefined;

function readThemePreference(): ThemeOption {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return sessionPreference ?? "claro";
  }
}

function subscribe(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) notify();
  };
  window.addEventListener(themeChanged, notify);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(themeChanged, notify);
    window.removeEventListener("storage", onStorage);
  };
}

function applyTheme(preference: ThemeOption) {
  document.documentElement.dataset.theme = resolveTheme(preference, matchMedia(SYSTEM_THEME_QUERY).matches);
}

export function setThemePreference(preference: ThemeOption) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    sessionPreference = preference;
  }
  applyTheme(preference);
  window.dispatchEvent(new Event(themeChanged));
}

export function useThemePreference(): ThemeOption {
  return useSyncExternalStore(subscribe, readThemePreference, () => "claro");
}

export function ThemeController() {
  useEffect(() => {
    const media = matchMedia(SYSTEM_THEME_QUERY);
    const refresh = () => applyTheme(readThemePreference());
    const unsubscribe = subscribe(refresh);
    media.addEventListener("change", refresh);
    refresh();
    return () => {
      unsubscribe();
      media.removeEventListener("change", refresh);
    };
  }, []);

  return null;
}
