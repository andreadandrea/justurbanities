import { describe, expect, it } from "vitest";
import { printableReportHtml } from "../../src/game/report/PrintableReport";
import type { EducationalReport } from "../../src/game/report/ReportGenerator";
import { I18n } from "../../src/i18n/I18n";
import en from "../../src/locales/en.json";

function makeReport(): EducationalReport {
  return {
    reportVersion: "2.0",
    generatedAt: "2026-07-07T10:00:00.000Z",
    session: { id: "session-1", scenarioId: "vertical-slice-01", startedAt: "", updatedAt: "" },
    player: { character: "maya", lastScene: "community_center" },
    resources: {
      initial: { trust: 0 },
      final: { trust: 6, voice: 4 },
      changes: { trust: 6, voice: 4 }
    },
    quests: { completed: [], active: [], notStarted: [] },
    participation: {
      totalEvents: 9,
      dialogueChoices: 3,
      choicesByScene: {},
      eventsByType: {},
      firstEventAt: null,
      lastEventAt: null
    },
    lists: {
      whoArrived: [{ kind: "attendee", id: "anna" }],
      whatChanged: [
        { kind: "crisis", id: "CRISIS_HEATWAVE", detail: "transformative" },
        { kind: "measure", id: "m_open_courtyards", detail: "anna" }
      ],
      whatWasMissed: [
        { kind: "empty_chair", id: "tom" },
        { kind: "missed_slot", id: "story" }
      ]
    },
    debrief: [
      { id: "empathic_knowledge", evidence: { empathyMaps: 3 } },
      { id: "reality_policy_bridge", evidence: { planCoverage: 4 } },
      { id: "institutions_vs_participation", evidence: { trust: 6, voice: 4 } }
    ],
    ending: "fragile_progress",
    observations: {}
  };
}

describe("printableReportHtml (task 7.3)", () => {
  const i18n = new I18n();
  i18n.register("en", en);
  const names: Record<string, string> = { anna: "Anna", tom: "Tom", maya: "Maya" };
  const html = printableReportHtml(
    makeReport(),
    (key) => i18n.t(key),
    (id) => names[id] ?? id
  );

  it("renders the three lists with localized entries", () => {
    expect(html).toContain("Who arrived");
    expect(html).toContain("What changed");
    expect(html).toContain("What was missed");
    expect(html).toContain("Anna");
    expect(html).toContain("Tom");
    expect(html).toContain("Open the courtyards to the neighbourhood");
    expect(html).toContain("An untold story (empty slot)");
  });

  it("renders the ending, the debrief cards and the resources", () => {
    expect(html).toContain("Fragile Progress");
    expect(html).toContain("Empathic knowledge");
    expect(html).toContain("Reality ↔ policy bridge");
    expect(html).toContain("Trust");
  });

  it("escapes HTML in dynamic values", () => {
    const report = makeReport();
    report.session.id = "<script>alert(1)</script>";
    const rendered = printableReportHtml(report, (key) => i18n.t(key), (id) => id);
    expect(rendered).not.toContain("<script>alert(1)</script>");
    expect(rendered).toContain("&lt;script&gt;");
  });

  it("is a complete printable document", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("@media print");
  });
});
