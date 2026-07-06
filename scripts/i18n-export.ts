/**
 * Export partner translation CSVs: one file per language (or a single
 * locale passed as argument) into i18n-exchange/.
 *
 *   npm run i18n:export           # all partner languages
 *   npm run i18n:export -- de     # one language
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toCsv, type LocaleTree } from "./i18n-kit";

const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "i18n-exchange");
const PARTNER_LOCALES = ["de", "hu", "pl", "sv", "ro"];

const requested = process.argv[2] ? [process.argv[2]] : PARTNER_LOCALES;
const reference = JSON.parse(readFileSync(join(ROOT, "src/locales/en.json"), "utf8")) as LocaleTree;

mkdirSync(OUT, { recursive: true });
for (const locale of requested) {
  const current = JSON.parse(readFileSync(join(ROOT, `src/locales/${locale}.json`), "utf8")) as LocaleTree;
  const file = join(OUT, `justurbanities_${locale}.csv`);
  writeFileSync(file, toCsv(reference, current, locale));
  console.log(`exported ${file}`);
}
