import type { AssetLoader } from "./AssetLoader";
import type { AssetManifest } from "./PreloadManager";
import type { AnimationSet } from "../engine/AnimatedSprite";
import { AnimatedSprite } from "../engine/AnimatedSprite";

export type AnimationsData = Record<string, AnimationSet>;

type LoadedCharacter = {
  set: AnimationSet;
  frames: Map<string, HTMLImageElement>;
};

/**
 * Loads and caches a character's individual sprite frames (from
 * animations.json + the manifest's spritesDir) and builds AnimatedSprites.
 * Missing frames are tolerated: callers fall back to the static icon.
 */
export class SpriteRepository {
  private readonly cache = new Map<string, LoadedCharacter>();

  constructor(
    private readonly loader: AssetLoader,
    private readonly animations: AnimationsData,
    private readonly manifest: AssetManifest,
    private readonly base: string
  ) {}

  async load(characterId: string): Promise<void> {
    if (this.cache.has(characterId)) return;
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
        const image = await this.loader.loadImage(`sprite:${frameId}`, `${this.base}${spritesDir}${frameId}.png`);
        frames.set(frameId, image);
      } catch {
        // Missing frame: skipped; the sprite falls back where it can.
      }
    }
    if (frames.size > 0) this.cache.set(characterId, { set, frames });
  }

  /** A fresh AnimatedSprite for a loaded character, or null if unavailable. */
  createSprite(characterId: string): AnimatedSprite | null {
    const loaded = this.cache.get(characterId);
    return loaded ? new AnimatedSprite(loaded.set, loaded.frames) : null;
  }

  has(characterId: string): boolean {
    return this.cache.has(characterId);
  }
}
