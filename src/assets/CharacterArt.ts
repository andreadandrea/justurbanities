import type { AssetManifest } from "./PreloadManager";
import { DEFAULT_VARIANT, variantCandidates, variantKey, type ArtVariant } from "./ArtStyle";

/** The slice of AssetLoader that CharacterArt needs (kept small for tests). */
export type ImageSource = {
  loadImageFirst(key: string, urls: string[]): Promise<{ url: string; image: HTMLImageElement }>;
  getImage(key: string): HTMLImageElement | undefined;
};

export type ArtChangeListener = (variant: ArtVariant) => void;

/**
 * Variant-aware character art: owns the current art style, lazily loads a
 * variant's icons/portraits on first switch, and resolves lookups through
 * the fallback chain (requested variant → realistic). Every fallback is
 * recorded for the debug panel — a missing animal asset must never crash.
 */
export class CharacterArt {
  private current: ArtVariant = DEFAULT_VARIANT;
  private readonly loadedVariants = new Set<ArtVariant>([]);
  private readonly listeners = new Set<ArtChangeListener>();
  /** "characterId path" entries that fell back, for the debug report. */
  readonly missingAssets: string[] = [];

  constructor(
    private readonly loader: ImageSource,
    private readonly manifest: AssetManifest,
    private readonly base: string
  ) {}

  get variant(): ArtVariant {
    return this.current;
  }

  onChange(listener: ArtChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Ensure a variant's art is in memory, then make it current (instant swap). */
  async setVariant(variant: ArtVariant): Promise<void> {
    if (variant === this.current) return;
    await this.ensureLoaded(variant);
    this.current = variant;
    for (const listener of this.listeners) listener(variant);
  }

  /** Preload a variant's icons + neutral portraits with per-asset fallback. */
  async ensureLoaded(variant: ArtVariant): Promise<void> {
    if (this.loadedVariants.has(variant)) return;
    for (const character of this.manifest.characters ?? []) {
      const assets = character.generatedAssets;
      const icon = assets?.icon ?? character.icon;
      const portrait = assets?.portraits?.neutral ?? character.portrait;
      if (icon) await this.loadWithFallback(variant, character.id, "icon", icon);
      if (portrait) await this.loadWithFallback(variant, character.id, "portrait", portrait);
    }
    this.loadedVariants.add(variant);
  }

  private async loadWithFallback(variant: ArtVariant, characterId: string, kind: string, path: string): Promise<void> {
    const candidates = variantCandidates(path, variant);
    try {
      const { url } = await this.loader.loadImageFirst(
        variantKey(variant, `${characterId}:${kind}`),
        candidates.map((candidate) => `${this.base}${candidate}`)
      );
      if (candidates.length > 1 && url === `${this.base}${candidates[candidates.length - 1]}`) {
        this.missingAssets.push(`${variant}: ${characterId} ${kind} (using realistic)`);
      }
    } catch {
      this.missingAssets.push(`${variant}: ${characterId} ${kind} (no asset at all)`);
    }
  }

  /** Variant-aware lookup, falling back to the realistic set. */
  icon(characterId: string): HTMLImageElement | undefined {
    return (
      this.loader.getImage(variantKey(this.current, `${characterId}:icon`)) ??
      this.loader.getImage(variantKey("realistic", `${characterId}:icon`))
    );
  }

  portrait(characterId: string): HTMLImageElement | undefined {
    return (
      this.loader.getImage(variantKey(this.current, `${characterId}:portrait`)) ??
      this.loader.getImage(variantKey("realistic", `${characterId}:portrait`))
    );
  }
}
