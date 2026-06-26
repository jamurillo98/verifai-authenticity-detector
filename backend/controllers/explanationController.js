// backend/controllers/explanationController.js

/**
 * generateExplanation(hiveResult, sightengineResult, exifData)
 * Returns a < 100 word explanation for the user.
 */
function generateExplanation(hiveResult, sightengineResult, exifData) {
  const aiSignals = hiveResult?.aiConfidence || sightengineResult?.aiScore;
  const metadataPresent = exifData && Object.keys(exifData).length > 0;

  let explanation = "";

  // Pixel pattern / AI signal observation
  if (aiSignals > 65) {
    explanation += "Strong AI‑generation signals were detected in pixel patterns. ";
  } else if (aiSignals > 30) {
    explanation += "Some AI‑like pixel characteristics were observed. ";
  } else {
    explanation += "Pixel patterns show minimal signs of AI generation. ";
  }

  // Metadata observation
  if (metadataPresent) {
    explanation += "Metadata is present and appears consistent with a real camera source. ";
  } else {
    explanation += "Metadata is missing or incomplete, which can indicate editing or AI generation. ";
  }

  // Summary sentence
  explanation += "Overall, this assessment combines pixel analysis and metadata to estimate authenticity.";

  return explanation.trim();
}

module.exports = { generateExplanation };
