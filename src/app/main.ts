import "../styles/main.css";
import { App } from "./App";

const app = new App({
  canvas: document.querySelector<HTMLCanvasElement>("#game-canvas")!,
  loadingScreen: document.querySelector<HTMLElement>("#loading-screen")!,
  loadingStatus: document.querySelector<HTMLElement>("#loading-status")!,
  loadingProgress: document.querySelector<HTMLProgressElement>("#loading-progress")!,
  dialogueRoot: document.querySelector<HTMLElement>("#dialogue-root")!,
  saveStatus: document.querySelector<HTMLElement>("#save-status")!
});

void app.start();
