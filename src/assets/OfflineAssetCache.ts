import type { AssetManifest } from "./PreloadManager";
import { variantPath, type ArtVariant } from "./ArtStyle";

export const ASSET_CACHE_PREFIX = "justurbanities-assets";

/** One Cache bucket per variant pack, cleared independently. */
export function packCacheName(variant: ArtVariant): string {
  return `${ASSET_CACHE_PREFIX}-${variant}-v1`;
}

export type AnimationsData = Record<
  string,
  { atlas: string; frameRate: number; animations: Record<string, string[]> }
>;

export type OfflineStatus = {
  total: number;
  cached: number;
  ready: boolean;
  /** Bytes actually stored in this pack's cache bucket. */
  sizeBytes: number;
};

export type DownloadProgress = {
  done: number;
  total: number;
  failed: number;
};

/**
 * Every runtime asset a full offline session needs: icons, all portrait
 * expressions, atlases and the individual sprite frames referenced by
 * animations.json (frame id + .png inside the character's spritesDir).
 * Reference sheets are excluded on purpose (heavy, not used at runtime).
 *
 * The `variant` selects the offline pack. Because the runtime fallback
 * chain is variant → realistic, the animal pack INCLUDES the realistic
 * paths: an animal-only install must work fully offline even while animal
 * art is incomplete. Missing variant files just count as failed downloads.
 */
export function collectAssetUrls(
  manifest: AssetManifest,
  animations: AnimationsData,
  base: string,
  variant: ArtVariant = "realistic"
): string[] {
  const urls = new Set<string>();
  const add = (path: string) => {
    urls.add(variantPath(path, variant));
    if (variant !== "realistic") urls.add(path); // fallback safety net
  };

  for (const character of manifest.characters ?? []) {
    const assets = character.generatedAssets;
    const icon = assets?.icon ?? character.icon;
    const atlasImage = assets?.atlasImage ?? character.atlasImage;
    const atlasJson = assets?.atlasJson ?? character.atlasJson;

    if (icon) add(icon);
    if (atlasImage) add(atlasImage);
    if (atlasJson) add(atlasJson);
    for (const portrait of Object.values(assets?.portraits ?? {})) {
      add(portrait);
    }

    const spritesDir = assets?.spritesDir;
    const characterAnimations = animations[character.id];
    if (spritesDir && characterAnimations) {
      for (const frames of Object.values(characterAnimations.animations)) {
        for (const frame of frames) {
          add(`${spritesDir}${frame}.png`);
        }
      }
    }
  }

  return [...urls].map((url) => `${base}${url}`);
}

const DOWNLOAD_CONCURRENCY = 6;

export class OfflineAssetCache {
  constructor(
    private readonly urls: string[],
    private readonly cacheName: string = packCacheName("realistic")
  ) {}

  get supported(): boolean {
    return typeof caches !== "undefined";
  }

  async status(): Promise<OfflineStatus> {
    const total = this.urls.length;
    if (!this.supported) return { total, cached: 0, ready: false, sizeBytes: 0 };

    const cache = await caches.open(this.cacheName);
    let cached = 0;
    let sizeBytes = 0;
    await Promise.all(
      this.urls.map(async (url) => {
        const match = await cache.match(url);
        if (match) {
          cached += 1;
          try {
            sizeBytes += (await match.clone().blob()).size;
          } catch {
            // size stays best-effort
          }
        }
      })
    );
    return { total, cached, ready: total > 0 && cached === total, sizeBytes };
  }

  async download(onProgress: (progress: DownloadProgress) => void): Promise<OfflineStatus> {
    if (!this.supported) throw new Error("Cache API not available in this browser.");

    const cache = await caches.open(this.cacheName);
    const total = this.urls.length;
    let done = 0;
    let failed = 0;

    const queue = [...this.urls];
    const workers = Array.from({ length: DOWNLOAD_CONCURRENCY }, async () => {
      for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
        try {
          if (!(await cache.match(url))) {
            const response = await fetch(url, { cache: "no-cache" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            await cache.put(url, response);
          }
        } catch {
          failed += 1;
        }
        done += 1;
        onProgress({ done, total, failed });
      }
    });

    await Promise.all(workers);
    return this.status();
  }

  async clear(): Promise<void> {
    if (!this.supported) return;
    await caches.delete(this.cacheName);
  }
}
