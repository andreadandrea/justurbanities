/**
 * Import a partner CSV back into src/locales/<locale>.json, with validation.
 *
 *   npm run i18n:import -- de i18n-exchange/justurbanities_de.csv
 *
 * Reports missing keys, unknown keys, broken {placeholders} and length
 * warnings. Broken placeholders make the import fail (data would break
 * name/pronoun interpolation); everything else is a warning.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { importCsv, type LocaleTree } from "./i18n-kit";

const [locale, csvPath] = process.argv.slice(2);
if (!locale || !csvPath) {
  console.error("usage: npm run i18n:import -- <locale> <csv-file>");
  process.exit(1);
}

const ROOT = join(__dirname, "..");
const reference = JSON.parse(readFileSync(join(ROOT, "src/locales/en.json"), "utf8")) as LocaleTree;
const { tree, issues } = importCsv(readFileSync(csvPath, "utf8"), reference);

if (issues.unknownKeys.length) console.warn(`⚠ unknown keys (ignored): ${issues.unknownKeys.length}`);
if (issues.missingKeys.length) console.warn(`⚠ untranslated keys (EN fallback): ${issues.missingKeys.length}`);
for (const warning of issues.lengthWarnings) console.warn(`⚠ length: ${warning}`);
if (issues.brokenPlaceholders.length) {
  for (const broken of issues.brokenPlaceholders) console.error(`✗ placeholder: ${broken}`);
  console.error("import aborted: fix the placeholders above and retry.");
  process.exit(1);
}

const target = join(ROOT, `src/locales/${locale}.json`);
writeFileSync(target, JSON.stringify(tree, null, 2) + "\n");
console.log(`imported ${csvPath} -> ${target}`);
console.log(`translated: ${flattenCount(tree) - issues.missingKeys.length}/${flattenCount(tree)} keys`);

function flattenCount(node: LocaleTree): number {
  return Object.values(node).reduce<number>(
    (sum, value) => sum + (typeof value === "string" ? 1 : flattenCount(value)),
    0
  );
}
