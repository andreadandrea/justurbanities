import { describe, expect, it } from "vitest";
import { variantCandidates, variantCompletenessReport, variantKey, variantPath } from "../../src/assets/ArtStyle";
import { CharacterArt, type ImageSource } from "../../src/assets/CharacterArt";
import type { AssetManifest } from "../../src/assets/PreloadManager";
import { assetManifestSchema, validateData } from "../../src/data/validation";
import assetManifest from "../../src/data/asset_manifest.json";

describe("variant path resolution", () => {
  it("realistic keeps the flat legacy layout", () => {
    expect(variantPath("assets/characters/maya/icons/icon_maya.png", "realistic")).toBe(
      "assets/characters/maya/icons/icon_maya.png"
    );
  });

  it("animal inserts the variant segment after the character folder", () => {
    expect(variantPath("assets/characters/maya/icons/icon_maya.png", "animal")).toBe(
      "assets/characters/maya/animal/icons/icon_maya.png"
    );
  });

  it("non-character assets are variant-agnostic", () => {
    expect(variantPath("assets/ui/logo.png", "animal")).toBe("assets/ui/logo.png");
  });

  it("candidates follow the hard fallback chain: variant then realistic", () => {
    expect(variantCandidates("assets/characters/ben/icons/icon_ben.png", "animal")).toEqual([
      "assets/characters/ben/animal/icons/icon_ben.png",
      "assets/characters/ben/icons/icon_ben.png"
    ]);
    expect(variantCandidates("assets/characters/ben/icons/icon_ben.png", "realistic")).toEqual([
      "assets/characters/ben/icons/icon_ben.png"
    ]);
  });

  it("cache keys are variant-scoped so switches never serve stale art", () => {
    expect(variantKey("animal", "maya:icon")).toBe("animal:maya:icon");
  });
});

describe("manifest", () => {
  it("declares both variants and still validates", () => {
    const parsed = validateData("asset_manifest.json", assetManifestSchema, assetManifest) as { variants?: string[] };
    expect(parsed.variants).toEqual(["realistic", "animal"]);
  });
});

describe("variant completeness report", () => {
  const manifest = {
    characters: [
      {
        id: "maya",
        generatedAssets: {
          icon: "assets/characters/maya/icons/icon_maya.png",
          portraits: { neutral: "assets/characters/maya/portraits/portrait_maya_neutral.png" }
        }
      }
    ]
  };

  it("reports missing animal assets per character", () => {
    const files = new Set([
      "assets/characters/maya/icons/icon_maya.png",
      "assets/characters/maya/portraits/portrait_maya_neutral.png"
    ]);
    const gaps = variantCompletenessReport(manifest, files);
    expect(gaps).toEqual([
      {
        variant: "animal",
        characterId: "maya",
        missing: [
          "assets/characters/maya/animal/icons/icon_maya.png",
          "assets/characters/maya/animal/portraits/portrait_maya_neutral.png"
        ]
      }
    ]);
  });

  it("is empty when every variant is complete", () => {
    const files = new Set([
      "assets/characters/maya/icons/icon_maya.png",
      "assets/characters/maya/portraits/portrait_maya_neutral.png",
      "assets/characters/maya/animal/icons/icon_maya.png",
      "assets/characters/maya/animal/portraits/portrait_maya_neutral.png"
    ]);
    expect(variantCompletenessReport(manifest, files)).toEqual([]);
  });
});

/** Fake loader: a set of "existing" URLs; images are opaque tokens. */
function fakeLoader(existing: Set<string>): ImageSource & { loaded: Map<string, string> } {
  const loaded = new Map<string, string>();
  const images = new Map<string, HTMLImageElement>();
  return {
    loaded,
    async loadImageFirst(key, urls) {
      for (const url of urls) {
        if (existing.has(url)) {
          const image = { src: url } as unknown as HTMLImageElement;
          images.set(key, image);
          loaded.set(key, url);
          return { url, image };
        }
      }
      throw new Error(`none of ${urls.join(", ")}`);
    },
    getImage(key) {
      return images.get(key);
    }
  };
}

const MANIFEST: AssetManifest = {
  characters: [
    { id: "maya", generatedAssets: { icon: "assets/characters/maya/icons/icon_maya.png" } },
    { id: "ben", generatedAssets: { icon: "assets/characters/ben/icons/icon_ben.png" } }
  ]
};

describe("CharacterArt switching", () => {
  it("swaps to animal art and falls back to realistic where animal is missing", async () => {
    const loader = fakeLoader(
      new Set([
        "/assets/characters/maya/icons/icon_maya.png",
        "/assets/characters/ben/icons/icon_ben.png",
        "/assets/characters/maya/animal/icons/icon_maya.png"
        // ben has NO animal icon
      ])
    );
    const art = new CharacterArt(loader, MANIFEST, "/");
    await art.ensureLoaded("realistic");

    let notified = "";
    art.onChange((variant) => (notified = variant));
    await art.setVariant("animal");

    expect(notified).toBe("animal");
    expect(art.icon("maya")?.src).toContain("/animal/");
    // Ben's animal icon is missing: realistic used, warning recorded, no crash.
    expect(art.icon("ben")?.src).toBe("/assets/characters/ben/icons/icon_ben.png");
    expect(art.missingAssets.some((entry) => entry.includes("ben"))).toBe(true);
  });

  it("switching back to realistic is instant (no reload) and art stays correct", async () => {
    const loader = fakeLoader(
      new Set(["/assets/characters/maya/icons/icon_maya.png", "/assets/characters/maya/animal/icons/icon_maya.png"])
    );
    const art = new CharacterArt(loader, { characters: [MANIFEST.characters![0]] }, "/");
    await art.ensureLoaded("realistic");
    await art.setVariant("animal");
    const loadsAfterAnimal = loader.loaded.size;
    await art.setVariant("realistic");
    expect(loader.loaded.size).toBe(loadsAfterAnimal); // nothing re-fetched
    expect(art.icon("maya")?.src).toBe("/assets/characters/maya/icons/icon_maya.png");
  });

  it("a character with no asset in ANY variant is reported, not thrown", async () => {
    const loader = fakeLoader(new Set());
    const art = new CharacterArt(loader, MANIFEST, "/");
    await expect(art.ensureLoaded("animal")).resolves.toBeUndefined();
    expect(art.missingAssets.filter((entry) => entry.includes("no asset at all"))).toHaveLength(2);
  });
});
