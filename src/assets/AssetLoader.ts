export class AssetLoader {
  private readonly images = new Map<string, HTMLImageElement>();
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

  getImage(key: string): HTMLImageElement | undefined {
    return this.images.get(key);
  }

  getJson<T = unknown>(key: string): T | undefined {
    return this.json.get(key) as T | undefined;
  }
}
