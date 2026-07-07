/**
 * Endings (§9): six data-driven epilogues. Conditions read a computed
 * metrics object — the thresholds live entirely in endings.json so
 * playtest calibration (M-E) never touches code.
 */

export type EndingMetricValue = number | string | boolean;

export type EndingMetrics = Record<string, EndingMetricValue>;

/** One comparison against a metric: { metric, op, value }. */
export type EndingCondition = {
  metric: string;
  op: "gte" | "lte" | "eq" | "neq";
  value: EndingMetricValue;
};

/** Boolean combinators nest freely: { all: [...] } / { any: [...] }. */
export type EndingRule = EndingCondition | { all: EndingRule[] } | { any: EndingRule[] };

export type EndingDefinition = {
  id: string;
  /** Missing on the default ending (the catch-all, listed last). */
  when?: EndingRule;
  default?: boolean;
};

export type EndingsFile = {
  schema?: string;
  note?: string;
  /** Evaluated in order; the first match wins. */
  endings: EndingDefinition[];
};
