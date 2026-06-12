import type { AssetManifest } from "./PreloadManager";

export const ASSET_CACHE_NAME = "justurbanities-assets-v1";

export type AnimationsData = Record<
  string,
  { atlas: string; frameRate: number; animations: Record<string, string[]> }
>;

export type OfflineStatus = {
  total: number;
  cached: number;
  ready: boolean;
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
 */
export function collectAssetUrls(manifest: AssetManifest, animations: AnimationsData, base: string): string[] {
  const urls = new Set<string>();

  for (const character of manifest.characters ?? []) {
    const assets = character.generatedAssets;
    const icon = assets?.icon ?? character.icon;
    const atlasImage = assets?.atlasImage ?? character.atlasImage;
    const atlasJson = assets?.atlasJson ?? character.atlasJson;

    if (icon) urls.add(icon);
    if (atlasImage) urls.add(atlasImage);
    if (atlasJson) urls.add(atlasJson);
    for (const portrait of Object.values(assets?.portraits ?? {})) {
      urls.add(portrait);
    }

    const spritesDir = assets?.spritesDir;
    const characterAnimations = animations[character.id];
    if (spritesDir && characterAnimations) {
      for (const frames of Object.values(characterAnimations.animations)) {
        for (const frame of frames) {
          urls.add(`${spritesDir}${frame}.png`);
        }
      }
    }
  }

  return [...urls].map((url) => `${base}${url}`);
}

const DOWNLOAD_CONCURRENCY = 6;

export class OfflineAssetCache {
  constructor(private readonly urls: string[]) {}

  get supported(): boolean {
    return typeof caches !== "undefined";
  }

  async status(): Promise<OfflineStatus> {
    const total = this.urls.length;
    if (!this.supported) return { total, cached: 0, ready: false };

    const cache = await caches.open(ASSET_CACHE_NAME);
    let cached = 0;
    await Promise.all(
      this.urls.map(async (url) => {
        if (await cache.match(url)) cached += 1;
      })
    );
    return { total, cached, ready: total > 0 && cached === total };
  }

  async download(onProgress: (progress: DownloadProgress) => void): Promise<OfflineStatus> {
    if (!this.supported) throw new Error("Cache API not available in this browser.");

    const cache = await caches.open(ASSET_CACHE_NAME);
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
    await caches.delete(ASSET_CACHE_NAME);
  }
}
