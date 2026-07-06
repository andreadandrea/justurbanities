import { describe, expect, it } from "vitest";
import { collectAssetUrls, packCacheName, type AnimationsData } from "../../src/assets/OfflineAssetCache";
import type { AssetManifest } from "../../src/assets/PreloadManager";

const MANIFEST: AssetManifest = {
  characters: [
    {
      id: "maya",
      generatedAssets: {
        icon: "assets/characters/maya/icons/icon_maya.png",
        portraits: { neutral: "assets/characters/maya/portraits/portrait_maya_neutral.png" },
        spritesDir: "assets/characters/maya/sprites/"
      }
    }
  ]
};

const ANIMATIONS: AnimationsData = {
  maya: { atlas: "maya_atlas", frameRate: 8, animations: { idle_down: ["maya_idle_down_0"] } }
};

describe("offline packs per variant (task 5.3)", () => {
  it("the realistic pack is the flat legacy set", () => {
    const urls = collectAssetUrls(MANIFEST, ANIMATIONS, "/", "realistic");
    expect(urls).toEqual(
      expect.arrayContaining([
        "/assets/characters/maya/icons/icon_maya.png",
        "/assets/characters/maya/portraits/portrait_maya_neutral.png",
        "/assets/characters/maya/sprites/maya_idle_down_0.png"
      ])
    );
    expect(urls.some((url) => url.includes("/animal/"))).toBe(false);
  });

  it("the animal pack includes animal paths AND the realistic fallbacks", () => {
    const urls = collectAssetUrls(MANIFEST, ANIMATIONS, "/", "animal");
    expect(urls).toEqual(
      expect.arrayContaining([
        "/assets/characters/maya/animal/icons/icon_maya.png",
        "/assets/characters/maya/icons/icon_maya.png",
        "/assets/characters/maya/animal/sprites/maya_idle_down_0.png",
        "/assets/characters/maya/sprites/maya_idle_down_0.png"
      ])
    );
  });

  it("variant defaults to realistic (existing call sites unchanged)", () => {
    expect(collectAssetUrls(MANIFEST, ANIMATIONS, "/")).toEqual(collectAssetUrls(MANIFEST, ANIMATIONS, "/", "realistic"));
  });

  it("each variant gets its own cache bucket", () => {
    expect(packCacheName("realistic")).not.toBe(packCacheName("animal"));
    expect(packCacheName("animal")).toContain("animal");
  });
});
