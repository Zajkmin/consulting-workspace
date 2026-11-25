import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { parseThemePreference, resolveTheme, themeBootstrap, THEME_STORAGE_KEY } from "./theme.ts";

test("cada documento nuevo restaura el tema guardado antes de hidratar", () => {
  for (const route of ["/perfil", "/", "/agenda", "/proyectos/demo"]) {
    const dataset = { theme: "" };
    runInNewContext(themeBootstrap, {
      document: { documentElement: { dataset } },
      localStorage: { getItem(key: string) { assert.equal(key, THEME_STORAGE_KEY); return "oscuro"; } },
      matchMedia: () => ({ matches: false }),
    });
    assert.equal(dataset.theme, "dark", route);
  }
});

test("el bootstrap y el selector interpretan las mismas preferencias", () => {
  for (const saved of ["claro", "oscuro", "sistema", "inválido", null]) {
    for (const systemDark of [true, false]) {
      const dataset = { theme: "" };
      runInNewContext(themeBootstrap, {
        document: { documentElement: { dataset } },
        localStorage: { getItem: () => saved },
        matchMedia: () => ({ matches: systemDark }),
      });
      assert.equal(dataset.theme, resolveTheme(parseThemePreference(saved), systemDark));
    }
  }
});

test("sin acceso a localStorage se sigue renderizando el tema por defecto", () => {
  const dataset = { theme: "" };
  runInNewContext(themeBootstrap, {
    document: { documentElement: { dataset } },
    localStorage: { getItem() { throw new Error("Bloqueado"); } },
    matchMedia: () => ({ matches: true }),
  });
  assert.equal(dataset.theme, "light");
});
