export class AssetLoader {
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly imageUrls = new Map<string, string>();
  private readonly json = new Map<string, unknown>();

  async loadImage(key: string, url: string): Promise<HTMLImageElement> {
    if (this.images.has(key)) return this.images.get(key)!;

    const image = new Image();
    image.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      image.src = url;
    });

    this.images.set(key, image);
    return image;
  }

  async loadJson<T = unknown>(key: string, url: string): Promise<T> {
    if (this.json.has(key)) return this.json.get(key) as T;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load JSON: ${url}`);
    const data = (await response.json()) as T;
    this.json.set(key, data);
    return data;
  }

  /**
   * Try candidate URLs in order (variant fallback chain); cache the winner
   * under the given key. Throws only if EVERY candidate fails.
   */
  async loadImageFirst(key: string, urls: string[]): Promise<{ url: string; image: HTMLImageElement }> {
    const cached = this.images.get(key);
    const cachedUrl = this.imageUrls.get(key);
    if (cached && cachedUrl) return { url: cachedUrl, image: cached };
    let lastError: unknown;
    for (const url of urls) {
      try {
        const image = new Image();
        image.decoding = "async";
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
          image.src = url;
        });
        this.images.set(key, image);
        this.imageUrls.set(key, url);
        return { url, image };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error(`No candidate URLs for ${key}`);
  }

  getImage(key: string): HTMLImageElement | undefined {
    return this.images.get(key);
  }

  getJson<T = unknown>(key: string): T | undefined {
    return this.json.get(key) as T | undefined;
  }
}
