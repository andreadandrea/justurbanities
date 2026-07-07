import type {
  EndingCondition,
  EndingMetrics,
  EndingRule,
  EndingsFile
} from "../../types/Endings";
import type { GameState } from "../GameState";
import type { QuestStatus } from "../../types/Quest";

/** Save variable holding the resolved ending id (report v2 reads it too). */
export const ENDING_VAR = "endingId";

export type EndingMetricsInput = {
  state: GameState;
  questStatus: (questId: string) => QuestStatus;
  /** Promise ids from promises.json — variables hold active/kept/broken. */
  promiseIds: string[];
  /** Crisis result variables from crises.json (values: tier names). */
  crisisResultVars: string[];
};

/**
 * §9 metrics, computed once at evaluation time. R sums the five collective
 * resources; P is the kept ratio over promises actually made (a run that
 * made none broke none — P stays 1); n03 distinguishes a real mandate
 * (engage sets assemblyMandateReal) from a photo-op shortcut and from a
 * mandate never secured at all.
 */
export function computeEndingMetrics(input: EndingMetricsInput): EndingMetrics {
  const { state, questStatus, promiseIds, crisisResultVars } = input;
  const { trust, care, commons, voice, resilience, fragmentationGlobal } = state.resources;

  let transformative = 0;
  let reactive = 0;
  for (const resultVar of crisisResultVars) {
    const tier = state.variables[resultVar];
    if (tier === "transformative") transformative += 1;
    if (tier === "reactive") reactive += 1;
  }

  let made = 0;
  let kept = 0;
  for (const promiseId of promiseIds) {
    const value = state.variables[promiseId];
    if (value === "active" || value === "kept" || value === "broken") made += 1;
    if (value === "kept") kept += 1;
  }

  const n03 =
    state.variables.assemblyMandateReal === true
      ? "engage"
      : questStatus("N03") === "completed"
        ? "shortcut"
        : "none";

  return {
    R: trust + care + commons + voice + resilience,
    frag: fragmentationGlobal,
    T: transformative,
    reactive,
    P: made === 0 ? 1 : kept / made,
    coverage: Number(state.variables.assemblyCoverage ?? 0),
    overpromise: state.variables.overpromise === true,
    absentGroups: Number(state.variables.assemblyAbsentGroups ?? 0),
    n03,
    trust,
    care,
    commons,
    voice,
    resilience,
    trustCare: trust + care
  };
}

function checkCondition(condition: EndingCondition, metrics: EndingMetrics): boolean {
  const actual = metrics[condition.metric];
  switch (condition.op) {
    case "eq":
      return actual === condition.value;
    case "neq":
      return actual !== condition.value;
    case "gte":
      return Number(actual ?? 0) >= Number(condition.value);
    case "lte":
      return Number(actual ?? 0) <= Number(condition.value);
  }
}

export function checkRule(rule: EndingRule, metrics: EndingMetrics): boolean {
  if ("all" in rule) return rule.all.every((child) => checkRule(child, metrics));
  if ("any" in rule) return rule.any.some((child) => checkRule(child, metrics));
  return checkCondition(rule, metrics);
}

/**
 * First matching ending wins (the file order is the §9 tie-break policy);
 * the entry flagged `default` catches everything else.
 */
export function resolveEnding(file: EndingsFile, metrics: EndingMetrics): string {
  for (const ending of file.endings) {
    if (ending.when && checkRule(ending.when, metrics)) return ending.id;
  }
  const fallback = file.endings.find((ending) => ending.default === true);
  if (!fallback) throw new Error("endings.json has no default ending");
  return fallback.id;
}
