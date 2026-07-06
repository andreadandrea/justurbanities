import { describe, expect, it } from "vitest";
import { flatten, unflatten, toCsv, parseCsv, importCsv } from "../../scripts/i18n-kit";
import en from "../../src/locales/en.json";

describe("translation kit round-trip", () => {
  it("flatten/unflatten are inverse", () => {
    const flat = flatten(en);
    expect(unflatten(flat)).toEqual(en);
  });

  it("export -> translate -> import round-trips the full EN catalogue", () => {
    // Simulate a partner translating EVERY key (here: uppercasing).
    const csv = toCsv(en, en, "xx");
    const rows = parseCsv(csv);
    const translatedCsv = [
      rows[0].join(","),
      ...rows.slice(1).map(([key, ref]) => {
        const value = `XX:${ref}`;
        const quote = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);
        return [key, ref, value].map(quote).join(",");
      })
    ].join("\n");

    const { tree, issues } = importCsv(translatedCsv, en);
    expect(issues.missingKeys).toEqual([]);
    expect(issues.unknownKeys).toEqual([]);
    // the fake translation preserves {tokens}, so nothing should break
    expect(issues.brokenPlaceholders).toEqual([]);
    // every leaf came back prefixed — a faithful full round-trip
    for (const [key, value] of flatten(tree)) {
      expect(value, key).toBe(`XX:${flatten(en).get(key)}`);
    }
  });

  it("CSV survives commas, quotes and newlines in texts", () => {
    const tricky = { a: { b: 'He said "hi", then\nleft.' } };
    const csv = toCsv(tricky, tricky, "xx");
    const rows = parseCsv(csv);
    expect(rows[1][1]).toBe('He said "hi", then\nleft.');
  });

  it("untranslated rows fall back to EN and are reported", () => {
    const reference = { greeting: "Hello {playerName}", bye: "Bye" };
    const csv = 'key,en,de\ngreeting,Hello {playerName},Hallo {playerName}\nbye,Bye,\n';
    const { tree, issues } = importCsv(csv, reference);
    expect(tree).toEqual({ greeting: "Hallo {playerName}", bye: "Bye" });
    expect(issues.missingKeys).toEqual(["bye"]);
    expect(issues.brokenPlaceholders).toEqual([]);
  });

  it("broken placeholders are detected", () => {
    const reference = { greeting: "Hello {playerName}" };
    const csv = "key,en,de\ngreeting,Hello {playerName},Hallo {playername}\n";
    const { issues } = importCsv(csv, reference);
    expect(issues.brokenPlaceholders).toHaveLength(1);
  });

  it("suspiciously long translations produce a warning", () => {
    const reference = { short: "Hi" };
    const csv = `key,en,de\nshort,Hi,${"x".repeat(60)}\n`;
    const { issues } = importCsv(csv, reference);
    expect(issues.lengthWarnings).toHaveLength(1);
  });

  it("unknown keys are ignored and reported", () => {
    const reference = { real: "Real" };
    const csv = "key,en,de\nreal,Real,Echt\nghost,Boo,Buh\n";
    const { tree, issues } = importCsv(csv, reference);
    expect(tree).toEqual({ real: "Echt" });
    expect(issues.unknownKeys).toEqual(["ghost"]);
  });
});
