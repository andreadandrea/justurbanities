import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { variantCompletenessReport } from "../../src/assets/ArtStyle";
import assetManifest from "../../src/data/asset_manifest.json";

const PUBLIC_DIR = join(__dirname, "../../public");

function walk(dir: string, out: Set<string>): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.add(relative(PUBLIC_DIR, full).replaceAll("\\", "/"));
  }
}

describe("animal placeholder set (task 5.4)", () => {
  it("every declared icon/portrait exists in BOTH variants on disk (no missing-asset errors in animal mode)", () => {
    const files = new Set<string>();
    walk(PUBLIC_DIR, files);
    const gaps = variantCompletenessReport(assetManifest, files);
    const summary = gaps.map((gap) => `${gap.variant}/${gap.characterId}: ${gap.missing.length}`).join(", ");
    expect(gaps, `variant gaps: ${summary} — run the placeholder generator for new characters`).toEqual([]);
  });
});
