import { describe, expect, it } from "vitest";
import { I18n, LOCALES } from "../../src/i18n/I18n";
import en from "../../src/locales/en.json";
import it_ from "../../src/locales/it.json";
import de from "../../src/locales/de.json";
import hu from "../../src/locales/hu.json";
import pl from "../../src/locales/pl.json";
import sv from "../../src/locales/sv.json";
import ro from "../../src/locales/ro.json";

const ALL = { en, it: it_, de, hu, pl, sv, ro } as const;

function flatKeys(tree: object, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : flatKeys(value as object, `${prefix}${key}.`)
  );
}

function engine(): I18n {
  const i18n = new I18n();
  for (const locale of LOCALES) i18n.register(locale, ALL[locale]);
  return i18n;
}

describe("I18n engine", () => {
  it("resolves hierarchical keys in the current locale", () => {
    const i18n = engine();
    expect(i18n.t("ui.time.morning")).toBe("Morning");
    i18n.setLocale("it");
    expect(i18n.t("ui.time.morning")).toBe("Mattina");
  });

  it("falls back to EN and reports the missing key", () => {
    const i18n = new I18n();
    i18n.register("en", { ui: { only: "English only" } });
    i18n.register("it", {});
    i18n.setLocale("it");
    expect(i18n.t("ui.only")).toBe("English only");
    expect(i18n.missingKeys()).toContain("it:ui.only");
  });

  it("returns the key itself when even EN misses it (broken data stays visible)", () => {
    const i18n = engine();
    expect(i18n.t("ui.does.not.exist")).toBe("ui.does.not.exist");
    expect(i18n.missingKeys()).toContain("en:ui.does.not.exist");
  });

  it("notifies listeners on live switch and supports unsubscribe", () => {
    const i18n = engine();
    let calls = 0;
    const off = i18n.onChange(() => calls++);
    i18n.setLocale("it");
    i18n.setLocale("it"); // no-op, no extra call
    expect(calls).toBe(1);
    off();
    i18n.setLocale("en");
    expect(calls).toBe(1);
  });
});

describe("locale files", () => {
  it("all 7 project languages ship a locale file", () => {
    expect(Object.keys(ALL).sort()).toEqual([...LOCALES].sort());
  });

  it("every locale has exactly the EN key set (stubs stay in sync)", () => {
    const reference = flatKeys(en).sort();
    for (const [locale, tree] of Object.entries(ALL)) {
      expect(flatKeys(tree).sort(), `locale ${locale} diverges from en`).toEqual(reference);
    }
  });

  it("IT is genuinely translated (not an EN stub)", () => {
    expect(it_.ui.time.morning).not.toBe(en.ui.time.morning);
    expect(it_.ui.resources.trust).not.toBe(en.ui.resources.trust);
  });
});
