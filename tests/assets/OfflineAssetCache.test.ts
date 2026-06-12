import { describe, expect, it } from "vitest";
import { collectAssetUrls, type AnimationsData } from "../../src/assets/OfflineAssetCache";
import type { AssetManifest } from "../../src/assets/PreloadManager";
import assetManifest from "../../src/data/asset_manifest.json";
import animationsData from "../../src/data/animations.json";

const manifest = assetManifest as AssetManifest;
const animations = animationsData as AnimationsData;

describe("collectAssetUrls", () => {
  it("collects icons, portraits, atlases and animation sprite frames for the real manifest", () => {
    const urls = collectAssetUrls(manifest, animations, "/justurbanities/");

    expect(urls.length).toBeGreaterThan(100);
    expect(urls.every((url) => url.startsWith("/justurbanities/assets/characters/"))).toBe(true);
    expect(urls).toContain("/justurbanities/assets/characters/maya/icons/icon_maya.png");
    expect(urls).toContain("/justurbanities/assets/characters/anna/portraits/portrait_anna_neutral.png");
    expect(urls).toContain("/justurbanities/assets/characters/ben/atlas/ben_atlas.json");
    // sprite frames come from animations.json: <spritesDir><frame>.png
    expect(urls).toContain("/justurbanities/assets/characters/anna/sprites/char_anna_talk_front_01.png");
    // reference sheets are not runtime assets
    expect(urls.some((url) => url.includes("/references/"))).toBe(false);
  });

  it("deduplicates and tolerates characters without animations", () => {
    const tinyManifest: AssetManifest = {
      characters: [
        {
          id: "x",
          generatedAssets: {
            icon: "assets/characters/x/icons/icon_x.png",
            portraits: { neutral: "assets/characters/x/icons/icon_x.png" }
          }
        }
      ]
    };
    const urls = collectAssetUrls(tinyManifest, {}, "/");
    expect(urls).toEqual(["/assets/characters/x/icons/icon_x.png"]);
  });
});
