import { AssetLoader } from "./AssetLoader";

type Progress = {
  percent: number;
  message: string;
};

export type AssetManifest = {
  characters?: Array<{
    id: string;
    generatedAssets?: {
      icon?: string;
      portraits?: Record<string, string>;
      atlasImage?: string;
      atlasJson?: string;
      spritesDir?: string;
    };
    icon?: string;
    portrait?: string;
    atlasImage?: string;
    atlasJson?: string;
  }>;
};

export class PreloadManager {
  constructor(private readonly loader: AssetLoader) {}

  async loadManifest(url: string, onProgress: (progress: Progress) => void): Promise<void> {
    onProgress({ percent: 2, message: "Loading manifest…" });
    const manifest = await this.loader.loadJson<AssetManifest>("asset_manifest", url);
    await this.preloadFromData(manifest, onProgress);
  }

  async preloadFromData(manifest: AssetManifest, onProgress: (progress: Progress) => void): Promise<void> {
    // BASE_URL keeps asset URLs valid when the app is served from a subpath.
    const base = import.meta.env.BASE_URL;
    const jobs: Array<() => Promise<unknown>> = [];

    for (const character of manifest.characters ?? []) {
      const assets = character.generatedAssets;
      const icon = assets?.icon ?? character.icon;
      const portrait = assets?.portraits?.neutral ?? character.portrait;
      const atlasImage = assets?.atlasImage ?? character.atlasImage;
      const atlasJson = assets?.atlasJson ?? character.atlasJson;

      // Character art keys are variant-scoped; the flat layout is the realistic set.
      if (icon) jobs.push(() => this.loader.loadImage(`realistic:${character.id}:icon`, `${base}${icon}`));
      if (portrait) jobs.push(() => this.loader.loadImage(`realistic:${character.id}:portrait`, `${base}${portrait}`));
      if (atlasImage) jobs.push(() => this.loader.loadImage(`${character.id}:atlas`, `${base}${atlasImage}`));
      if (atlasJson) jobs.push(() => this.loader.loadJson(`${character.id}:atlasJson`, `${base}${atlasJson}`));
    }

    if (jobs.length === 0) {
      onProgress({ percent: 100, message: "No assets declared." });
      return;
    }

    for (let i = 0; i < jobs.length; i++) {
      try {
        await jobs[i]();
      } catch (error) {
        console.warn(error);
      }
      const percent = Math.round(((i + 1) / jobs.length) * 100);
      onProgress({ percent, message: `Loading assets ${i + 1}/${jobs.length}` });
    }
  }
}
