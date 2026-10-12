/** Smallest group size SeeItMyWay will ever report (PRD §29: avoid tiny cohorts). */
export const MINIMUM_COHORT = 50;

export interface CohortReport<K extends string> {
  /** Null wherever the true count is below the minimum. */
  counts: Record<K, number | null>;
  suppressed: K[];
  /** Total of the reported (unsuppressed) counts only. */
  reportedTotal: number;
}

/**
 * Hides any count small enough to point at individuals. Suppressed counts
 * are left out of the reported total too, so a small cohort can't be
 * recovered by subtraction.
 */
export function suppressSmallCohorts<K extends string>(
  counts: Record<K, number>,
  minimum: number = MINIMUM_COHORT,
): CohortReport<K> {
  const out = {} as Record<K, number | null>;
  const suppressed: K[] = [];
  let reportedTotal = 0;
  for (const key of Object.keys(counts) as K[]) {
    const count = counts[key];
    if (count < minimum) {
      out[key] = null;
      suppressed.push(key);
    } else {
      out[key] = count;
      reportedTotal += count;
    }
  }
  return { counts: out, suppressed, reportedTotal };
}
