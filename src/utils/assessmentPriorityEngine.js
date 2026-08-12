/**
 * Assessment Priority Engine
 * Pure function — no React, no API calls, no side effects.
 * Can be called from components, Redux thunks, or tests.
 */

const ASSESSMENT_EXPIRY_YEARS = 5; // years before an assessment is considered expired

/**
 * Compute a numeric priority score for a building.
 * @param {Object} buildingAttrs  — attributes from Building Layer
 * @param {Object|null} outstanding — outstanding data for this building (may be null)
 * @returns {number}  score (higher = more urgent)
 */
export function computePriorityScore(buildingAttrs = {}, outstanding = null) {
  let score = 0;

  // R1: Missing SAC number — cannot be billed without it
  if (!buildingAttrs.sac_number) {
    score += 40;
  }

  // R2: Never assessed
  if (!outstanding?.assessment_year) {
    score += 20;
  }

  // R3: Assessment expired (> ASSESSMENT_EXPIRY_YEARS old)
  if (outstanding?.assessment_year) {
    const age = new Date().getFullYear() - parseInt(outstanding.assessment_year);
    if (age > ASSESSMENT_EXPIRY_YEARS) score += 30;
  }

  // R4: Outstanding amount tiers
  const amount = outstanding?.outstanding_amount || 0;
  if (amount > 5_000_000)      score += 25; // > 50L
  else if (amount > 1_000_000) score += 15; // 10–50L
  else if (amount > 0)         score += 8;  // 1–10L

  // R5: Commercial building
  const subClass = (buildingAttrs.sub_class || '').toLowerCase();
  if (subClass.includes('commercial') || subClass.includes('comm')) {
    score += 10;
  }

  // R6: High rise
  if ((buildingAttrs.no_floors || 0) > 10) {
    score += 10;
  }

  // R7: Outstanding data completely missing (building exists but no API record)
  if (!outstanding) {
    score += 5;
  }

  return score;
}

/**
 * Convert a numeric score to a priority level string.
 * @param {number} score
 * @returns {'HIGH'|'MEDIUM'|'LOW'}
 */
export function getPriorityLevel(score) {
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

/**
 * Compute priority for a building and return { score, priority }.
 */
export function computePriority(buildingAttrs, outstanding) {
  const score    = computePriorityScore(buildingAttrs, outstanding);
  const priority = getPriorityLevel(score);
  return { score, priority };
}

/**
 * Sort a list of buildings by priority score descending.
 * buildingList items must have a `priorityScore` field.
 */
export function sortByPriority(buildings) {
  return [...buildings].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
}
