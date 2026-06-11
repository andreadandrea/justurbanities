import { AssetLoader } from "./AssetLoader";

type Progress = {
  percent: number;
  message: string;
};

type AssetManifest = {
  characters?: Array<{
    id: string;
    generatedAssets?: {
      icon?: string;
      portraits?: Record<string, string>;
      atlasImage?: string;
      atlasJson?: string;
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

    const jobs: Array<() => Promise<unknown>> = [];

    for (const character of manifest.characters ?? []) {
      const assets = character.generatedAssets;
      const icon = assets?.icon ?? character.icon;
      const portrait = assets?.portraits?.neutral ?? character.portrait;
      const atlasImage = assets?.atlasImage ?? character.atlasImage;
      const atlasJson = assets?.atlasJson ?? character.atlasJson;

      if (icon) jobs.push(() => this.loader.loadImage(`${character.id}:icon`, `/${icon}`));
      if (portrait) jobs.push(() => this.loader.loadImage(`${character.id}:portrait`, `/${portrait}`));
      if (atlasImage) jobs.push(() => this.loader.loadImage(`${character.id}:atlas`, `/${atlasImage}`));
      if (atlasJson) jobs.push(() => this.loader.loadJson(`${character.id}:atlasJson`, `/${atlasJson}`));
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
