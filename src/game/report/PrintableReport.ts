import type { EducationalReport, ReportListEntry } from "./ReportGenerator";

export type Translate = (key: string) => string;
export type NameResolver = (id: string) => string;

/**
 * Human-readable report for the classroom: a self-contained HTML document
 * meant for the browser's print dialog (print → save as PDF works offline,
 * no library needed). Pure string builder so it stays unit-testable.
 */
export function printableReportHtml(report: EducationalReport, t: Translate, name: NameResolver): string {
  const esc = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const entryText = (entry: ReportListEntry): string => {
    switch (entry.kind) {
      case "attendee":
      case "empty_chair":
        return name(entry.id);
      case "crisis":
        return `${t(`content.crises.${entry.id}.title`)} — ${t(`ui.report.tier.${entry.detail}`)}`;
      case "promise_kept":
      case "promise_broken":
        return t(`content.promises.${entry.id}`);
      case "measure":
        return `${t(`content.assembly.measures.${entry.id}`)} — ${name(entry.detail ?? "")}`;
      case "district":
        return `${t("ui.report.districtDiscovered")}: ${name(entry.id)}`;
      case "conflict":
      case "conflict_evaded":
        return t(`content.assembly.conflicts.${entry.id}.title`);
      case "missed_slot":
        return t(`ui.report.slot.${entry.id}`);
      case "empathy_map":
        return `${t("ui.report.empathyMap")}: ${name(entry.id)}`;
    }
  };

  const list = (titleKey: string, entries: ReportListEntry[]): string => {
    const items = entries.length
      ? entries.map((entry) => `<li>${esc(entryText(entry))}</li>`).join("")
      : `<li class="empty">${esc(t("ui.report.emptyList"))}</li>`;
    return `<section><h2>${esc(t(titleKey))}</h2><ul>${items}</ul></section>`;
  };

  const resources = Object.entries(report.resources.final)
    .map(([key, value]) => `<tr><td>${esc(t(`ui.resources.${key}`))}</td><td>${value}</td></tr>`)
    .join("");

  const debrief = report.debrief
    .map((card) => {
      const evidence = Object.entries(card.evidence)
        .map(([key, value]) => `<li>${esc(t(`ui.report.evidence.${key}`))}: ${esc(String(value))}</li>`)
        .join("");
      return `<section class="debrief"><h3>${esc(t(`ui.report.debrief.${card.id}`))}</h3><ul>${evidence}</ul></section>`;
    })
    .join("");

  const ending = report.ending
    ? `<section><h2>${esc(t("ui.report.ending"))}</h2><p><strong>${esc(t(`content.endings.${report.ending}.title`))}</strong> — ${esc(
        t(`content.endings.${report.ending}.epilogue`)
      )}</p></section>`
    : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(t("ui.report.title"))}</title>
<style>
  body { font-family: Georgia, serif; margin: 32px; color: #2a2723; }
  h1 { font-size: 22px; border-bottom: 2px solid #b89a6a; padding-bottom: 6px; }
  h2 { font-size: 16px; margin: 18px 0 6px; color: #6d4c1f; }
  h3 { font-size: 13px; margin: 10px 0 4px; }
  ul { margin: 4px 0 12px; }
  li.empty { color: #6d6459; font-style: italic; }
  table { border-collapse: collapse; }
  td { border: 1px solid #e2d3b3; padding: 3px 10px; }
  .meta { color: #6d6459; font-size: 12px; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
<h1>${esc(t("ui.report.title"))}</h1>
<p class="meta">${esc(report.session.id)} · ${esc(report.generatedAt)} · ${esc(name(report.player.character))}</p>
${list("ui.report.lists.whoArrived", report.lists.whoArrived)}
${list("ui.report.lists.whatChanged", report.lists.whatChanged)}
${list("ui.report.lists.whatWasMissed", report.lists.whatWasMissed)}
${ending}
<section><h2>${esc(t("ui.report.resources"))}</h2><table>${resources}</table></section>
<section><h2>${esc(t("ui.report.debriefTitle"))}</h2>${debrief}</section>
</body>
</html>`;
}
