type GameLoopConfig = {
  update: (dt: number) => void;
  render: () => void;
};

export class GameLoop {
  private running = false;
  private lastTime = 0;
  private frameId = 0;

  constructor(private readonly config: GameLoopConfig) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  private readonly tick = (time: number): void => {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.config.update(dt);
    this.config.render();

    this.frameId = requestAnimationFrame(this.tick);
  };
}
