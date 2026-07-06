import "../styles/main.css";
import { App } from "./App";

const app = new App({
  appRoot: document.querySelector<HTMLElement>("#app")!,
  canvas: document.querySelector<HTMLCanvasElement>("#game-canvas")!,
  loadingScreen: document.querySelector<HTMLElement>("#loading-screen")!,
  loadingStatus: document.querySelector<HTMLElement>("#loading-status")!,
  loadingProgress: document.querySelector<HTMLProgressElement>("#loading-progress")!,
  dialogueRoot: document.querySelector<HTMLElement>("#dialogue-root")!,
  saveStatus: document.querySelector<HTMLElement>("#save-status")!,
  sceneTitle: document.querySelector<HTMLElement>("#scene-title")!
});

void app.start();
