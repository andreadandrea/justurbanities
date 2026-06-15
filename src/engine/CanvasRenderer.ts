import type { RenderableEntity } from "../types/Entity";
import type { Camera2D } from "./Camera2D";

export type WorldSize = { width: number; height: number };

export class CanvasRenderer {
  readonly ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private colorFilter = "";

  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");
    this.ctx = ctx;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  get viewportWidth(): number {
    return this.width;
  }

  get viewportHeight(): number {
    return this.height;
  }

  /**
   * Whole-city colour state: the canvas desaturates when the neighbourhood
   * is fragmented and regains colour as it reconnects. Reduced-motion
   * users still get the state (the CSS transition is what's disabled).
   */
  setColorFilter(filter: string): void {
    if (filter === this.colorFilter) return;
    this.colorFilter = filter;
    this.canvas.style.filter = filter;
  }

  resize(): void {
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /** Run world-space drawing translated by the camera (3/4 follow view). */
  withCamera(camera: Camera2D, draw: () => void): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));
    draw();
    ctx.restore();
  }

  /**
   * Vivid warm ground for the whole world, with a soft path grid. Drawn in
   * world coordinates (call inside withCamera). Placeholder until final art.
   */
  drawGround(world: WorldSize, top = "#f6cf87", bottom = "#e79a4e"): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, world.height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, world.width, world.height);

    ctx.strokeStyle = "rgba(120, 86, 52, 0.18)";
    ctx.lineWidth = 2;
    const step = 160;
    for (let x = step; x < world.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, world.height);
      ctx.stroke();
    }
    for (let y = step; y < world.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(world.width, y);
      ctx.stroke();
    }
  }

  /** A simple vivid building/landmark footprint in world coordinates. */
  drawLandmark(x: number, y: number, w: number, h: number, color: string, label?: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(74, 47, 30, 0.55)";
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, h);
    if (label) {
      ctx.font = "bold 20px system-ui";
      ctx.fillStyle = "rgba(42, 39, 35, 0.85)";
      ctx.textAlign = "center";
      ctx.fillText(label, x + w / 2, y + h / 2);
      ctx.textAlign = "start";
    }
  }

  drawEntity(entity: RenderableEntity): void {
    const image = entity.image;
    const ctx = this.ctx;
    if (image) {
      const w = entity.width;
      const h = entity.height;
      ctx.drawImage(image, entity.x - w / 2, entity.y - h, w, h);
    } else {
      ctx.fillStyle = entity.color ?? "#2f6f73";
      ctx.beginPath();
      ctx.arc(entity.x, entity.y - 42, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(entity.x - 24, entity.y - 42, 48, 72);
    }

    if (entity.label) {
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,248,234,.94)";
      ctx.fillRect(entity.x - 54, entity.y + 8, 108, 24);
      ctx.fillStyle = "#2a2723";
      ctx.fillText(entity.label, entity.x, entity.y + 25);
      ctx.textAlign = "start";
    }
  }

  drawEntities(entities: RenderableEntity[]): void {
    [...entities].sort((a, b) => a.y - b.y).forEach((entity) => this.drawEntity(entity));
  }
}
