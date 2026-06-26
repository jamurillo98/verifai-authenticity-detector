// backend/controllers/analysisController.js

/**
 * aggregateConfidence(hiveScore, sightengineScore)
 * Weighted average:
 *   - Hive: 60%
 *   - Sightengine: 40%
 * Returns integer 0–100
 */
function aggregateConfidence(hiveScore, sightengineScore) {
  const weighted =
    hiveScore * 0.6 +
    sightengineScore * 0.4;

  return Math.round(weighted);
}

/**
 * getVerdict(score)
 * Returns:
 *   - "LIKELY REAL" if < 30
 *   - "UNCERTAIN" if 30–65
 *   - "LIKELY AI-GENERATED" if > 65
 */
function getVerdict(score) {
  if (score < 30) return "LIKELY REAL";
  if (score <= 65) return "UNCERTAIN";
  return "LIKELY AI-GENERATED";
}

module.exports = {
  aggregateConfidence,
  getVerdict
};
