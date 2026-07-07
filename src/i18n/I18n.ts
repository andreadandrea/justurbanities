/** Project languages: IT+EN complete; partner languages start as EN stubs. */
export const LOCALES = ["en", "it", "de", "hu", "pl", "sv", "ro"] as const;
export type LocaleCode = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<LocaleCode, string> = {
  en: "English",
  it: "Italiano",
  de: "Deutsch",
  hu: "Magyar",
  pl: "Polski",
  sv: "Svenska",
  ro: "Română"
};

const FALLBACK: LocaleCode = "en";

/**
 * Pick the best project locale from the browser's preference list
 * (navigator.languages): first exact/base-language match wins, EN when
 * nothing matches. Pure, so first-run auto-detection is testable.
 */
export function detectLocale(preferred: readonly string[]): LocaleCode {
  for (const candidate of preferred) {
    const base = candidate.toLowerCase().split("-")[0];
    const match = LOCALES.find((locale) => locale === base);
    if (match) return match;
  }
  return FALLBACK;
}

type LocaleTree = { [key: string]: string | LocaleTree };

function lookup(tree: LocaleTree | undefined, key: string): string | undefined {
  if (!tree) return undefined;
  let node: string | LocaleTree | undefined = tree;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Hierarchical-key localisation with EN fallback and live switching.
 * Missing keys resolve to the key itself (broken text stays visible) and
 * are collected for the debug panel report.
 */
export class I18n {
  private current: LocaleCode = FALLBACK;
  private readonly data = new Map<LocaleCode, LocaleTree>();
  private readonly missing = new Set<string>();
  private readonly listeners = new Set<() => void>();

  register(locale: LocaleCode, tree: LocaleTree): void {
    this.data.set(locale, tree);
  }

  get locale(): LocaleCode {
    return this.current;
  }

  setLocale(locale: LocaleCode): void {
    if (locale === this.current) return;
    this.current = locale;
    for (const listener of this.listeners) listener();
  }

  /** Re-render hook for UI components; returns an unsubscribe function. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  t(key: string): string {
    const local = lookup(this.data.get(this.current), key);
    if (local !== undefined) return local;
    this.missing.add(`${this.current}:${key}`);
    const fallback = lookup(this.data.get(FALLBACK), key);
    if (fallback !== undefined) return fallback;
    this.missing.add(`${FALLBACK}:${key}`);
    return key;
  }

  /** "locale:key" entries that fell through, for the debug report. */
  missingKeys(): string[] {
    return [...this.missing].sort();
  }
}
