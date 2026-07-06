/**
 * Per-variant asset completeness report (SPEC_Dual_Art_Style §2):
 * which declared character assets are missing on disk, per variant.
 *
 *   npm run assets:report
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { variantCompletenessReport } from "../src/assets/ArtStyle";

const ROOT = join(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");

function walk(dir: string, out: Set<string>): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.add(relative(PUBLIC_DIR, full).replaceAll("\\", "/"));
  }
}

const manifest = JSON.parse(readFileSync(join(ROOT, "src/data/asset_manifest.json"), "utf8"));
const files = new Set<string>();
walk(PUBLIC_DIR, files);

const gaps = variantCompletenessReport(manifest, files);
if (gaps.length === 0) {
  console.log("✅ every declared asset exists in every variant");
} else {
  const byVariant = new Map<string, number>();
  for (const gap of gaps) {
    byVariant.set(gap.variant, (byVariant.get(gap.variant) ?? 0) + gap.missing.length);
    console.log(`\n${gap.variant} / ${gap.characterId} — ${gap.missing.length} missing:`);
    for (const path of gap.missing.slice(0, 6)) console.log(`  - ${path}`);
    if (gap.missing.length > 6) console.log(`  … and ${gap.missing.length - 6} more`);
  }
  console.log("\nTotals:");
  for (const [variant, count] of byVariant) console.log(`  ${variant}: ${count} missing assets`);
}
