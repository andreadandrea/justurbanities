import type { RenderableEntity } from "../types/Entity";

export class CanvasRenderer {
  readonly ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");
    this.ctx = ctx;
    this.resize();
    window.addEventListener("resize", () => this.resize());
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

  drawBackground(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#e7d4b3";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#d0b894";
    ctx.fillRect(0, this.height * 0.64, this.width, this.height * 0.36);

    ctx.fillStyle = "#fff2d2";
    ctx.fillRect(80, 80, this.width - 160, this.height * 0.48);

    ctx.strokeStyle = "#8a7057";
    ctx.lineWidth = 4;
    ctx.strokeRect(80, 80, this.width - 160, this.height * 0.48);

    ctx.fillStyle = "#5d4c3c";
    ctx.font = "bold 28px system-ui";
    ctx.fillText("Community Center", 110, 125);

    ctx.font = "18px system-ui";
    ctx.fillText("Prototype scene — Canvas 2D + local save + dialogue event log", 110, 154);
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
