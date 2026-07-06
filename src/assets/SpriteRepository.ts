import type { AssetLoader } from "./AssetLoader";
import type { AssetManifest } from "./PreloadManager";
import type { AnimationSet } from "../engine/AnimatedSprite";
import { AnimatedSprite } from "../engine/AnimatedSprite";
import { variantCandidates, variantKey, type ArtVariant } from "./ArtStyle";

export type AnimationsData = Record<string, AnimationSet>;

type LoadedCharacter = {
  set: AnimationSet;
  frames: Map<string, HTMLImageElement>;
};

/**
 * Loads and caches a character's individual sprite frames (from
 * animations.json + the manifest's spritesDir) and builds AnimatedSprites.
 * Variant-aware: frames resolve through the art-style fallback chain and
 * cache per variant; createSprite falls back to the realistic set so a
 * missing animal atlas never blocks. Missing frames are tolerated: callers
 * fall back to the static icon.
 */
export class SpriteRepository {
  private readonly cache = new Map<string, LoadedCharacter>();

  constructor(
    private readonly loader: AssetLoader,
    private readonly animations: AnimationsData,
    private readonly manifest: AssetManifest,
    private readonly base: string
  ) {}

  async load(characterId: string, variant: ArtVariant = "realistic"): Promise<void> {
    const cacheKey = variantKey(variant, characterId);
    if (this.cache.has(cacheKey)) return;
    const set = this.animations[characterId];
    const character = this.manifest.characters?.find((c) => c.id === characterId);
    const spritesDir = character?.generatedAssets?.spritesDir;
    if (!set || !spritesDir) return;

    const frames = new Map<string, HTMLImageElement>();
    const ids = new Set<string>();
    for (const list of Object.values(set.animations)) {
      for (const frameId of list) ids.add(frameId);
    }
    for (const frameId of ids) {
      try {
        const candidates = variantCandidates(`${spritesDir}${frameId}.png`, variant);
        const { image } = await this.loader.loadImageFirst(
          variantKey(variant, `sprite:${frameId}`),
          candidates.map((candidate) => `${this.base}${candidate}`)
        );
        frames.set(frameId, image);
      } catch {
        // Missing frame: skipped; the sprite falls back where it can.
      }
    }
    if (frames.size > 0) this.cache.set(cacheKey, { set, frames });
  }

  /**
   * A fresh AnimatedSprite for a loaded character in the given variant —
   * realistic as fallback — or null if nothing is loaded.
   */
  createSprite(characterId: string, variant: ArtVariant = "realistic"): AnimatedSprite | null {
    const loaded =
      this.cache.get(variantKey(variant, characterId)) ?? this.cache.get(variantKey("realistic", characterId));
    return loaded ? new AnimatedSprite(loaded.set, loaded.frames) : null;
  }

  has(characterId: string, variant: ArtVariant = "realistic"): boolean {
    return this.cache.has(variantKey(variant, characterId));
  }
}
