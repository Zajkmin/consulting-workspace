export type ThemeOption = "claro" | "oscuro" | "sistema";

export const THEME_STORAGE_KEY = "consulting-theme";
export const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

export function parseThemePreference(value: string | null): ThemeOption {
  return value === "oscuro" || value === "sistema" ? value : "claro";
}

export function resolveTheme(preference: ThemeOption, systemDark: boolean): "light" | "dark" {
  return preference === "oscuro" || (preference === "sistema" && systemDark) ? "dark" : "light";
}

// El documento debe aplicar la preferencia antes de pintar la página o hidratar React.
export const themeBootstrap = `(() => {
  let preference;
  try { preference = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); } catch {}
  document.documentElement.dataset.theme = preference === "oscuro" ||
    (preference === "sistema" && matchMedia(${JSON.stringify(SYSTEM_THEME_QUERY)}).matches) ? "dark" : "light";
})();`;
