import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../src/locales/en.json";
import itLocale from "../../src/locales/it.json";
import dialoguesData from "../../src/data/dialogues.json";
import questsData from "../../src/data/quests.json";
import crisesData from "../../src/data/crises.json";
import prologueData from "../../src/data/prologue.json";
import playableData from "../../src/data/playable.json";

const KEY = /^content\.[a-zA-Z0-9_.]+$/;

function lookup(tree: object, key: string): unknown {
  let node: unknown = tree;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function collectDataKeys(): string[] {
  const keys: string[] = [];
  for (const dialogue of dialoguesData.dialogues) {
    for (const node of Object.values(dialogue.nodes) as Array<{ text: string; choices?: Array<{ label: string }> }>) {
      keys.push(node.text);
      for (const choice of node.choices ?? []) keys.push(choice.label);
    }
  }
  for (const quest of questsData.quests) {
    keys.push(quest.title, quest.description);
    for (const objective of quest.objectives) keys.push(objective.description);
  }
  for (const crisis of crisesData.crises) keys.push(crisis.title);
  for (const panel of prologueData.panels) {
    if ("title" in panel && panel.title) keys.push(panel.title as string);
    keys.push(panel.text);
  }
  for (const character of playableData.playable) keys.push(character.tagline);
  return keys;
}

describe("i18n extraction guard (task 3.2)", () => {
  it("every user-facing text field in the data files is an i18n key", () => {
    for (const value of collectDataKeys()) {
      expect(value, `hardcoded text leaked into data: "${value.slice(0, 60)}"`).toMatch(KEY);
    }
  });

  it("every data key resolves in EN and IT (both 100%)", () => {
    for (const key of collectDataKeys()) {
      expect(typeof lookup(en, key), `missing in en: ${key}`).toBe("string");
      expect(typeof lookup(itLocale, key), `missing in it: ${key}`).toBe("string");
    }
  });

  it("UI sources contain no hardcoded user-facing string literals", () => {
    // DebugPanel is a developer tool and stays English by design.
    const EXEMPT_FILES = new Set(["DebugPanel.ts"]);
    // Brand name, emoji-only labels and pure punctuation are not translatable copy.
    const ALLOWED = [/^Justurbanities$/, /^[^a-zA-Z]*$/];
    const uiDir = join(__dirname, "../../src/ui");
    const offenders: string[] = [];
    for (const file of readdirSync(uiDir)) {
      if (!file.endsWith(".ts") || EXEMPT_FILES.has(file)) continue;
      const source = readFileSync(join(uiDir, file), "utf8");
      for (const match of source.matchAll(/\.(?:textContent|title|placeholder)\s*=\s*"([^"]*)"/g)) {
        const literal = match[1];
        if (ALLOWED.some((pattern) => pattern.test(literal))) continue;
        offenders.push(`${file}: "${literal}"`);
      }
    }
    expect(offenders, `hardcoded UI strings:\n${offenders.join("\n")}`).toEqual([]);
  });
});
