import type { CrisisResolution } from "../game/crisis/CrisisManager";
import type { CrisisTier } from "../types/Crisis";

/** Player-facing wording for each tier, framed as a collective outcome. */
const TIER_LABEL: Record<CrisisTier, string> = {
  transformative: "Transformative response",
  coordinated: "Coordinated response",
  reactive: "Reactive response"
};

const VISIBLE_MS = 5200;

/**
 * Transient on-screen announcement shown when a crisis resolves at day-end.
 * Accessible HTML overlay (the canvas stays for the world), mirroring the other
 * HUDs. One banner per resolved crisis; it fades out on its own.
 */
export class CrisisBanner {
  constructor(private readonly root: HTMLElement) {}

  announce(resolution: CrisisResolution): void {
    const { crisis, tier } = resolution;

    const banner = document.createElement("section");
    banner.className = `crisis-banner crisis-banner--${tier}`;
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");

    const title = document.createElement("div");
    title.className = "crisis-banner-title";
    title.textContent = crisis.title;

    const outcome = document.createElement("div");
    outcome.className = "crisis-banner-outcome";
    outcome.textContent = TIER_LABEL[tier];

    banner.append(title, outcome);
    this.root.appendChild(banner);

    window.setTimeout(() => {
      banner.classList.add("crisis-banner--leaving");
      window.setTimeout(() => banner.remove(), 400);
    }, VISIBLE_MS);
  }
}
