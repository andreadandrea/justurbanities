/**
 * Partner translation kit — pure helpers shared by the export/import CLIs
 * (and unit-tested). CSV format: key,reference (EN),translation.
 */

export type LocaleTree = { [key: string]: string | LocaleTree };

export function flatten(tree: LocaleTree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

export function unflatten(entries: Map<string, string>): LocaleTree {
  const tree: LocaleTree = {};
  for (const [path, value] of entries) {
    const parts = path.split(".");
    let node = tree;
    for (const part of parts.slice(0, -1)) {
      const next = node[part];
      if (typeof next === "string") throw new Error(`key conflict at ${path}`);
      node = (node[part] ??= {}) as LocaleTree;
    }
    node[parts[parts.length - 1]] = value;
  }
  return tree;
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** CSV for one partner language: key, EN reference, current translation. */
export function toCsv(reference: LocaleTree, current: LocaleTree, localeCode: string): string {
  const ref = flatten(reference);
  const cur = flatten(current);
  const lines = [`key,en,${localeCode}`];
  for (const [key, en] of ref) {
    const translated = cur.get(key) ?? "";
    // untranslated stubs ship empty so partners see what is left to do
    lines.push([key, en, translated === en ? "" : translated].map(csvEscape).join(","));
  }
  return lines.join("\n") + "\n";
}

/** Minimal RFC-4180 parser (quotes, escaped quotes, newlines in fields). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export type ImportIssues = {
  missingKeys: string[];
  unknownKeys: string[];
  brokenPlaceholders: string[];
  lengthWarnings: string[];
};

const PLACEHOLDER = /\{[a-zA-Z]+\}/g;

/**
 * Turn a partner CSV back into a locale tree. Untranslated rows fall back
 * to the EN reference (the runtime EN fallback would kick in anyway, but a
 * complete file keeps the stub-parity test meaningful).
 */
export function importCsv(csvText: string, reference: LocaleTree): { tree: LocaleTree; issues: ImportIssues } {
  const ref = flatten(reference);
  const issues: ImportIssues = { missingKeys: [], unknownKeys: [], brokenPlaceholders: [], lengthWarnings: [] };
  const [header, ...rows] = parseCsv(csvText);
  if (!header || header[0] !== "key") throw new Error("CSV must start with a key,en,<locale> header");

  const translated = new Map<string, string>();
  for (const row of rows) {
    const [key, , value] = row;
    if (!ref.has(key)) {
      issues.unknownKeys.push(key);
      continue;
    }
    if (value && value.trim()) translated.set(key, value);
  }

  const out = new Map<string, string>();
  for (const [key, en] of ref) {
    const value = translated.get(key);
    if (value === undefined) {
      issues.missingKeys.push(key);
      out.set(key, en);
      continue;
    }
    const expected = [...en.matchAll(PLACEHOLDER)].map((m) => m[0]).sort();
    const actual = [...value.matchAll(PLACEHOLDER)].map((m) => m[0]).sort();
    if (expected.join("|") !== actual.join("|")) {
      issues.brokenPlaceholders.push(`${key}: expected ${expected.join(" ") || "(none)"}, got ${actual.join(" ") || "(none)"}`);
    }
    if (value.length > Math.max(en.length * 1.8, en.length + 24)) {
      issues.lengthWarnings.push(`${key}: ${value.length} chars vs ${en.length} in EN`);
    }
    out.set(key, value);
  }
  return { tree: unflatten(out), issues };
}
